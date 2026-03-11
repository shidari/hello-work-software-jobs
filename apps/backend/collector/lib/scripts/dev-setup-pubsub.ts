/**
 * ローカル検証用: Pub/Sub エミュレータにトピック＆Push サブスクリプションを作成する。
 * docker-compose でサーバー起動前に自動実行される。
 * 本番環境では gcloud CLI でトピック・サブスクリプションを管理するため、このスクリプトは使わない。
 *
 * Usage:
 *   pnpm dev:setup-pubsub
 */

import { PubSub } from "@google-cloud/pubsub";

const projectId = "local-dev";
const topicName = "job-detail-queue";
const pushEndpoint = "http://collector:8080/pubsub/job-detail";
const subscriptionName = `${topicName}-sub`;

async function main() {
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);

  const [topicExists] = await topic.exists();
  if (!topicExists) {
    await pubsub.createTopic(topicName);
    console.log(`Created topic: ${topicName}`);
  } else {
    console.log(`Topic already exists: ${topicName}`);
  }

  const subscription = topic.subscription(subscriptionName);
  const [subExists] = await subscription.exists();
  if (!subExists) {
    await topic.createSubscription(subscriptionName, {
      pushEndpoint,
      ackDeadlineSeconds: 600,
    });
    console.log(`Created subscription: ${subscriptionName} → ${pushEndpoint}`);
  } else {
    console.log(`Subscription already exists: ${subscriptionName}`);
  }
}

main();
