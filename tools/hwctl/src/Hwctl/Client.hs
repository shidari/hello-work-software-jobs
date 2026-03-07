{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Client
  ( listJobs
  , getJob
  , JobsQuery (..)
  , defaultQuery
  ) where

import Data.Aeson (eitherDecode)
import qualified Data.ByteString.Lazy as LBS
import Hwctl.Config (Config (..))
import Hwctl.Types (AppError (..), Job, JobsResponse)
import Network.HTTP.Client
  ( Manager
  , httpLbs
  , newManager
  , parseRequest
  , requestHeaders
  , responseBody
  , responseStatus
  )
import Network.HTTP.Client.TLS (tlsManagerSettings)
import Network.HTTP.Types.Status (statusCode)

data JobsQuery = JobsQuery
  { queryPage :: Maybe Int
  , queryKeyword :: Maybe String
  }
  deriving (Show)

defaultQuery :: JobsQuery
defaultQuery = JobsQuery Nothing Nothing

withManager :: (Manager -> IO a) -> IO a
withManager f = newManager tlsManagerSettings >>= f

buildUrl :: Config -> String -> String
buildUrl cfg path = endpoint cfg <> path

buildQueryString :: JobsQuery -> String
buildQueryString q =
  let params =
        concat
          [ maybe [] (\p -> [("page", show p)]) (queryPage q)
          , maybe [] (\k -> [("keyword", k)]) (queryKeyword q)
          ]
      formatParams [] = ""
      formatParams ps = "?" <> joinParams ps
      joinParams [] = ""
      joinParams [(k, v)] = k <> "=" <> v
      joinParams ((k, v) : rest) = k <> "=" <> v <> "&" <> joinParams rest
   in formatParams params

handleResponse :: LBS.ByteString -> Int -> Either AppError LBS.ByteString
handleResponse body status
  | status >= 200 && status < 300 = Right body
  | otherwise = Left (ApiError status (take 500 (show body)))

listJobs :: Config -> JobsQuery -> IO (Either AppError JobsResponse)
listJobs cfg q = withManager $ \mgr -> do
  let url = buildUrl cfg "/jobs" <> buildQueryString q
  req <- parseRequest url
  let req' = req {requestHeaders = [("Accept", "application/json")]}
  resp <- httpLbs req' mgr
  let sc = statusCode (responseStatus resp)
  pure $ case handleResponse (responseBody resp) sc of
    Left err -> Left err
    Right body -> case eitherDecode body of
      Left msg -> Left (ParseError msg)
      Right result -> Right result

getJob :: Config -> String -> IO (Either AppError Job)
getJob cfg jobNum = withManager $ \mgr -> do
  let url = buildUrl cfg ("/jobs/" <> jobNum)
  req <- parseRequest url
  let req' = req {requestHeaders = [("Accept", "application/json")]}
  resp <- httpLbs req' mgr
  let sc = statusCode (responseStatus resp)
  pure $ case handleResponse (responseBody resp) sc of
    Left err -> Left err
    Right body -> case eitherDecode body of
      Left msg -> Left (ParseError msg)
      Right result -> Right result
