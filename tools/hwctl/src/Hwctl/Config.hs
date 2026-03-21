{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Hwctl.Config
  ( Config (..)
  , loadConfig
  ) where

import Configuration.Dotenv (defaultConfig, loadFile)
import Control.Exception (catch, SomeException)
import System.Environment (lookupEnv)

data Config = Config
  { endpoint :: String
  }
  deriving (Show)

loadConfig :: IO Config
loadConfig = do
  loadFile defaultConfig `catch` (\(_ :: SomeException) -> pure ())
  ep <- lookupEnv "HWCTL_ENDPOINT"
  pure Config { endpoint = maybe "http://localhost:8787" id ep }
