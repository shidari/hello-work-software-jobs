{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Command
  ( runApp
  ) where

import Hwctl.Client (JobsQuery (..), defaultQuery, getJob, listJobs)
import Hwctl.Config (loadConfig)
import Hwctl.Output (OutputFormat (..), outputError, outputJob, outputJobs)
import Options.Applicative

data Command
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

commandParser :: Parser Command
commandParser =
  hsubparser
    ( command
        "jobs"
        ( info
            jobsSubcommand
            (progDesc "Manage jobs")
        )
    )
  where
    jobsSubcommand =
      hsubparser
        ( command "list" (info (JobsList <$> listOptsParser) (progDesc "List jobs"))
            <> command "get" (info (JobsGet <$> getOptsParser) (progDesc "Get a job by number"))
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
