import * as cdk from "aws-cdk-lib";
import { Duration } from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cloudwatch_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import * as dotenv from "dotenv";

dotenv.config();

export class HeadlessCrawlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // デッドレターキューを作成
    const deadLetterQueue = new sqs.Queue(this, "ScrapingJobDeadLetterQueue", {
      queueName: "scraping-job-dead-letter-queue",
    });

    // example resource
    const queue = new sqs.Queue(this, "ScrapingJobQueue", {
      visibilityTimeout: cdk.Duration.seconds(300),
      // リトライ機構を追加（3回リトライ後にデッドレターキューに送信）
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3, // 3回失敗したらデッドレターキューに送信
      },
    });

    // EventBridgeルール(Cron)を作成（例: 毎日午前1時に実行）
    const rule = new events.Rule(this, "CrawlerScheduleRule", {
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "1",
        weekDay: "MON",
      }),
    });

    const playwrightLayer = new lambda.LayerVersion(this, "playwrightLayer", {
      code: lambda.Code.fromAsset("functions/layer/playwright.zip"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
    });
    const crawler = new NodejsFunction(this, "CrawlingFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: "functions/extractJobNumberToSqsHandler/handler.ts",
      handler: "handler",
      memorySize: 1024,
      timeout: cdk.Duration.seconds(90),
      environment: {
        QUEUE_URL: process.env.QUEUE_URL || "",
      },
      layers: [playwrightLayer],
      bundling: {
        externalModules: [
          "chromium-bidi/lib/cjs/bidiMapper/BidiMapper",
          "chromium-bidi/lib/cjs/cdp/CdpConnection",
          "@sparticuz/chromium",
          "./chromium/appIcon.png",
          "./loader",
          "playwright-core",
        ], // Layer に含めるモジュールは除外
      },
    });

    const scraper = new NodejsFunction(this, "ScrapingFunction", {
      entry: "functions/extractTransformAndSaveJobDetailHandler/handler.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      layers: [playwrightLayer],
      bundling: {
        externalModules: [
          "chromium-bidi/lib/cjs/bidiMapper/BidiMapper",
          "chromium-bidi/lib/cjs/cdp/CdpConnection",
          "@sparticuz/chromium",
          "./chromium/appIcon.png",
          "./loader",
          "playwright-core",
        ], // Layer に含めるモジュールは除外
      },
      environment: {
        JOB_STORE_ENDPOINT: process.env.JOB_STORE_ENDPOINT || "",
        API_KEY: process.env.API_KEY || "",
      },
    });

    // SNSトピック
    const crawlerAlarmTopic = new sns.Topic(this, "CrawlerAlarmTopic");
    crawlerAlarmTopic.addSubscription(
      new subs.EmailSubscription(process.env.MAIL_ADDRESS || ""),
    );
    const scraperAlarmTopic = new sns.Topic(this, "ScraperAlarmTopic");
    scraperAlarmTopic.addSubscription(
      new subs.EmailSubscription(process.env.MAIL_ADDRESS || ""),
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
          SNS_TOPIC_ARN: scraperAlarmTopic.topicArn,
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
    scraperAlarmTopic.grantPublish(deadLetterMonitor);

    // Lambda 実行回数のメトリクス
    const crawlerInvocationsMetric = new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "Sum",
      period: cdk.Duration.hours(1),
      dimensionsMap: {
        FunctionName: crawler.functionName,
      },
    });
    const scraperInvocationsMetric = new cloudwatch.Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "Sum",
      period: cdk.Duration.hours(1),
      dimensionsMap: {
        FunctionName: scraper.functionName,
      },
    });

    const crawlingAlrm = new cloudwatch.Alarm(this, "CrawlerInvocationAlarm", {
      metric: crawlerInvocationsMetric,
      threshold: 1000,
      evaluationPeriods: 1,
      alarmDescription: "crawling Lambda invocation count exceeded threshold",
    });
    crawlingAlrm.addAlarmAction(
      new cloudwatch_actions.SnsAction(crawlerAlarmTopic),
    );
    const scrapingAlarm = new cloudwatch.Alarm(this, "ScraperInvocationAlarm", {
      metric: scraperInvocationsMetric,
      threshold: 1000,
      evaluationPeriods: 1,
      alarmDescription: "scraping Lambda invocation count exceeded threshold",
    });
    scrapingAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(scraperAlarmTopic),
    );

    scraper.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
      }),
    );

    rule.addTarget(new targets.LambdaFunction(crawler));

    queue.grantSendMessages(crawler);
  }
}
