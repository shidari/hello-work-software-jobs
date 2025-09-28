// constructs/lambda-construct.ts
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";
import { Alarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";

export class JobDetailExtractorConstruct extends Construct {
  public readonly extractor: NodejsFunction;
  constructor(
    scope: Construct,
    id: string,
    props: { playwrightLayer: lambda.LayerVersion },
  ) {
    super(scope, id);
    this.extractor = new NodejsFunction(this, "ScrapingFunction", {
      entry: "functions/extractTransformAndSaveJobDetailHandler/handler.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
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
      environment: {
        JOB_STORE_ENDPOINT: process.env.JOB_STORE_ENDPOINT || "",
        API_KEY: process.env.API_KEY || "",
      },
    });

    const scraperAlarmTopic = new Topic(this, "ScraperAlarmTopic");
    scraperAlarmTopic.addSubscription(
      new EmailSubscription(process.env.MAIL_ADDRESS || ""),
    );

    const invocationMetric = new Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "Sum",
      period: Duration.hours(1),
      dimensionsMap: {
        FunctionName: this.extractor.functionName,
      },
    });

    const scrapingAlarm = new Alarm(this, "ScraperInvocationAlarm", {
      metric: invocationMetric,
      threshold: 1000,
      evaluationPeriods: 1,
      alarmDescription: "scraping Lambda invocation count exceeded threshold",
    });

    scrapingAlarm.addAlarmAction(new SnsAction(scraperAlarmTopic));
  }
}
