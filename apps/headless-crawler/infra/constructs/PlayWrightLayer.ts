// constructs/lambda-construct.ts
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class PlayWrightLayerConstruct extends Construct {
    public readonly layer: lambda.LayerVersion;
    constructor(scope: Construct, id: string) {
        super(scope, id);
        this.layer = new lambda.LayerVersion(this, "playwrightLayer", {
            code: lambda.Code.fromAsset("functions/layer/playwright.zip"),
            compatibleRuntimes: [lambda.Runtime.NODEJS_22_X],
        });
    }
}