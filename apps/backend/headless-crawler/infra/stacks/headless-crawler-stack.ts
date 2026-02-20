import * as cdk from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
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
  }
}
