{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Command
  ( runApp
  ) where

import Data.Aeson (eitherDecode)
import qualified Data.ByteString.Lazy.Char8 as LBS
import qualified Data.Text as T
import Hwctl.Client (JobsQuery (..), defaultQuery, fetchDailyStats, getJob, listJobs)
import Hwctl.Config (loadConfig)
import Hwctl.Output (OutputFormat (..), outputDailyStats, outputError, outputJob, outputJobs)
import Hwctl.Types (AppError (..), DailyStat (..), StatsFilter (..), StatsResponse (..), defaultStatsFilter)
import Options.Applicative

data Command
  = JobsList ListOpts
  | JobsGet GetOpts
  | StatsDailyCmd StatsOpts
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

data StatsOpts = StatsOpts
  { statsFilterJson :: Maybe String
  , statsFormat :: OutputFormat
  }
  deriving (Show)

formatOption :: Parser OutputFormat
formatOption =
  flag JSON Table (long "table" <> help "Human-readable table output (default: JSON)")

listOptsParser :: Parser ListOpts
listOptsParser =
  ListOpts
    <$> optional (option auto (long "page" <> short 'p' <> metavar "N" <> help "Page number"))
    <*> optional (strOption (long "keyword" <> short 'k' <> metavar "TEXT" <> help "Search keyword"))
    <*> formatOption

getOptsParser :: Parser GetOpts
getOptsParser =
  GetOpts
    <$> argument str (metavar "JOB_NUMBER" <> help "Job number (e.g., 13010-12345678)")
    <*> formatOption

statsOptsParser :: Parser StatsOpts
statsOptsParser =
  StatsOpts
    <$> optional (argument str (metavar "FILTER_JSON" <> help "Filter JSON (e.g., '{\"since\":\"2026-03-01\",\"limit\":5}')"))
    <*> formatOption

commandParser :: Parser Command
commandParser =
  hsubparser
    ( command
        "jobs"
        ( info
            jobsSubcommand
            (progDesc "Manage jobs")
        )
        <> command
          "stats"
          ( info
              statsSubcommand
              (progDesc "View statistics")
          )
    )
  where
    jobsSubcommand =
      hsubparser
        ( command "list" (info (JobsList <$> listOptsParser) (progDesc "List jobs"))
            <> command "get" (info (JobsGet <$> getOptsParser) (progDesc "Get a job by number"))
        )
    statsSubcommand =
      hsubparser
        ( command "daily" (info (StatsDailyCmd <$> statsOptsParser) (progDesc "Daily new job counts"))
        )

opts :: ParserInfo Command
opts =
  info
    (commandParser <**> helper)
    ( fullDesc
        <> progDesc "Admin CLI for hello-work-software-jobs"
        <> header "hwctl - Hello Work admin CLI"
    )

runApp :: IO ()
runApp = do
  cmd <- execParser opts
  cfg <- loadConfig
  case cmd of
    JobsList listOpt -> do
      let q =
            defaultQuery
              { queryPage = listPage listOpt
              , queryKeyword = listKeyword listOpt
              }
      result <- listJobs cfg q
      case result of
        Left err -> outputError err
        Right resp -> outputJobs (listFormat listOpt) resp
    JobsGet getOpt -> do
      result <- getJob cfg (getJobNumber getOpt)
      case result of
        Left err -> outputError err
        Right job -> outputJob (getFormat getOpt) job
    StatsDailyCmd statsOpt -> do
      let filterResult = case statsFilterJson statsOpt of
            Nothing -> Right defaultStatsFilter
            Just s -> case eitherDecode (LBS.pack s) of
              Left msg -> Left msg
              Right f -> Right f
      case filterResult of
        Left msg -> outputError (ParseError ("Invalid filter JSON: " <> msg))
        Right filt -> do
          result <- fetchDailyStats cfg
          case result of
            Left err -> outputError err
            Right resp -> do
              let filtered = applyStatsFilter filt (stats resp)
              outputDailyStats (statsFormat statsOpt) filtered

applyStatsFilter :: StatsFilter -> [DailyStat] -> [DailyStat]
applyStatsFilter filt =
  maybe id takeLim (filterLimit filt)
    . filter
      ( \s ->
          maybe True (\since -> addedDate s >= since) (filterSince filt)
            && maybe True (\until' -> addedDate s <= until') (filterUntil filt)
            && maybe True (\minC -> statCount s >= minC) (filterMinCount filt)
      )
  where
    takeLim n = take n
