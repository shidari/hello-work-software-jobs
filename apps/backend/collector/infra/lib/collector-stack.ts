import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";

export class CollectorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Environment variables ---
    const jobStoreEndpoint = process.env.JOB_STORE_ENDPOINT;
    if (!jobStoreEndpoint) throw new Error("JOB_STORE_ENDPOINT is required");
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is required");

    // --- SQS ---
    const dlq = new sqs.Queue(this, "JobDetailDlq", {
      queueName: "job-detail-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    const queue = new sqs.Queue(this, "JobDetailQueue", {
      queueName: "job-detail-queue",
      visibilityTimeout: cdk.Duration.seconds(360),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 1,
      },
    });

    // --- Docker image (shared) ---
    const dockerImageDir = path.join(__dirname, "..", "..", "..", "..", "..");
    const dockerfilePath = "apps/backend/collector/infra/Dockerfile";

    // --- Lambda: job-number-crawler ---
    const jobNumberCrawlerLogGroup = new logs.LogGroup(
      this,
      "JobNumberCrawlerLogGroup",
      {
        logGroupName: "/aws/lambda/job-number-crawler",
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const jobNumberCrawler = new lambda.DockerImageFunction(
      this,
      "JobNumberCrawler",
      {
        functionName: "job-number-crawler",
        code: lambda.DockerImageCode.fromImageAsset(dockerImageDir, {
          file: dockerfilePath,
          platform: Platform.LINUX_AMD64,
          cmd: ["apps/backend/collector/dist/job-number-handler.handler"],
          exclude: ["**/cdk.out", "**/node_modules", "**/.git", ".devbox"],
        }),
        memorySize: 2048,
        timeout: cdk.Duration.minutes(15),
        environment: {
          SQS_QUEUE_URL: queue.queueUrl,
          JOB_STORE_ENDPOINT: jobStoreEndpoint,
          API_KEY: apiKey,
        },
        logGroup: jobNumberCrawlerLogGroup,
      },
    );

    queue.grantSendMessages(jobNumberCrawler);

    // --- Lambda: job-detail-etl ---
    const jobDetailEtlLogGroup = new logs.LogGroup(
      this,
      "JobDetailEtlLogGroup",
      {
        logGroupName: "/aws/lambda/job-detail-etl",
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const jobDetailEtl = new lambda.DockerImageFunction(this, "JobDetailEtl", {
      functionName: "job-detail-etl",
      code: lambda.DockerImageCode.fromImageAsset(dockerImageDir, {
        file: dockerfilePath,
        platform: Platform.LINUX_AMD64,
        cmd: ["apps/backend/collector/dist/job-detail-handler.handler"],
        exclude: ["**/cdk.out", "**/node_modules", "**/.git", ".devbox"],
      }),
      memorySize: 2048,
      timeout: cdk.Duration.minutes(5),
      environment: {
        JOB_STORE_ENDPOINT: jobStoreEndpoint,
        API_KEY: apiKey,
      },
      logGroup: jobDetailEtlLogGroup,
      reservedConcurrentExecutions: 3,
    });

    jobDetailEtl.addEventSource(
      new eventsources.SqsEventSource(queue, {
        batchSize: 1,
      }),
    );

    // --- EventBridge: weekday 01:00 JST (= 16:00 UTC previous day) ---
    const cronRule = new events.Rule(this, "WeekdayCronRule", {
      ruleName: "collector-weekday-cron",
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "16",
        weekDay: "SUN-THU",
      }),
    });

    cronRule.addTarget(new targets.LambdaFunction(jobNumberCrawler));
  }
}
