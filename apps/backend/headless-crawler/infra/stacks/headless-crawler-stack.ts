import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import * as dotenv from "dotenv";
import { JobNumberExtractAndTransformConstruct } from "../constructs/E-T-JobNumber";
import { JobDetailExtractThenTransformThenLoadConstruct } from "../constructs/E-T-L-jobDetail";
import { PlayWrightLayerConstruct } from "../constructs/PlayWrightLayer";

dotenv.config();

export class HeadlessCrawlerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const playwrightLayer = new PlayWrightLayerConstruct(
      this,
      "PlayWrightLayer",
    );

    const jobNumberExtractorConstruct =
      new JobNumberExtractAndTransformConstruct(this, "JobNumberExtractor", {
        playwrightLayer: playwrightLayer.layer,
      });

    const jobDetailExtractThenTransformThenLoadConstruct =
      new JobDetailExtractThenTransformThenLoadConstruct(
        this,
        "JobDetailExtractThenTransformThenLoad",
        {
          playwrightLayer: playwrightLayer.layer,
        },
      );

    const toJobDetailExtractThenTransformThenLoadQueue = new sqs.Queue(
      this,
      "ToJobDetailExtractThenTransformThenLoadQueue",
      {
        visibilityTimeout: cdk.Duration.seconds(300),
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

    jobDetailExtractThenTransformThenLoadConstruct.extractThenTransformThenLoader.addEventSource(
      new SqsEventSource(toJobDetailExtractThenTransformThenLoadQueue, {
        batchSize: 1,
      }),
    );
    rule.addTarget(
      new targets.LambdaFunction(jobNumberExtractorConstruct.extractor),
    );

    toJobDetailExtractThenTransformThenLoadQueue.grantSendMessages(
      jobNumberExtractorConstruct.extractor,
    );
    queueForJobDetailRawHtmlExtractor.grantSendMessages(
      jobNumberExtractorConstruct.extractor,
    );

    // デバッグ用ロール（読み取り専用、スタック内リソースに限定）
    new iam.Role(this, "DebugRole", {
      roleName: "crawler-debug-role",
      assumedBy: new iam.AccountRootPrincipal(),
      maxSessionDuration: cdk.Duration.hours(1),
      inlinePolicies: {
        debug: new iam.PolicyDocument({
          statements: [
            // SQS: リスト系は resource 制限不可
            new iam.PolicyStatement({
              actions: ["sqs:ListQueues"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: [
                "sqs:GetQueueAttributes",
                "sqs:GetQueueUrl",
                "sqs:ListDeadLetterSourceQueues",
              ],
              resources: [
                toJobDetailExtractThenTransformThenLoadQueue.queueArn,
                queueForJobDetailRawHtmlExtractor.queueArn,
              ],
            }),
            // Lambda: リスト系は resource 制限不可
            new iam.PolicyStatement({
              actions: ["lambda:ListFunctions"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: [
                "lambda:GetFunction",
                "lambda:GetFunctionConfiguration",
              ],
              resources: [
                jobNumberExtractorConstruct.extractor.functionArn,
                jobDetailExtractThenTransformThenLoadConstruct
                  .extractThenTransformThenLoader.functionArn,
              ],
            }),
            // CloudWatch Logs: スタック内 Lambda のログに限定
            new iam.PolicyStatement({
              actions: ["logs:DescribeLogGroups"],
              resources: ["*"],
            }),
            new iam.PolicyStatement({
              actions: [
                "logs:FilterLogEvents",
                "logs:GetLogEvents",
                "logs:StartQuery",
                "logs:GetQueryResults",
              ],
              resources: [
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${jobNumberExtractorConstruct.extractor.functionName}:*`,
                `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${jobDetailExtractThenTransformThenLoadConstruct.extractThenTransformThenLoader.functionName}:*`,
              ],
            }),
          ],
        }),
      },
    });
  }
}
