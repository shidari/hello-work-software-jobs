{-# LANGUAGE DataKinds #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Hwctl.Client
  ( listJobs
  , getJob
  , fetchDailyStats
  , getQueueStatus
  , createTailSession
  , triggerCrawler
  , fetchCrawlerRuns
  , fetchJobDetailRuns
  , sendQueueMessage
  , pullQueueMessages
  , JobsQuery (..)
  , defaultQuery
  ) where

import Control.Exception (catch, SomeException)
import Data.Aeson (FromJSON, eitherDecode, object, (.=))
import qualified Data.ByteString.Lazy as LBS
import qualified Data.Text as T
import Data.Text.Encoding (encodeUtf8)
import Hwctl.Config (CfConfig (..), Config (..))
import Hwctl.Types
  ( AppError (..)
  , CfApiResponse (..)
  , CrawlerRun
  , CrawlerRunOpts (..)
  , Job
  , JobDetailRun
  , JobsResponse
  , QueueInfo
  , QueuePullResponse
  , SendMessageResponse
  , StatsResponse
  , TailSession
  , TriggerResponse
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

createTailSession :: CfConfig -> T.Text -> IO (Either AppError TailSession)
createTailSession cf worker = runReq defaultHttpConfig $ do
  let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "workers" /: "scripts" /: worker /: "tails"
  resp <- req POST url (ReqBodyJson (object [])) lbsResponse (cfAuth cf)
  pure $ decodeCfResponse (responseBody resp)

-- Collector trigger

triggerCrawler :: String -> String -> CrawlerRunOpts -> IO (Either AppError TriggerResponse)
triggerCrawler collectorEp key croOpts = withEndpointStr collectorEp $ \case
  Left (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> crawlerQueryParams croOpts
    resp <- req POST (url /: "trigger") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> crawlerQueryParams croOpts
    resp <- req POST (url /: "trigger") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

crawlerQueryParams :: CrawlerRunOpts -> Option scheme
crawlerQueryParams croOpts =
  maybe mempty ("period" =:) (croPeriod croOpts)
    <> maybe mempty ("maxCount" =:) (croMaxCount croOpts)

-- Crawler runs

fetchCrawlerRuns :: String -> String -> Maybe Int -> IO (Either AppError [CrawlerRun])
fetchCrawlerRuns collectorEp key mLimit = withEndpointStr collectorEp $ \case
  Left (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> maybe mempty ("limit" =:) mLimit
    resp <- req GET (url /: "crawler-runs") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> maybe mempty ("limit" =:) mLimit
    resp <- req GET (url /: "crawler-runs") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

-- Job detail runs

fetchJobDetailRuns :: String -> String -> Maybe Int -> IO (Either AppError [JobDetailRun])
fetchJobDetailRuns collectorEp key mLimit = withEndpointStr collectorEp $ \case
  Left (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> maybe mempty ("limit" =:) mLimit
    resp <- req GET (url /: "job-detail-runs") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)
  Right (url, baseOpts) -> do
    let opts = baseOpts <> header "x-api-key" (encodeUtf8 (T.pack key)) <> maybe mempty ("limit" =:) mLimit
    resp <- req GET (url /: "job-detail-runs") NoReqBody lbsResponse opts
    pure $ decodeResponse (responseBody resp)

-- Queue message operations (Cloudflare API)

sendQueueMessage :: CfConfig -> String -> String -> IO (Either AppError SendMessageResponse)
sendQueueMessage cf qid jobNum =
  (runReq defaultHttpConfig $ do
    let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "queues" /: T.pack qid /: "messages"
        body = object ["body" .= object ["jobNumber" .= jobNum]]
    resp <- req POST url (ReqBodyJson body) lbsResponse (cfAuth cf)
    pure $ decodeCfResponse (responseBody resp))
  `catch` (\(e :: SomeException) -> pure $ Left (HttpError $ show e))

pullQueueMessages :: CfConfig -> String -> Int -> IO (Either AppError QueuePullResponse)
pullQueueMessages cf qid batchSize =
  (runReq defaultHttpConfig $ do
    let url = cfBaseUrl /: "accounts" /: T.pack (cfAccount cf) /: "queues" /: T.pack qid /: "messages" /: "pull"
        body = object ["batch_size" .= batchSize, "visibility_timeout_ms" .= (30000 :: Int)]
    resp <- req POST url (ReqBodyJson body) lbsResponse (cfAuth cf)
    pure $ decodeCfResponse (responseBody resp))
  `catch` (\(e :: SomeException) -> pure $ Left (HttpError $ show e))

-- Helpers

withEndpoint ::
  Config ->
  (Either (Url 'Http, Option 'Http) (Url 'Https, Option 'Https) -> Req (Either AppError a)) ->
  IO (Either AppError a)
withEndpoint cfg = withEndpointStr (endpoint cfg)

withEndpointStr ::
  String ->
  (Either (Url 'Http, Option 'Http) (Url 'Https, Option 'Https) -> Req (Either AppError a)) ->
  IO (Either AppError a)
withEndpointStr ep f = do
  let baseUrl = T.pack ep
      go = do
        uri <- mkURI baseUrl
        case useHttpURI uri of
          Just (url, opts) -> Just $ runReq defaultHttpConfig $ f (Left (url, opts))
          Nothing -> case useHttpsURI uri of
            Just (url, opts) -> Just $ runReq defaultHttpConfig $ f (Right (url, opts))
            Nothing -> Nothing
  case go of
    Just action -> action `catch` (\(e :: SomeException) -> pure $ Left (HttpError $ show e))
    Nothing -> pure $ Left (HttpError $ "Invalid URL: " <> ep)

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
