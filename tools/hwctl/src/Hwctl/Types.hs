{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Types
  ( AppError (..)
  , outputError
  , formatOption
  , OutputFormat (..)
  , unlines'
  ) where

import Data.Aeson (ToJSON (..), (.=), object)
import qualified Data.ByteString.Lazy.Char8 as LBS
import Data.Aeson (encode)
import Data.Text (Text)
import Options.Applicative
import System.Exit (exitFailure)
import System.IO (hPutStrLn, stderr)

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

data OutputFormat = JSON | Table
  deriving (Show, Eq)

formatOption :: Parser OutputFormat
formatOption =
  flag JSON Table (long "table" <> help "Human-readable table output (default: JSON)")

outputError :: AppError -> IO a
outputError err = do
  LBS.hPutStr stderr (encode err)
  hPutStrLn stderr ""
  exitFailure

unlines' :: [String] -> String
unlines' = foldr (\a b -> if null b then a else a <> "\n" <> b) ""
