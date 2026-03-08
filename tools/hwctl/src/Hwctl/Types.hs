{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Types
  ( Job (..)
  , WageRange (..)
  , WorkingHours (..)
  , JobsResponse (..)
  , PageMeta (..)
  , DailyStat (..)
  , StatsResponse (..)
  , StatsFilter (..)
  , StatsSummary (..)
  , defaultStatsFilter
  , AppError (..)
  , CfApiResponse (..)
  , QueueInfo (..)
  , TailSession (..)
  , TailOptions (..)
  , defaultTailOptions
  , TriggerResponse (..)
  , CrawlerRun (..)
  , CrawlerRunOpts (..)
  , defaultCrawlerRunOpts
  ) where

import Data.Aeson
  ( FromJSON (..)
  , ToJSON (..)
  , (.:)
  , (.:?)
  , (.=)
  , object
  , withObject
  )
import Data.Text (Text)
import GHC.Generics (Generic)

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
      <$> v .: "jobNumber"
      <*> v .:? "companyName"
      <*> v .: "receivedDate"
      <*> v .: "expiryDate"
      <*> v .:? "homePage"
      <*> v .: "occupation"
      <*> v .: "employmentType"
      <*> v .:? "wage"
      <*> v .:? "workingHours"
      <*> v .:? "employeeCount"
      <*> v .:? "workPlace"
      <*> v .:? "jobDescription"
      <*> v .:? "qualifications"

instance ToJSON Job where
  toJSON j =
    object
      [ "jobNumber" .= jobNumber j
      , "companyName" .= companyName j
      , "receivedDate" .= receivedDate j
      , "expiryDate" .= expiryDate j
      , "homePage" .= homePage j
      , "occupation" .= occupation j
      , "employmentType" .= employmentType j
      , "wage" .= wage j
      , "workingHours" .= workingHours j
      , "employeeCount" .= employeeCount j
      , "workPlace" .= workPlace j
      , "jobDescription" .= jobDescription j
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
    object
      [ "addedDate" .= addedDate s
      , "count" .= statCount s
      , "jobNumbers" .= statJobNumbers s
      ]

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
    StatsFilter
      <$> v .:? "since"
      <*> v .:? "until"
      <*> v .:? "minCount"
      <*> v .:? "limit"

defaultStatsFilter :: StatsFilter
defaultStatsFilter = StatsFilter Nothing Nothing Nothing Nothing

data StatsSummary = StatsSummary
  { totalDays :: Int
  , totalJobs :: Int
  }
  deriving (Show, Eq, Generic)

instance ToJSON StatsSummary

-- Cloudflare API response wrapper
data CfApiResponse a = CfApiResponse
  { cfResult :: a
  , cfSuccess :: Bool
  }
  deriving (Show, Eq, Generic)

instance (FromJSON a) => FromJSON (CfApiResponse a) where
  parseJSON = withObject "CfApiResponse" $ \v ->
    CfApiResponse <$> v .: "result" <*> v .: "success"

-- Queue types
data QueueInfo = QueueInfo
  { queueId :: Text
  , queueName :: Text
  , queueCreatedOn :: Maybe Text
  , queueModifiedOn :: Maybe Text
  , queueProducersTotalCount :: Maybe Int
  , queueConsumersTotalCount :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON QueueInfo where
  parseJSON = withObject "QueueInfo" $ \v ->
    QueueInfo
      <$> v .: "queue_id"
      <*> v .: "queue_name"
      <*> v .:? "created_on"
      <*> v .:? "modified_on"
      <*> v .:? "producers_total_count"
      <*> v .:? "consumers_total_count"

instance ToJSON QueueInfo where
  toJSON q =
    object
      [ "queue_id" .= queueId q
      , "queue_name" .= queueName q
      , "created_on" .= queueCreatedOn q
      , "modified_on" .= queueModifiedOn q
      , "producers_total_count" .= queueProducersTotalCount q
      , "consumers_total_count" .= queueConsumersTotalCount q
      ]

data QueueMessage = QueueMessage
  { msgId :: Text
  , msgBody :: Text
  , msgTimestampMs :: Int
  , msgAttempts :: Int
  , msgLeaseId :: Maybe Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON QueueMessage where
  parseJSON = withObject "QueueMessage" $ \v ->
    QueueMessage
      <$> v .: "id"
      <*> v .: "body"
      <*> v .: "timestamp_ms"
      <*> v .: "attempts"
      <*> v .:? "lease_id"

instance ToJSON QueueMessage where
  toJSON m =
    object
      [ "id" .= msgId m
      , "body" .= msgBody m
      , "timestamp_ms" .= msgTimestampMs m
      , "attempts" .= msgAttempts m
      , "lease_id" .= msgLeaseId m
      ]

data QueuePullOptions = QueuePullOptions
  { pullBatchSize :: Maybe Int
  , pullVisibilityTimeoutMs :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON QueuePullOptions where
  parseJSON = withObject "QueuePullOptions" $ \v ->
    QueuePullOptions
      <$> v .:? "batch_size"
      <*> v .:? "visibility_timeout_ms"

instance ToJSON QueuePullOptions where
  toJSON o =
    object
      [ "batch_size" .= pullBatchSize o
      , "visibility_timeout_ms" .= pullVisibilityTimeoutMs o
      ]

defaultQueuePullOptions :: QueuePullOptions
defaultQueuePullOptions = QueuePullOptions (Just 10) (Just 30000)

data QueuePullResponse = QueuePullResponse
  { pullMessages :: [QueueMessage]
  , pullMessageBacklogCount :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON QueuePullResponse where
  parseJSON = withObject "QueuePullResponse" $ \v ->
    QueuePullResponse
      <$> v .: "messages"
      <*> v .:? "message_backlog_count"

instance ToJSON QueuePullResponse where
  toJSON r =
    object
      [ "messages" .= pullMessages r
      , "message_backlog_count" .= pullMessageBacklogCount r
      ]

-- Tail types
data TailSession = TailSession
  { tailId :: Text
  , tailUrl :: Text
  , tailExpiresAt :: Maybe Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON TailSession where
  parseJSON = withObject "TailSession" $ \v ->
    TailSession
      <$> v .: "id"
      <*> v .: "url"
      <*> v .:? "expires_at"

instance ToJSON TailSession where
  toJSON t =
    object
      [ "id" .= tailId t
      , "url" .= tailUrl t
      , "expires_at" .= tailExpiresAt t
      ]

data TailOptions = TailOptions
  { tailWorker :: Maybe Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON TailOptions where
  parseJSON = withObject "TailOptions" $ \v ->
    TailOptions <$> v .:? "worker"

defaultTailOptions :: TailOptions
defaultTailOptions = TailOptions (Just "collector")

-- Trigger types
data TriggerResponse = TriggerResponse
  { triggerMessage :: Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON TriggerResponse where
  parseJSON = withObject "TriggerResponse" $ \v ->
    TriggerResponse <$> v .: "message"

instance ToJSON TriggerResponse where
  toJSON t = object ["message" .= triggerMessage t]

-- Crawler run types
data CrawlerRun = CrawlerRun
  { runId :: Int
  , runStatus :: Text
  , runTrigger :: Text
  , runStartedAt :: Text
  , runFinishedAt :: Maybe Text
  , runFetchedCount :: Int
  , runQueuedCount :: Int
  , runFailedCount :: Int
  , runErrorMessage :: Maybe Text
  , runCreatedAt :: Text
  }
  deriving (Show, Eq, Generic)

instance FromJSON CrawlerRun where
  parseJSON = withObject "CrawlerRun" $ \v ->
    CrawlerRun
      <$> v .: "id"
      <*> v .: "status"
      <*> v .: "trigger"
      <*> v .: "startedAt"
      <*> v .:? "finishedAt"
      <*> v .: "fetchedCount"
      <*> v .: "queuedCount"
      <*> v .: "failedCount"
      <*> v .:? "errorMessage"
      <*> v .: "createdAt"

instance ToJSON CrawlerRun where
  toJSON r =
    object
      [ "id" .= runId r
      , "status" .= runStatus r
      , "trigger" .= runTrigger r
      , "startedAt" .= runStartedAt r
      , "finishedAt" .= runFinishedAt r
      , "fetchedCount" .= runFetchedCount r
      , "queuedCount" .= runQueuedCount r
      , "failedCount" .= runFailedCount r
      , "errorMessage" .= runErrorMessage r
      , "createdAt" .= runCreatedAt r
      ]

-- Crawler run options
data CrawlerRunOpts = CrawlerRunOpts
  { croPeriod :: Maybe Text
  , croMaxCount :: Maybe Int
  }
  deriving (Show, Eq, Generic)

instance FromJSON CrawlerRunOpts where
  parseJSON = withObject "CrawlerRunOpts" $ \v ->
    CrawlerRunOpts
      <$> v .:? "period"
      <*> v .:? "maxCount"

defaultCrawlerRunOpts :: CrawlerRunOpts
defaultCrawlerRunOpts = CrawlerRunOpts Nothing Nothing

-- Error types
data AppError
  = HttpError String
  | ApiError Int String
  | ParseError String
  | ConfigError String
  deriving (Show, Eq)

instance ToJSON AppError where
  toJSON (HttpError msg) =
    object ["error" .= object ["code" .= ("HTTP_ERROR" :: Text), "message" .= msg]]
  toJSON (ApiError code msg) =
    object ["error" .= object ["code" .= ("API_ERROR_" <> show code), "message" .= msg]]
  toJSON (ParseError msg) =
    object ["error" .= object ["code" .= ("PARSE_ERROR" :: Text), "message" .= msg]]
  toJSON (ConfigError msg) =
    object ["error" .= object ["code" .= ("CONFIG_ERROR" :: Text), "message" .= msg]]
