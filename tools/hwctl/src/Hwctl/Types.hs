{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}

module Hwctl.Types
  ( Job (..)
  , WageRange (..)
  , WorkingHours (..)
  , JobsResponse (..)
  , PageMeta (..)
  , AppError (..)
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

data AppError
  = HttpError String
  | ApiError Int String
  | ParseError String
  deriving (Show, Eq)

instance ToJSON AppError where
  toJSON (HttpError msg) =
    object ["error" .= object ["code" .= ("HTTP_ERROR" :: Text), "message" .= msg]]
  toJSON (ApiError code msg) =
    object ["error" .= object ["code" .= ("API_ERROR_" <> show code), "message" .= msg]]
  toJSON (ParseError msg) =
    object ["error" .= object ["code" .= ("PARSE_ERROR" :: Text), "message" .= msg]]
