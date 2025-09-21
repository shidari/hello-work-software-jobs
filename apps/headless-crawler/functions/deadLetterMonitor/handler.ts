import {
  SQSClient,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";
import type { ScheduledEvent } from "aws-lambda";
import { createBugIssue } from "./helper";

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler = async (_event: ScheduledEvent) => {
  console.log("デッドレターキューの監視を開始しました");

  const queueUrl = process.env.DEAD_LETTER_QUEUE_URL;

  if (!queueUrl) {
    console.error("DEAD_LETTER_QUEUE_URL環境変数が設定されていません");
    return;
  }

  try {
    // SQSキューの属性を取得（メッセージ数をチェック）
    const command = new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ["ApproximateNumberOfMessages"],
    });

    const response = await sqsClient.send(command);
    const messageCount = Number.parseInt(
      response.Attributes?.ApproximateNumberOfMessages || "0",
    );

    console.log(`デッドレターキューのメッセージ数: ${messageCount}`);

    if (messageCount > 0) {
      console.log(
        `⚠️  デッドレターキューに${messageCount}件のメッセージが見つかりました`,
      );

      // デッドレターキューからメッセージの詳細を取得
      try {
        const receiveCommand = new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: 10, // 最大10件取得
          VisibilityTimeout: 30, // 30秒間他の処理から見えなくする
          WaitTimeSeconds: 1, // ロングポーリング（1秒）
          MessageAttributeNames: ["All"], // すべての属性を取得
        });

        const messages = await sqsClient.send(receiveCommand);

        if (messages.Messages && messages.Messages.length > 0) {
          console.log(
            `📨 ${messages.Messages.length}件のメッセージを取得しました:`,
          );

          const errorDetails = messages.Messages.map((message, index) => {
            console.log(`\n--- メッセージ ${index + 1} ---`);
            console.log("メッセージID:", message.MessageId);
            console.log("メッセージ本文:", message.Body);

            // エラー詳細を収集
            const basicInfo = [
              `### エラー ${index + 1}`,
              `**メッセージID**: ${message.MessageId}`,
            ];

            // システム属性
            const systemAttributes = message.Attributes
              ? [
                  `**リトライ回数**: ${message.Attributes.ApproximateReceiveCount}`,
                  `**送信時刻**: ${new Date(Number.parseInt(message.Attributes.SentTimestamp || "0")).toISOString()}`,
                ]
              : [];

            if (message.Attributes) {
              console.log(
                "  - 受信回数:",
                message.Attributes.ApproximateReceiveCount,
              );
              console.log(
                "  - 送信時刻:",
                new Date(
                  Number.parseInt(message.Attributes.SentTimestamp || "0"),
                ).toISOString(),
              );
            }

            // メッセージ本文をJSONとしてパース
            const messageDetails = (() => {
              try {
                const parsedBody = JSON.parse(message.Body || "") as any;

                const jobIdDetail = parsedBody?.job?.id
                  ? (() => {
                      console.log("📋 Job ID:", parsedBody.job.id);
                      return `**Job ID**: ${parsedBody.job.id}`;
                    })()
                  : null;

                const errorMessageDetail = parsedBody.errorMessage
                  ? (() => {
                      console.log("🚨 エラー:", parsedBody.errorMessage);
                      return `**エラー**: ${parsedBody.errorMessage}`;
                    })()
                  : null;

                const errorTypeDetail = parsedBody.errorType
                  ? (() => {
                      console.log("🚨 タイプ:", parsedBody.errorType);
                      return `**タイプ**: ${parsedBody.errorType}`;
                    })()
                  : null;

                const jsonDetail = `\n\`\`\`json\n${JSON.stringify(parsedBody, null, 2)}\n\`\`\`\n`;

                return [
                  jobIdDetail,
                  errorMessageDetail,
                  errorTypeDetail,
                  jsonDetail,
                ].filter(Boolean);
              } catch (e) {
                console.error("メッセージ本文のパースエラー:", e);
                // JSON形式でない場合はそのまま表示
                return [`\n\`\`\`\n${message.Body}\n\`\`\`\n`];
              }
            })();

            const errorSummary = [
              ...basicInfo,
              ...systemAttributes,
              ...messageDetails,
            ].join("\n");

            return errorSummary;
          });

          try {
            const title = `デッドレターキューエラー - ${new Date().toISOString().split("T")[0]} (${messages.Messages.length}件)`;

            await createBugIssue({
              title,
              errorLog: errorDetails.join("\n---\n"),
            });
          } catch (error) {
            console.error("❌ GitHub Issue作成エラー:", error);
          }
        } else {
          console.log(
            "⚠️  GitHub連携が設定されていません（トークン/オーナー/リポジトリが不足）",
          );
        }
      } catch (error) {
        console.error("メッセージ取得エラー:", error);
      }
    } else {
      console.log("✅ デッドレターキューにメッセージはありません");
    }

    return {
      statusCode: 200,
      messageCount,
    };
  } catch (error) {
    console.error("デッドレターキュー監視エラー:", error);
    throw error;
  }
};
