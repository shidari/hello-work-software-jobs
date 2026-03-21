{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Commands.Collector.Diagnose
  ( DiagnoseCommand (..)
  , diagnoseCommandParser
  , runDiagnoseCommand
  ) where

import Control.Monad.Trans.Except (ExceptT (..), runExceptT)
import Data.Aeson (FromJSON (..), ToJSON (..), Value (..), eitherDecode, encode, object, (.:), (.=), withObject)
import Data.Bifunctor (first)
import qualified Data.Aeson.Key as K
import qualified Data.Aeson.KeyMap as KM
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import Hwctl.Config (Config)
import Hwctl.Http (decodeResponse, withEndpoint)
import Hwctl.Types (AppError, OutputFormat (..), formatOption)
import Network.HTTP.Req
import Options.Applicative
import System.Exit (ExitCode (..))
import System.Process (readProcessWithExitCode)

-- Types

data DiagnoseCheck = DiagnoseCheck
  { checkName :: Text
  , checkStatus :: Text
  , checkMessage :: Text
  }
  deriving (Show, Eq, Generic)

instance ToJSON DiagnoseCheck where
  toJSON c = object ["name" .= checkName c, "status" .= checkStatus c, "message" .= checkMessage c]

data DiagnoseResult = DiagnoseResult
  { diagnoseChecks :: [DiagnoseCheck]
  }
  deriving (Show, Eq, Generic)

instance ToJSON DiagnoseResult where
  toJSON d = object ["checks" .= diagnoseChecks d]

data DailyStat = DailyStat
  { addedDate :: Text
  , statCount :: Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON DailyStat where
  parseJSON = withObject "DailyStat" $ \v ->
    DailyStat <$> v .: "addedDate" <*> v .: "count"

data StatsResponse = StatsResponse
  { stats :: [DailyStat]
  }
  deriving (Show, Eq, Generic)

instance FromJSON StatsResponse

-- Client

fetchDailyStats :: Config -> IO (Either AppError StatsResponse)
fetchDailyStats cfg = withEndpoint cfg $ \case
  Left (url, opts) -> do
    resp <- req GET (url /: "stats" /: "daily") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, opts) -> do
    resp <- req GET (url /: "stats" /: "daily") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

-- Command

data DiagnoseCommand = DiagnoseCmd OutputFormat
  deriving (Show)

diagnoseCommandParser :: Parser DiagnoseCommand
diagnoseCommandParser = DiagnoseCmd <$> formatOption

runDiagnoseCommand :: Config -> DiagnoseCommand -> IO ()
runDiagnoseCommand cfg (DiagnoseCmd fmt) = do
  checks <- sequence
    [ checkEventBridgeRule
    , checkLambdaFunction "job-number-crawler"
    , checkLambdaFunction "job-detail-etl"
    , checkSqsQueue
    , checkDailyStats cfg
    ]
  outputDiagnoseResult fmt (DiagnoseResult checks)

-- AWS CLI

awsRegion :: String
awsRegion = "ap-northeast-1"

runAwsCli :: [String] -> IO (Either String String)
runAwsCli args = do
  (exitCode, stdout, stderr') <- readProcessWithExitCode "aws" (args ++ ["--region", awsRegion, "--output", "json"]) ""
  pure $ case exitCode of
    ExitSuccess -> Right stdout
    ExitFailure _ -> Left (T.unpack $ T.strip $ T.pack stderr')

-- | AWS CLI → JSON デコード を合成するヘルパー
awsCliJson :: [String] -> ExceptT String IO Value
awsCliJson args = do
  out <- ExceptT $ runAwsCli args
  ExceptT $ pure $ first (const "レスポンス解析失敗") $ eitherDecode (LBS.pack out)

-- | Either String a → DiagnoseCheck への自然変換
toDiagnose :: Text -> (a -> (Text, Text)) -> Either String a -> DiagnoseCheck
toDiagnose name _ (Left err) = DiagnoseCheck name "error" (T.pack err)
toDiagnose name f (Right a) =
  let (status, msg) = f a
  in DiagnoseCheck name status msg

-- Checks

checkEventBridgeRule :: IO DiagnoseCheck
checkEventBridgeRule =
  toDiagnose "eventbridge" interpret <$> runExceptT check
  where
    check = awsCliJson ["events", "describe-rule", "--name", "collector-weekday-cron"]
    interpret val =
      let state = getJsonString "State" val
          schedule = getJsonString "ScheduleExpression" val
          msg = "rule=collector-weekday-cron, state=" <> state <> ", schedule=" <> schedule
          status = if state /= "ENABLED" then "error" else "ok"
      in (status, msg)

checkLambdaFunction :: String -> IO DiagnoseCheck
checkLambdaFunction name =
  toDiagnose name' interpret <$> runExceptT check
  where
    name' = T.pack $ "lambda:" <> name
    check = awsCliJson ["lambda", "get-function", "--function-name", name]
    interpret val =
      let config' = getJsonObject "Configuration" val
          state = maybe "" (getJsonString "State") config'
          lastModified = maybe "" (getJsonString "LastModified") config'
          timeout = maybe "" (getJsonString "Timeout") config'
          msg = "state=" <> state <> ", timeout=" <> timeout <> "s, lastModified=" <> lastModified
          status = if state /= "Active" then "error" else "ok"
      in (status, msg)

checkSqsQueue :: IO DiagnoseCheck
checkSqsQueue =
  toDiagnose "sqs:job-detail-queue" interpret <$> runExceptT check
  where
    check = do
      urlVal <- awsCliJson ["sqs", "get-queue-url", "--queue-name", "job-detail-queue"]
      let queueUrl = T.unpack $ getJsonString "QueueUrl" urlVal
      awsCliJson [ "sqs", "get-queue-attributes", "--queue-url", queueUrl
                 , "--attribute-names", "ApproximateNumberOfMessages"
                 , "ApproximateNumberOfMessagesNotVisible"
                 , "ApproximateNumberOfMessagesDelayed"
                 ]
    interpret val =
      let attrs = getJsonObject "Attributes" val
          visible = maybe "?" (getJsonString "ApproximateNumberOfMessages") attrs
          notVisible = maybe "?" (getJsonString "ApproximateNumberOfMessagesNotVisible") attrs
          delayed = maybe "?" (getJsonString "ApproximateNumberOfMessagesDelayed") attrs
          msg = "待機=" <> visible <> ", 処理中=" <> notVisible <> ", 遅延=" <> delayed
          status = if visible /= "0" then "warn" else "ok"
      in (status, msg)

checkDailyStats :: Config -> IO DiagnoseCheck
checkDailyStats cfg =
  toDiagnose "daily-stats" interpret . first (const "API 呼び出し失敗") <$> fetchDailyStats cfg
  where
    interpret resp =
      let recent = take 7 (stats resp)
          totalRecent = sum (map statCount recent)
          msg = case recent of
            [] -> "データなし"
            (s:_) -> "最新: " <> addedDate s <> " (" <> T.pack (show (statCount s)) <> " 件)"
                     <> ", 直近7日合計: " <> T.pack (show totalRecent) <> " 件"
          status
            | null recent = "warn"
            | totalRecent == 0 = "error"
            | otherwise = "ok"
      in (status, msg)

-- Output

outputDiagnoseResult :: OutputFormat -> DiagnoseResult -> IO ()
outputDiagnoseResult JSON d = LBS.putStrLn (encode d)
outputDiagnoseResult Table d = do
  putStrLn "=== クローラーパイプライン診断 ===\n"
  mapM_ printCheck (diagnoseChecks d)
  let hasError = any (\c -> checkStatus c == "error") (diagnoseChecks d)
      hasWarn = any (\c -> checkStatus c == "warn") (diagnoseChecks d)
  putStrLn ""
  if hasError then putStrLn "結果: 問題あり"
    else if hasWarn then putStrLn "結果: 要確認"
    else putStrLn "結果: 正常"
  where
    printCheck c = do
      let icon = case T.unpack (checkStatus c) of
            "ok"    -> "[OK]   "
            "warn"  -> "[WARN] "
            "error" -> "[ERROR]"
            "skip"  -> "[SKIP] "
            _       -> "[?]    "
      putStrLn $ icon <> " " <> T.unpack (checkName c)
      mapM_ (\l -> putStrLn $ "         " <> T.unpack l) (T.splitOn "\n" (checkMessage c))

-- JSON helpers

getJsonString :: String -> Value -> T.Text
getJsonString key (Object obj) = case KM.lookup (K.fromString key) obj of
  Just (String t) -> t
  Just (Number n) -> T.pack (show n)
  _ -> ""
getJsonString _ _ = ""

getJsonObject :: String -> Value -> Maybe Value
getJsonObject key (Object obj) = KM.lookup (K.fromString key) obj
getJsonObject _ _ = Nothing
