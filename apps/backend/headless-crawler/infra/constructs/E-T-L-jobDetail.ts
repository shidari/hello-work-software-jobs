// constructs/lambda-construct.ts

import { Duration } from "aws-cdk-lib";
import { Alarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";

export class JobDetailExtractThenTransformThenLoadConstruct extends Construct {
  public readonly extractThenTransformThenLoader: NodejsFunction;
  constructor(
    scope: Construct,
    id: string,
    props: { playwrightLayer: lambda.LayerVersion },
  ) {
    super(scope, id);
    this.extractThenTransformThenLoader = new NodejsFunction(this, id, {
      entry: "functions/E-T-L-JobDetailHandler/handler.ts",
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 1024,
      timeout: Duration.seconds(30),
      layers: [props.playwrightLayer],
      bundling: {
        externalModules: ["@sparticuz/chromium", "playwright-core"],
        nodeModules: ["playwright-core"],
      },
      environment: {
        JOB_STORE_ENDPOINT: process.env.JOB_STORE_ENDPOINT || "",
        API_KEY: process.env.API_KEY || "",
      },
    });

    const alarmTopic = new Topic(this, `${id}-AlarmTopic`);
    alarmTopic.addSubscription(
      new EmailSubscription(process.env.MAIL_ADDRESS || ""),
    );

    const invocationMetric = new Metric({
      namespace: "AWS/Lambda",
      metricName: "Invocations",
      statistic: "Sum",
      period: Duration.hours(1),
      dimensionsMap: {
        FunctionName: this.extractThenTransformThenLoader.functionName,
      },
    });

    const alarm = new Alarm(this, `${id}-InvocationAlarm`, {
      metric: invocationMetric,
      threshold: 1000,
      evaluationPeriods: 1,
      alarmDescription: "scraping Lambda invocation count exceeded threshold",
    });

    alarm.addAlarmAction(new SnsAction(alarmTopic));
  }
}
