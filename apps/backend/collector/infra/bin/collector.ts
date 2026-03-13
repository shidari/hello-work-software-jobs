#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CollectorStack } from "../lib/collector-stack";

const app = new cdk.App();

new CollectorStack(app, "CollectorStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "ap-northeast-1",
  },
});
