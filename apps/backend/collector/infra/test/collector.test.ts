import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { afterAll, beforeAll, test } from "vitest";
import { CollectorStack } from "../lib/collector-stack";

beforeAll(() => {
  process.env.JOB_STORE_ENDPOINT = "https://example.com";
  process.env.API_KEY = "test-key";
});

afterAll(() => {
  process.env.JOB_STORE_ENDPOINT = "";
  process.env.API_KEY = "";
});

test("SQS Queue and DLQ created", () => {
  const app = new cdk.App();
  const stack = new CollectorStack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "job-detail-queue",
    VisibilityTimeout: 360,
  });

  template.hasResourceProperties("AWS::SQS::Queue", {
    QueueName: "job-detail-dlq",
  });
});

test("Lambda functions created", () => {
  const app = new cdk.App();
  const stack = new CollectorStack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.resourceCountIs("AWS::Lambda::Function", 2);
});
