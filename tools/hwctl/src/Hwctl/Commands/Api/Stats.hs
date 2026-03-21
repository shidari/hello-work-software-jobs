{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Commands.Api.Stats
  ( StatsCommand (..)
  , statsCommandParser
  , runStatsCommand
  ) where

import Data.Aeson (FromJSON (..), ToJSON (..), eitherDecode, encode, object, (.:), (.:?), (.=), withObject)
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Text (Text)
import qualified Data.Text as T
import GHC.Generics (Generic)
import Hwctl.Config (Config)
import Hwctl.Http (decodeResponse, withEndpoint)
import Hwctl.Types (AppError (..), OutputFormat (..), formatOption, outputError)
import Network.HTTP.Req
import Options.Applicative

-- Types

data DailyStat = DailyStat
  { addedDate :: Text
  , statCount :: Int
  , statJobNumbers :: [Text]
  }
  deriving (Show, Eq, Generic)

instance FromJSON DailyStat where
  parseJSON = withObject "DailyStat" $ \v ->
    DailyStat <$> v .: "addedDate" <*> v .: "count" <*> v .: "jobNumbers"

instance ToJSON DailyStat where
  toJSON s =
    object ["addedDate" .= addedDate s, "count" .= statCount s, "jobNumbers" .= statJobNumbers s]

data StatsResponse = StatsResponse
  { stats :: [DailyStat]
  }
  deriving (Show, Eq, Generic)

instance FromJSON StatsResponse
instance ToJSON StatsResponse

data StatsFilter = StatsFilter
  { filterSince :: Maybe Text
  , filterUntil :: Maybe Text
  , filterMinCount :: Maybe Int
  , filterLimit :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON StatsFilter where
  parseJSON = withObject "StatsFilter" $ \v ->
    StatsFilter <$> v .:? "since" <*> v .:? "until" <*> v .:? "minCount" <*> v .:? "limit"

defaultStatsFilter :: StatsFilter
defaultStatsFilter = StatsFilter Nothing Nothing Nothing Nothing

data StatsSummary = StatsSummary
  { totalDays :: Int
  , totalJobs :: Int
  }
  deriving (Show, Eq, Generic)

instance ToJSON StatsSummary

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

data StatsCommand
  = StatsDailyCmd StatsOpts
  deriving (Show)

data StatsOpts = StatsOpts
  { statsFilterJson :: Maybe String
  , statsFormat :: OutputFormat
  }
  deriving (Show)

statsCommandParser :: Parser StatsCommand
statsCommandParser =
  hsubparser
    ( command "daily" (info (StatsDailyCmd <$> statsOptsParser) (progDesc "Daily new job counts"))
    )
  where
    statsOptsParser =
      StatsOpts
        <$> optional (argument str (metavar "FILTER_JSON" <> help "Filter JSON (e.g., '{\"since\":\"2026-03-01\",\"limit\":5}')"))
        <*> formatOption

runStatsCommand :: Config -> StatsCommand -> IO ()
runStatsCommand cfg (StatsDailyCmd opts) = do
  let filterResult = case statsFilterJson opts of
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
        Right resp -> outputDailyStats (statsFormat opts) (applyStatsFilter filt (stats resp))

-- Output

outputDailyStats :: OutputFormat -> [DailyStat] -> IO ()
outputDailyStats JSON filtered = do
  let summary = StatsSummary (length filtered) (sum (map statCount filtered))
  LBS.putStrLn (encode (object ["stats" .= filtered, "summary" .= summary]))
outputDailyStats Table filtered = do
  putStrLn "追加日        件数"
  mapM_ (\s -> putStrLn $ T.unpack (addedDate s) <> "    " <> show (statCount s)) filtered
  let totalD = length filtered
      totalJ = sum (map statCount filtered)
  putStrLn $ "\n(" <> show totalD <> " 日間, 合計 " <> show totalJ <> " 件)"

-- Filter

applyStatsFilter :: StatsFilter -> [DailyStat] -> [DailyStat]
applyStatsFilter filt =
  maybe id take (filterLimit filt)
    . filter
      ( \s ->
          maybe True (\since -> addedDate s >= since) (filterSince filt)
            && maybe True (\until' -> addedDate s <= until') (filterUntil filt)
            && maybe True (\minC -> statCount s >= minC) (filterMinCount filt)
      )
