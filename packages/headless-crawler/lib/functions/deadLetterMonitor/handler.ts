import { SQSClient, GetQueueAttributesCommand, ReceiveMessageCommand } from "@aws-sdk/client-sqs";
import { Octokit } from "octokit";
import type { ScheduledEvent } from "aws-lambda";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

export const handler = async (_event: ScheduledEvent) => {
    console.log("デッドレターキューの監視を開始しました");

    const queueUrl = process.env.DEAD_LETTER_QUEUE_URL;
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

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
        const messageCount = Number.parseInt(response.Attributes?.ApproximateNumberOfMessages || "0");

        console.log(`デッドレターキューのメッセージ数: ${messageCount}`);

        if (messageCount > 0) {
            console.log(`⚠️  デッドレターキューに${messageCount}件のメッセージが見つかりました`);

            // デッドレターキューからメッセージの詳細を取得
            try {
                const receiveCommand = new ReceiveMessageCommand({
                    QueueUrl: queueUrl,
                    MaxNumberOfMessages: 10, // 最大10件取得
                    VisibilityTimeout: 30,   // 30秒間他の処理から見えなくする
                    WaitTimeSeconds: 1,      // ロングポーリング（1秒）
                    MessageAttributeNames: ["All"], // すべての属性を取得
                });

                const messages = await sqsClient.send(receiveCommand);

                if (messages.Messages && messages.Messages.length > 0) {
                    console.log(`📨 ${messages.Messages.length}件のメッセージを取得しました:`);

                    const errorDetails: string[] = [];

                    messages.Messages.forEach((message, index) => {
                        console.log(`\n--- メッセージ ${index + 1} ---`);
                        console.log("メッセージID:", message.MessageId);
                        console.log("メッセージ本文:", message.Body);

                        // エラー詳細を収集
                        let errorSummary = `### エラー ${index + 1}\n`;
                        errorSummary += `**メッセージID**: ${message.MessageId}\n`;

                        // システム属性
                        if (message.Attributes) {
                            console.log("  - 受信回数:", message.Attributes.ApproximateReceiveCount);
                            console.log("  - 送信時刻:", new Date(Number.parseInt(message.Attributes.SentTimestamp || "0")).toISOString());
                            errorSummary += `**リトライ回数**: ${message.Attributes.ApproximateReceiveCount}\n`;
                            errorSummary += `**送信時刻**: ${new Date(Number.parseInt(message.Attributes.SentTimestamp || "0")).toISOString()}\n`;
                        }

                        // メッセージ本文をJSONとしてパース
                        try {
                            const parsedBody = JSON.parse(message.Body || "");
                            if (parsedBody.errorMessage) {
                                console.log("🚨 エラー:", parsedBody.errorMessage);
                                errorSummary += `**エラー**: ${parsedBody.errorMessage}\n`;
                            }
                            if (parsedBody.errorType) {
                                console.log("🚨 タイプ:", parsedBody.errorType);
                                errorSummary += `**タイプ**: ${parsedBody.errorType}\n`;
                            }
                            errorSummary += `\n\`\`\`json\n${JSON.stringify(parsedBody, null, 2)}\n\`\`\`\n`;
                        } catch (e) {
                            console.error("メッセージ本文のパースエラー:", e);
                            // JSON形式でない場合はそのまま表示
                            errorSummary += `\n\`\`\`\n${message.Body}\n\`\`\`\n`;
                        }

                        errorDetails.push(errorSummary);
                    });

                    // GitHub Issue作成
                    if (githubToken && githubOwner && githubRepo) {
                        try {
                            const octokit = new Octokit({ auth: githubToken });

                            const title = `デッドレターキューエラー - ${new Date().toISOString().split('T')[0]} (${messages.Messages.length}件)`;
                            const body = `
## デッドレターキューエラーレポート

**日時**: ${new Date().toLocaleString('ja-JP')}  
**総メッセージ数**: ${messages.Messages.length}件

## エラー詳細

${errorDetails.join('\n')}

## 対応項目
- [ ] エラーの根本原因を調査する
- [ ] 根本的な問題を修正する  
- [ ] 失敗したメッセージの再処理を検討する
- [ ] 必要に応じてエラーハンドリングを更新する

---
*デッドレターキューモニターによる自動生成*
              `.trim();

                            const issue = await octokit.rest.issues.create({
                                owner: githubOwner,
                                repo: githubRepo,
                                title,
                                body,
                                labels: ['bug', 'dead-letter-queue', 'monitoring']
                            });

                            console.log(`✅ GitHub Issueを作成しました: ${issue.data.html_url}`);
                        } catch (error) {
                            console.error("❌ GitHub Issue作成エラー:", error);
                        }
                    } else {
                        console.log("⚠️  GitHub連携が設定されていません（トークン/オーナー/リポジトリが不足）");
                    }
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
