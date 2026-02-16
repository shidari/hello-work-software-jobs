// constructs/lambda-construct.ts
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Duration } from "aws-cdk-lib";
import { Alarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

export class JobNumberExtractAndTransformConstruct extends Construct {
  public readonly extractor: NodejsFunction;
  constructor(
    scope: Construct,
    id: string,
    props: { playwrightLayer: lambda.LayerVersion },
  ) {
    super(scope, id);
    this.extractor = new NodejsFunction(this, "CrawlingFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: "functions/ET-JobNumberHandler/handler.ts",
      handler: "handler",
      memorySize: 1024,
      timeout: Duration.seconds(480),
      environment: {
        QUEUE_URL: process.env.QUEUE_URL || "",
      },
      layers: [props.playwrightLayer],
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

    const metric = new Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "Sum",
      period: Duration.hours(1),
      dimensionsMap: {
        FunctionName: this.extractor.functionName,
      },
    });

    const alarm = new Alarm(this, "CrawlerInvocationAlarm", {
      metric: metric,
      threshold: 1000,
      evaluationPeriods: 1,
      alarmDescription: "crawling Lambda invocation count exceeded threshold",
    });

    const alarmTopic = new Topic(this, "CrawlerAlarmTopic");
    alarmTopic.addSubscription(
      new EmailSubscription(process.env.MAIL_ADDRESS || ""),
    );

    alarm.addAlarmAction(new SnsAction(alarmTopic));
  }
}
