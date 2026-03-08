{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Hwctl.Config
  ( Config (..)
  , CfConfig (..)
  , loadConfig
  , requireCfConfig
  , requireQueueId
  , requireApiKey
  , requireCollectorEndpoint
  ) where

import Configuration.Dotenv (defaultConfig, loadFile)
import Control.Exception (catch, SomeException)
import Hwctl.Types (AppError (..))
import System.Environment (lookupEnv)

data Config = Config
  { endpoint :: String
  , apiKey :: Maybe String
  , collectorEndpoint :: Maybe String
  , cfAccountId :: Maybe String
  , cfApiToken :: Maybe String
  , cfQueueId :: Maybe String
  }
  deriving (Show)

data CfConfig = CfConfig
  { cfAccount :: String
  , cfToken :: String
  }
  deriving (Show)

-- | 空文字列を Nothing として扱う lookupEnv
lookupEnvNonEmpty :: String -> IO (Maybe String)
lookupEnvNonEmpty name = do
  val <- lookupEnv name
  pure $ case val of
    Just "" -> Nothing
    other -> other

loadConfig :: IO Config
loadConfig = do
  loadFile defaultConfig `catch` (\(_ :: SomeException) -> pure ())
  ep <- lookupEnv "HWCTL_ENDPOINT"
  key <- lookupEnvNonEmpty "HWCTL_API_KEY"
  cep <- lookupEnvNonEmpty "HWCTL_COLLECTOR_ENDPOINT"
  accId <- lookupEnvNonEmpty "HWCTL_CF_ACCOUNT_ID"
  token <- lookupEnvNonEmpty "HWCTL_CF_API_TOKEN"
  qId <- lookupEnvNonEmpty "HWCTL_CF_QUEUE_ID"
  pure
    Config
      { endpoint = maybe "http://localhost:8787" id ep
      , apiKey = key
      , collectorEndpoint = cep
      , cfAccountId = accId
      , cfApiToken = token
      , cfQueueId = qId
      }

requireCfConfig :: Config -> Either AppError CfConfig
requireCfConfig cfg = case (cfAccountId cfg, cfApiToken cfg) of
  (Just acc, Just tok) -> Right (CfConfig acc tok)
  _ -> Left (ConfigError "HWCTL_CF_ACCOUNT_ID and HWCTL_CF_API_TOKEN are required")

requireQueueId :: Config -> Either AppError String
requireQueueId cfg = case cfQueueId cfg of
  Just qid -> Right qid
  Nothing -> Left (ConfigError "HWCTL_CF_QUEUE_ID is required")

requireApiKey :: Config -> Either AppError String
requireApiKey cfg = case apiKey cfg of
  Just k -> Right k
  Nothing -> Left (ConfigError "HWCTL_API_KEY is required")

requireCollectorEndpoint :: Config -> Either AppError String
requireCollectorEndpoint cfg = case collectorEndpoint cfg of
  Just ep -> Right ep
  Nothing -> Left (ConfigError "HWCTL_COLLECTOR_ENDPOINT is required")
