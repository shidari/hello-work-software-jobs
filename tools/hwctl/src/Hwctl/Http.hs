{-# LANGUAGE DataKinds #-}
{-# LANGUAGE LambdaCase #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}

module Hwctl.Http
  ( withEndpoint
  , withEndpointStr
  , decodeResponse
  ) where

import Control.Exception (catch, SomeException)
import Data.Aeson (FromJSON, eitherDecode)
import qualified Data.ByteString.Lazy as LBS
import qualified Data.Text as T
import Hwctl.Config (Config (..))
import Hwctl.Types (AppError (..))
import Network.HTTP.Req
import Text.URI (mkURI)

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
