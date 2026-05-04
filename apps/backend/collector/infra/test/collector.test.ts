import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { CollectorStack } from "../lib/collector-stack";

beforeAll(() => {
  process.env.JOB_STORE_ENDPOINT = "https://example.com";
  process.env.API_KEY = "test-key";
});

afterAll(() => {
  process.env.JOB_STORE_ENDPOINT = "";
  process.env.API_KEY = "";
});

let template: Template;
beforeEach(() => {
  const app = new cdk.App();
  const stack = new CollectorStack(app, "TestStack");
  template = Template.fromStack(stack);
});

describe("SQS", () => {
  test("DLQ は 14 日リテンション", () => {
    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "job-detail-dlq",
      MessageRetentionPeriod: 14 * 24 * 60 * 60,
    });
  });

  test("メイン queue は visibility 360s + DLQ への redrive (maxReceiveCount=1)", () => {
    template.hasResourceProperties("AWS::SQS::Queue", {
      QueueName: "job-detail-queue",
      VisibilityTimeout: 360,
      RedrivePolicy: {
        maxReceiveCount: 1,
        deadLetterTargetArn: Match.anyValue(),
      },
    });
  });
});

describe("Lambda", () => {
  test("関数は 2 つ", () => {
    template.resourceCountIs("AWS::Lambda::Function", 2);
  });

  test("job-number-crawler は memory=2048 / timeout=900 / 必須 env を持つ", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "job-number-crawler",
      MemorySize: 2048,
      Timeout: 900,
      Environment: {
        Variables: {
          SQS_QUEUE_URL: Match.anyValue(),
          JOB_STORE_ENDPOINT: "https://example.com",
          API_KEY: "test-key",
        },
      },
    });
  });

  test("job-detail-etl は memory=2048 / timeout=300 / 必須 env を持つ", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      FunctionName: "job-detail-etl",
      MemorySize: 2048,
      Timeout: 300,
      Environment: {
        Variables: {
          JOB_STORE_ENDPOINT: "https://example.com",
          API_KEY: "test-key",
        },
      },
    });
  });
});

describe("SQS → Lambda EventSource", () => {
  test("job-detail-etl は batchSize=1, maxConcurrency=3 で Queue から消費", () => {
    template.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      BatchSize: 1,
      ScalingConfig: { MaximumConcurrency: 3 },
      EventSourceArn: Match.anyValue(),
    });
  });
});

describe("EventBridge cron", () => {
  test("平日 16:00 UTC (= 翌 01:00 JST) で job-number-crawler を起動する", () => {
    template.hasResourceProperties("AWS::Events::Rule", {
      Name: "collector-weekday-cron",
      ScheduleExpression: "cron(0 16 ? * SUN-THU *)",
      Targets: Match.arrayWith([
        Match.objectLike({
          Arn: Match.anyValue(),
        }),
      ]),
    });
  });
});

describe("環境変数バリデーション", () => {
  test("JOB_STORE_ENDPOINT が空文字なら例外", () => {
    process.env.JOB_STORE_ENDPOINT = "";
    expect(() => new CollectorStack(new cdk.App(), "TestStackMissing")).toThrow(
      /JOB_STORE_ENDPOINT/,
    );
    process.env.JOB_STORE_ENDPOINT = "https://example.com";
  });

  test("API_KEY が空文字なら例外", () => {
    process.env.API_KEY = "";
    expect(
      () => new CollectorStack(new cdk.App(), "TestStackMissingApi"),
    ).toThrow(/API_KEY/);
    process.env.API_KEY = "test-key";
  });
});
