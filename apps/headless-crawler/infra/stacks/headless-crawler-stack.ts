import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import * as dotenv from "dotenv";
import { PlayWrightLayerConstruct } from "../constructs/PlayWrightLayer";
import { JobDetailRawHtmlExtractorConstruct } from "../constructs/E-jobDetail";
import { JobDetailExtractThenTransformThenLoadConstruct } from "../constructs/E-T-L-jobDetail";
import { JobNumberExtractAndTransformConstruct } from "../constructs/E-T-JobNumber";

dotenv.config();

export class HeadlessCrawlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const playwrightLayer = new PlayWrightLayerConstruct(
      this,
      "PlayWrightLayer",
    );

    const jobNumberExtractor = new JobNumberExtractAndTransformConstruct(
      this,
      "JobNumberExtractor",
      {
        playwrightLayer: playwrightLayer.layer,
      },
    );

    const jobDetailExtractThenTransformThenLoad =
      new JobDetailExtractThenTransformThenLoadConstruct(
        this,
        "JobDetailExtractThenTransformThenLoad",
        {
          playwrightLayer: playwrightLayer.layer,
        },
      );

    const jobDetailRawHtmlExtractor = new JobDetailRawHtmlExtractorConstruct(
      this,
      "JobDetailRawHtmlExtractor",
      {
        playwrightLayer: playwrightLayer.layer,
      },
    );

    // デッドレターキューを作成
    const deadLetterQueue = new sqs.Queue(this, "ScrapingJobDeadLetterQueue", {
      queueName: "scraping-job-dead-letter-queue",
    });

    // example resource
    const toJobDetailExtractThenTransformThenLoadQueue = new sqs.Queue(
      this,
      "ToJobDetailExtractThenTransformThenLoadQueue",
      {
        visibilityTimeout: cdk.Duration.seconds(300),
        // リトライ機構を追加（3回リトライ後にデッドレターキューに送信）
        deadLetterQueue: {
          queue: deadLetterQueue,
          maxReceiveCount: 3, // 3回失敗したらデッドレターキューに送信
        },
      },
    );

    const queueForJobDetailRawHtmlExtractor = new sqs.Queue(
      this,
      "JobDetailRawHtmlExtractorQueue",
      {},
    );

    // EventBridgeルール(Cron)を作成（例: 毎日午前1時に実行）
    const rule = new events.Rule(this, "CrawlerScheduleRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "1",
        weekDay: "MON",
      }),
    });

    const deadLetterMonitorAlarmTopic = new cdk.aws_sns.Topic(
      this,
      "DeadLetterMonitorAlarmTopic",
    );
    deadLetterMonitorAlarmTopic.addSubscription(
      new cdk.aws_sns_subscriptions.EmailSubscription(
        process.env.MAIL_ADDRESS || "",
      ),
    );

    // デッドレターキュー監視用Lambda（定期実行）
    const deadLetterMonitor = new NodejsFunction(
      this,
      "DeadLetterMonitorFunction",
      {
        entry: "functions/deadLetterMonitor/handler.ts",
        handler: "handler",
        runtime: lambda.Runtime.NODEJS_22_X,
        memorySize: 512,
        timeout: Duration.seconds(30),
        environment: {
          DEAD_LETTER_QUEUE_URL: deadLetterQueue.queueUrl,
          SNS_TOPIC_ARN: deadLetterMonitorAlarmTopic.topicArn,
          GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
          GITHUB_OWNER: "shidari",
          GITHUB_REPO: "hello-work-software-jobs",
        },
      },
    );

    // 定期的にデッドレターキューをチェック（平日毎日朝9時）
    const deadLetterCheckRule = new events.Rule(this, "DeadLetterCheckRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "9", // 朝9時（UTC）
        weekDay: "MON-FRI", // 平日のみ
      }),
    });

    deadLetterCheckRule.addTarget(
      new targets.LambdaFunction(deadLetterMonitor),
    );

    // 必要な権限を付与
    deadLetterQueue.grantConsumeMessages(deadLetterMonitor);
    deadLetterMonitorAlarmTopic.grantPublish(deadLetterMonitor);

    jobDetailExtractThenTransformThenLoad.extractThenTransformThenLoader.addEventSource(
      new SqsEventSource(toJobDetailExtractThenTransformThenLoadQueue, {
        batchSize: 1,
      }),
    );
    jobDetailRawHtmlExtractor.extractor.addEventSource(
      new SqsEventSource(queueForJobDetailRawHtmlExtractor, {
        batchSize: 1,
      }),
    );

    rule.addTarget(new targets.LambdaFunction(jobNumberExtractor.extractor));

    toJobDetailExtractThenTransformThenLoadQueue.grantSendMessages(
      jobNumberExtractor.extractor,
    );
    queueForJobDetailRawHtmlExtractor.grantSendMessages(
      jobNumberExtractor.extractor,
    );
  }
}
