{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Config
  ( Config (..)
  , loadConfig
  ) where

import System.Environment (lookupEnv)

data Config = Config
  { endpoint :: String
  , apiKey :: Maybe String
  }
  deriving (Show)

loadConfig :: IO Config
loadConfig = do
  ep <- lookupEnv "HWCTL_ENDPOINT"
  key <- lookupEnv "HWCTL_API_KEY"
  pure
    Config
      { endpoint = maybe "http://localhost:8787" id ep
      , apiKey = key
      }
