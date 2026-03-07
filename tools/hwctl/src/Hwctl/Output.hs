{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Output
  ( OutputFormat (..)
  , outputJob
  , outputJobs
  , outputError
  ) where

import Data.Aeson (encode)
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Maybe (fromMaybe)
import qualified Data.Text as T
import Hwctl.Types (AppError, Job (..), JobsResponse (..), PageMeta (..), WageRange (..))
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

unlines' :: [String] -> String
unlines' = foldr (\a b -> if null b then a else a <> "\n" <> b) ""
