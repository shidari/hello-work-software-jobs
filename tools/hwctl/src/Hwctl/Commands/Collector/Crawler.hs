{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Commands.Collector.Crawler
  ( CrawlerCommand (..)
  , crawlerCommandParser
  , runCrawlerCommand
  ) where

import Data.Aeson (FromJSON (..), eitherDecode, encode, object, (.:?), (.=), withObject)
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import Hwctl.Config (Config)
import Hwctl.Types (AppError (..), outputError)
import Options.Applicative
import System.Exit (ExitCode (..))
import System.IO (hFlush)
import System.IO.Temp (withSystemTempFile)
import System.Process (readProcessWithExitCode)

-- Types

data CrawlerRunOpts = CrawlerRunOpts
  { croPeriod :: Maybe Text
  , croMaxCount :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON CrawlerRunOpts where
  parseJSON = withObject "CrawlerRunOpts" $ \v ->
    CrawlerRunOpts <$> v .:? "period" <*> v .:? "maxCount"

-- Command

data CrawlerCommand
  = CrawlerRunCmd RunOpts
  deriving (Show)

data RunOpts = RunOpts { runOptsJson :: Maybe String } deriving (Show)

crawlerCommandParser :: Parser CrawlerCommand
crawlerCommandParser =
  hsubparser
    ( command "run" (info (CrawlerRunCmd <$> runOptsParser) (progDesc "Trigger crawler via Lambda invoke"))
    )
  where
    runOptsParser = RunOpts <$> optional (argument str (metavar "OPTIONS_JSON" <> help "Options JSON (e.g., '{\"period\":\"week\",\"maxCount\":50}')"))

runCrawlerCommand :: Config -> CrawlerCommand -> IO ()
runCrawlerCommand _ (CrawlerRunCmd opts) = do
  let optsResult = case runOptsJson opts of
        Nothing -> Right (CrawlerRunOpts Nothing Nothing)
        Just s -> case eitherDecode (LBS.pack s) of
          Left msg -> Left msg
          Right o -> Right o
  case optsResult of
    Left msg -> outputError (ParseError ("Invalid options JSON: " <> msg))
    Right croOpts -> do
      let validPeriods = ["today", "week", "all"] :: [T.Text]
      case croPeriod croOpts of
        Just p | p `notElem` validPeriods ->
          outputError (ParseError ("Invalid period: " <> T.unpack p <> ". Must be one of: today, week, all"))
        _ -> case croMaxCount croOpts of
          Just n | n <= 0 || n > 5000 ->
            outputError (ParseError ("maxCount must be between 1 and 5000, got: " <> show n))
          _ -> invokeCrawlerLambda croOpts

-- Lambda invoke

awsRegion :: String
awsRegion = "ap-northeast-1"

invokeCrawlerLambda :: CrawlerRunOpts -> IO ()
invokeCrawlerLambda croOpts = do
  let payload = encode $ object
        [ "source" .= ("aws.events" :: Text)
        , "detail-type" .= ("Scheduled Event" :: Text)
        , "detail" .= object
            ( maybe [] (\p -> ["period" .= p]) (croPeriod croOpts)
                ++ maybe [] (\n -> ["maxCount" .= n]) (croMaxCount croOpts)
            )
        ]
  withSystemTempFile "hwctl-payload.json" $ \tmpPath tmpHandle -> do
    LBS.hPut tmpHandle payload
    hFlush tmpHandle
    (exitCode, stdout, stderr') <- readProcessWithExitCode "aws"
      [ "lambda", "invoke"
      , "--function-name", "job-number-crawler"
      , "--payload", "fileb://" <> tmpPath
      , "--region", awsRegion
      , "--output", "json"
      , "--cli-binary-format", "raw-in-base64-out"
      , "/dev/stdout"
      ] ""
    case exitCode of
      ExitSuccess -> LBS.putStrLn (LBS.pack stdout)
      ExitFailure _ -> outputError (HttpError (T.unpack $ T.strip $ T.pack stderr'))
