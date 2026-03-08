{-# LANGUAGE DataKinds #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Hwctl.Client
  ( listJobs
  , getJob
  , fetchDailyStats
  , getQueueStatus
  , pullQueueMessages
  , createTailSession
  , JobsQuery (..)
  , defaultQuery
  ) where

import Control.Exception (catch, SomeException)
import Data.Aeson (FromJSON, eitherDecode, object)
import qualified Data.ByteString.Lazy as LBS
import qualified Data.Text as T
import Data.Text.Encoding (encodeUtf8)
import Hwctl.Config (CfConfig (..), Config (..))
import Hwctl.Types
  ( AppError (..)
  , CfApiResponse (..)
  , Job
  , JobsResponse
  , QueueInfo
  , QueuePullOptions (..)
  , QueuePullResponse
  , StatsResponse
  , TailSession
  , defaultQueuePullOptions
  )
import Network.HTTP.Req
import Text.URI (mkURI)

data JobsQuery = JobsQuery
  { queryPage :: Maybe Int
  , queryKeyword :: Maybe String
  }
  deriving (Show)

defaultQuery :: JobsQuery
defaultQuery = JobsQuery Nothing Nothing

-- Job store API (dynamic URL from config)

listJobs :: Config -> JobsQuery -> IO (Either AppError JobsResponse)
listJobs cfg q = withEndpoint cfg $ \case
  Left (url, baseOpts) -> do
    let params =
          baseOpts
            <> maybe mempty ("page" =:) (queryPage q)
            <> maybe mempty (("keyword" =:) . T.pack) (queryKeyword q)
    resp <- req GET (url /: "jobs") NoReqBody lbsResponse params
    pure $ decodeResponse (responseBody resp)
  Right (url, baseOpts) -> do
    let params =
          baseOpts
            <> maybe mempty ("page" =:) (queryPage q)
            <> maybe mempty (("keyword" =:) . T.pack) (queryKeyword q)
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

fetchDailyStats :: Config -> IO (Either AppError StatsResponse)
fetchDailyStats cfg = withEndpoint cfg $ \case
  Left (url, opts) -> do
    resp <- req GET (url /: "stats" /: "daily") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, opts) -> do
    resp <- req GET (url /: "stats" /: "daily") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

-- Cloudflare API (static https URL)

cfBaseUrl :: Url 'Https
cfBaseUrl = https "api.cloudflare.com" /: "client" /: "v4"

cfAuth :: CfConfig -> Option 'Https
cfAuth cf = header "Authorization" (encodeUtf8 ("Bearer " <> T.pack (cfToken cf)))

getQueueStatus :: CfConfig -> String -> IO (Either AppError QueueInfo)
getQueueStatus cf qid = runReq defaultHttpConfig $ do
  let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "queues" /: T.pack qid
  resp <- req GET url NoReqBody lbsResponse (cfAuth cf)
  pure $ decodeCfResponse (responseBody resp)

pullQueueMessages :: CfConfig -> String -> QueuePullOptions -> IO (Either AppError QueuePullResponse)
pullQueueMessages cf qid pullOpts = runReq defaultHttpConfig $ do
  let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "queues" /: T.pack qid /: "messages" /: "pull"
      merged = mergeWithDefaults pullOpts
  resp <- req POST url (ReqBodyJson merged) lbsResponse (cfAuth cf)
  pure $ decodeCfResponse (responseBody resp)
  where
    mergeWithDefaults o =
      QueuePullOptions
        { pullBatchSize = maybe (pullBatchSize defaultQueuePullOptions) Just (pullBatchSize o)
        , pullVisibilityTimeoutMs = maybe (pullVisibilityTimeoutMs defaultQueuePullOptions) Just (pullVisibilityTimeoutMs o)
        }

createTailSession :: CfConfig -> T.Text -> IO (Either AppError TailSession)
createTailSession cf worker = runReq defaultHttpConfig $ do
  let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "workers" /: "scripts" /: worker /: "tails"
  resp <- req POST url (ReqBodyJson (object [])) lbsResponse (cfAuth cf)
  pure $ decodeCfResponse (responseBody resp)

-- Helpers

withEndpoint ::
  Config ->
  (Either (Url 'Http, Option 'Http) (Url 'Https, Option 'Https) -> Req (Either AppError a)) ->
  IO (Either AppError a)
withEndpoint cfg f = do
  let baseUrl = T.pack (endpoint cfg)
      go = do
        uri <- mkURI baseUrl
        case useHttpURI uri of
          Just (url, opts) -> Just $ runReq defaultHttpConfig $ f (Left (url, opts))
          Nothing -> case useHttpsURI uri of
            Just (url, opts) -> Just $ runReq defaultHttpConfig $ f (Right (url, opts))
            Nothing -> Nothing
  case go of
    Just action -> action `catch` (\(e :: SomeException) -> pure $ Left (HttpError $ show e))
    Nothing -> pure $ Left (HttpError $ "Invalid URL: " <> endpoint cfg)

decodeResponse :: (FromJSON a) => LBS.ByteString -> Either AppError a
decodeResponse body = case eitherDecode body of
  Left msg -> Left (ParseError msg)
  Right result -> Right result

decodeCfResponse :: (FromJSON a) => LBS.ByteString -> Either AppError a
decodeCfResponse body = case eitherDecode body of
  Left msg -> Left (ParseError msg)
  Right resp
    | cfSuccess resp -> Right (cfResult resp)
    | otherwise -> Left (ApiError 0 "Cloudflare API returned success=false")
