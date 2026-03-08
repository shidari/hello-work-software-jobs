{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Output
  ( OutputFormat (..)
  , outputJob
  , outputJobs
  , outputDailyStats
  , outputQueueStatus
  , outputTailSession
  , outputTriggerResult
  , outputCrawlerRuns
  , outputError
  ) where

import Data.Aeson (encode, object, (.=))
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Maybe (fromMaybe)
import qualified Data.Text as T
import Hwctl.Types (AppError, CrawlerRun (..), DailyStat (..), Job (..), JobsResponse (..), PageMeta (..), QueueInfo (..), StatsSummary (..), TailSession (..), TriggerResponse (..), WageRange (..))
import System.Exit (exitFailure)
import System.IO (hPutStrLn, stderr)

data OutputFormat = JSON | Table
  deriving (Show, Eq)

outputJob :: OutputFormat -> Job -> IO ()
outputJob JSON job = LBS.putStrLn (encode job)
outputJob Table job = putStrLn (formatJobDetail job)

outputJobs :: OutputFormat -> JobsResponse -> IO ()
outputJobs JSON resp = LBS.putStrLn (encode resp)
outputJobs Table resp = do
  mapM_ (putStrLn . formatJobRow) (jobs resp)
  let m = meta resp
  putStrLn $
    "\n("
      <> show (totalCount m)
      <> " 件中 "
      <> show (page m)
      <> "/"
      <> show (totalPages m)
      <> " ページ)"

outputError :: AppError -> IO a
outputError err = do
  LBS.hPutStr stderr (encode err)
  hPutStrLn stderr ""
  exitFailure

formatJobRow :: Job -> String
formatJobRow j =
  T.unpack (jobNumber j)
    <> "  "
    <> T.unpack (fromMaybe "-" (companyName j))
    <> "  "
    <> T.unpack (occupation j)
    <> "  "
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

outputDailyStats :: OutputFormat -> [DailyStat] -> IO ()
outputDailyStats JSON filtered = do
  let summary = StatsSummary (length filtered) (sum (map statCount filtered))
  LBS.putStrLn (encode (object ["stats" .= filtered, "summary" .= summary]))
outputDailyStats Table filtered = do
  putStrLn "追加日        件数"
  mapM_ printRow filtered
  let totalD = length filtered
      totalJ = sum (map statCount filtered)
  putStrLn $ "\n(" <> show totalD <> " 日間, 合計 " <> show totalJ <> " 件)"
  where
    printRow s =
      putStrLn $ T.unpack (addedDate s) <> "    " <> show (statCount s)

outputQueueStatus :: OutputFormat -> QueueInfo -> IO ()
outputQueueStatus JSON qi = LBS.putStrLn (encode qi)
outputQueueStatus Table qi =
  putStrLn $
    unlines'
      [ "Queue ID:    " <> T.unpack (queueId qi)
      , "Queue Name:  " <> T.unpack (queueName qi)
      , "Created:     " <> T.unpack (fromMaybe "-" (queueCreatedOn qi))
      , "Modified:    " <> T.unpack (fromMaybe "-" (queueModifiedOn qi))
      , "Producers:   " <> maybe "-" show (queueProducersTotalCount qi)
      , "Consumers:   " <> maybe "-" show (queueConsumersTotalCount qi)
      ]

outputTailSession :: OutputFormat -> TailSession -> IO ()
outputTailSession JSON ts = LBS.putStrLn (encode ts)
outputTailSession Table ts =
  putStrLn $
    unlines'
      [ "Tail ID:     " <> T.unpack (tailId ts)
      , "WebSocket:   " <> T.unpack (tailUrl ts)
      , "Expires:     " <> T.unpack (fromMaybe "-" (tailExpiresAt ts))
      , ""
      , "接続コマンド:"
      , "  wscat -c \"" <> T.unpack (tailUrl ts) <> "\""
      ]

outputTriggerResult :: TriggerResponse -> IO ()
outputTriggerResult tr = LBS.putStrLn (encode tr)

outputCrawlerRuns :: [CrawlerRun] -> IO ()
outputCrawlerRuns runs = LBS.putStrLn (encode runs)

unlines' :: [String] -> String
unlines' = foldr (\a b -> if null b then a else a <> "\n" <> b) ""
