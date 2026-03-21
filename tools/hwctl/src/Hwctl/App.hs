{-# LANGUAGE OverloadedStrings #-}

module Hwctl.App
  ( runApp
  ) where

import Hwctl.Commands.Api.Jobs (JobsCommand, jobsCommandParser, runJobsCommand)
import Hwctl.Commands.Api.Stats (StatsCommand, statsCommandParser, runStatsCommand)
import Hwctl.Commands.Collector.Crawler (CrawlerCommand, crawlerCommandParser, runCrawlerCommand)
import Hwctl.Commands.Collector.Diagnose (DiagnoseCommand, diagnoseCommandParser, runDiagnoseCommand)
import Hwctl.Config (loadConfig)
import Options.Applicative

data Command
  = Jobs JobsCommand
  | Stats StatsCommand
  | Crawler CrawlerCommand
  | CrawlerDiagnose DiagnoseCommand

commandParser :: Parser Command
commandParser =
  hsubparser
    ( command "jobs" (info (Jobs <$> jobsCommandParser) (progDesc "Manage jobs"))
        <> command "stats" (info (Stats <$> statsCommandParser) (progDesc "View statistics"))
        <> command "crawler" (info crawlerParser (progDesc "Crawler operations"))
    )
  where
    crawlerParser =
      (Crawler <$> crawlerCommandParser)
        <|> hsubparser
          ( command "diagnose" (info (CrawlerDiagnose <$> diagnoseCommandParser) (progDesc "Diagnose crawler pipeline health"))
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
    Jobs sub -> runJobsCommand cfg sub
    Stats sub -> runStatsCommand cfg sub
    Crawler sub -> runCrawlerCommand cfg sub
    CrawlerDiagnose sub -> runDiagnoseCommand cfg sub
