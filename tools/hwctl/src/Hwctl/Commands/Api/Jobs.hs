{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Commands.Api.Jobs
  ( JobsCommand (..)
  , jobsCommandParser
  , runJobsCommand
  ) where

import Data.Aeson (FromJSON (..), ToJSON (..), encode, object, (.:), (.:?), (.=), withObject)
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Maybe (fromMaybe)
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import Hwctl.Config (Config)
import Hwctl.Http (decodeResponse, withEndpoint)
import Hwctl.Types (AppError, OutputFormat (..), formatOption, outputError, unlines')
import Network.HTTP.Req
import Options.Applicative

-- Types

data WageRange = WageRange
  { wageMin :: Int
  , wageMax :: Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON WageRange where
  parseJSON = withObject "WageRange" $ \v ->
    WageRange <$> v .: "min" <*> v .: "max"

instance ToJSON WageRange where
  toJSON w = object ["min" .= wageMin w, "max" .= wageMax w]

data WorkingHours = WorkingHours
  { hoursStart :: Maybe Text
  , hoursEnd :: Maybe Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON WorkingHours where
  parseJSON = withObject "WorkingHours" $ \v ->
    WorkingHours <$> v .:? "start" <*> v .:? "end"

instance ToJSON WorkingHours where
  toJSON wh = object ["start" .= hoursStart wh, "end" .= hoursEnd wh]

data Job = Job
  { jobNumber :: Text
  , companyName :: Maybe Text
  , receivedDate :: Text
  , expiryDate :: Text
  , homePage :: Maybe Text
  , occupation :: Text
  , employmentType :: Text
  , wage :: Maybe WageRange
  , workingHours :: Maybe WorkingHours
  , employeeCount :: Maybe Int
  , workPlace :: Maybe Text
  , jobDescription :: Maybe Text
  , qualifications :: Maybe Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON Job where
  parseJSON = withObject "Job" $ \v ->
    Job
      <$> v .: "jobNumber" <*> v .:? "companyName"
      <*> v .: "receivedDate" <*> v .: "expiryDate"
      <*> v .:? "homePage" <*> v .: "occupation"
      <*> v .: "employmentType" <*> v .:? "wage"
      <*> v .:? "workingHours" <*> v .:? "employeeCount"
      <*> v .:? "workPlace" <*> v .:? "jobDescription"
      <*> v .:? "qualifications"

instance ToJSON Job where
  toJSON j =
    object
      [ "jobNumber" .= jobNumber j, "companyName" .= companyName j
      , "receivedDate" .= receivedDate j, "expiryDate" .= expiryDate j
      , "homePage" .= homePage j, "occupation" .= occupation j
      , "employmentType" .= employmentType j, "wage" .= wage j
      , "workingHours" .= workingHours j, "employeeCount" .= employeeCount j
      , "workPlace" .= workPlace j, "jobDescription" .= jobDescription j
      , "qualifications" .= qualifications j
      ]

data PageMeta = PageMeta
  { totalCount :: Int
  , page :: Int
  , totalPages :: Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON PageMeta
instance ToJSON PageMeta

data JobsResponse = JobsResponse
  { jobs :: [Job]
  , meta :: PageMeta
  }
  deriving (Show, Eq, Generic)

instance FromJSON JobsResponse
instance ToJSON JobsResponse

-- Client

listJobs :: Config -> Maybe Int -> Maybe String -> IO (Either AppError JobsResponse)
listJobs cfg pg kw = withEndpoint cfg $ \case
  Left (url, baseOpts) -> do
    let params = baseOpts
          <> maybe mempty ("page" =:) pg
          <> maybe mempty (("keyword" =:) . T.pack) kw
    resp <- req GET (url /: "jobs") NoReqBody lbsResponse params
    pure $ decodeResponse (responseBody resp)
  Right (url, baseOpts) -> do
    let params = baseOpts
          <> maybe mempty ("page" =:) pg
          <> maybe mempty (("keyword" =:) . T.pack) kw
    resp <- req GET (url /: "jobs") NoReqBody lbsResponse params
    pure $ decodeResponse (responseBody resp)

getJob :: Config -> String -> IO (Either AppError Job)
getJob cfg jobNum = withEndpoint cfg $ \case
  Left (url, opts) -> do
    resp <- req GET (url /: "jobs" /: T.pack jobNum) NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, opts) -> do
    resp <- req GET (url /: "jobs" /: T.pack jobNum) NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

-- Command

data JobsCommand
  = JobsList ListOpts
  | JobsGet GetOpts
  deriving (Show)

data ListOpts = ListOpts
  { listPage :: Maybe Int
  , listKeyword :: Maybe String
  , listFormat :: OutputFormat
  }
  deriving (Show)

data GetOpts = GetOpts
  { getJobNumber :: String
  , getFormat :: OutputFormat
  }
  deriving (Show)

jobsCommandParser :: Parser JobsCommand
jobsCommandParser =
  hsubparser
    ( command "list" (info (JobsList <$> listOptsParser) (progDesc "List jobs"))
        <> command "get" (info (JobsGet <$> getOptsParser) (progDesc "Get a job by number"))
    )
  where
    listOptsParser =
      ListOpts
        <$> optional (option auto (long "page" <> short 'p' <> metavar "N" <> help "Page number"))
        <*> optional (strOption (long "keyword" <> short 'k' <> metavar "TEXT" <> help "Search keyword"))
        <*> formatOption
    getOptsParser =
      GetOpts
        <$> argument str (metavar "JOB_NUMBER" <> help "Job number (e.g., 13010-12345678)")
        <*> formatOption

runJobsCommand :: Config -> JobsCommand -> IO ()
runJobsCommand cfg (JobsList opts) = do
  result <- listJobs cfg (listPage opts) (listKeyword opts)
  case result of
    Left err -> outputError err
    Right resp -> outputJobs (listFormat opts) resp
runJobsCommand cfg (JobsGet opts) = do
  result <- getJob cfg (getJobNumber opts)
  case result of
    Left err -> outputError err
    Right job -> outputJob (getFormat opts) job

-- Output

outputJob :: OutputFormat -> Job -> IO ()
outputJob JSON job = LBS.putStrLn (encode job)
outputJob Table job = putStrLn (formatJobDetail job)

outputJobs :: OutputFormat -> JobsResponse -> IO ()
outputJobs JSON resp = LBS.putStrLn (encode resp)
outputJobs Table resp = do
  mapM_ (putStrLn . formatJobRow) (jobs resp)
  let m = meta resp
  putStrLn $ "\n(" <> show (totalCount m) <> " 件中 "
    <> show (page m) <> "/" <> show (totalPages m) <> " ページ)"

formatJobRow :: Job -> String
formatJobRow j =
  T.unpack (jobNumber j) <> "  "
    <> T.unpack (fromMaybe "-" (companyName j)) <> "  "
    <> T.unpack (occupation j) <> "  "
    <> formatWage (wage j)

formatJobDetail :: Job -> String
formatJobDetail j =
  unlines'
    [ "求人番号:   " <> T.unpack (jobNumber j)
    , "会社名:     " <> T.unpack (fromMaybe "-" (companyName j))
    , "職種:       " <> T.unpack (occupation j)
    , "雇用形態:   " <> T.unpack (employmentType j)
    , "賃金:       " <> formatWage (wage j)
    , "勤務地:     " <> T.unpack (fromMaybe "-" (workPlace j))
    , "受付日:     " <> T.unpack (receivedDate j)
    , "有効期限:   " <> T.unpack (expiryDate j)
    ]

formatWage :: Maybe WageRange -> String
formatWage Nothing = "-"
formatWage (Just w) = show (wageMin w) <> " ~ " <> show (wageMax w) <> " 円"
