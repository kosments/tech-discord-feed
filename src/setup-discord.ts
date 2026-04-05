/**
 * Discord チャンネル＆Webhook自動セットアップスクリプト
 *
 * 使用方法:
 * deno run --allow-net --allow-env src/setup-discord.ts
 *
 * 必要な環境変数:
 * - DISCORD_BOT_TOKEN: Bot トークン
 * - DISCORD_GUILD_ID: サーバーID
 */

const DISCORD_API_BASE = "https://discord.com/api/v10";
const CHANNELS_CONFIG = [
  { name: "qiita",       description: "Qiita - SRE / Kubernetes / GCP 記事" },
  { name: "zenn",        description: "Zenn - SRE / Kubernetes / GoogleCloud 記事" },
  { name: "googlecloud", description: "Google Cloud Release Notes & Blog" },
  { name: "gke",         description: "Google Kubernetes Engine Release Notes" },
  { name: "k8s",         description: "Kubernetes Releases, Blog & Enhancements" },
  { name: "cncf",        description: "CNCF / Helm / ArgoCD / Istio / Envoy / Prometheus" },
  { name: "newrelic",    description: "New Relic Blog & Releases" },
  { name: "hackernews",  description: "Hacker News (SRE / Infra filter)" },
  { name: "bytebytego",  description: "ByteByteGo - System Design" },
  { name: "medium",      description: "Medium Engineering Blogs" },
  { name: "apigeex",     description: "Apigee X Release Notes" },
  { name: "glb",         description: "Cloud Load Balancing / Armor / CDN" },
  { name: "akamai",      description: "Akamai Blog" },
  { name: "fastly",      description: "Fastly Blog" },
  { name: "cloudflare",  description: "Cloudflare Blog" },
];

interface Channel {
  id: string;
  name: string;
}

interface Webhook {
  id: string;
  token: string;
  name: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = Deno.env.get("DISCORD_BOT_TOKEN");
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required");
  }

  return {
    "Authorization": `Bot ${token}`,
    "Content-Type": "application/json",
  };
}

async function createChannel(
  guildId: string,
  name: string,
  description: string,
): Promise<Channel> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${DISCORD_API_BASE}/guilds/${guildId}/channels`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name,
        type: 0, // GUILD_TEXT
        topic: description,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    console.error(`Failed to create channel ${name}:`, error);
    throw new Error(`Failed to create channel: ${response.statusText}`);
  }

  const channel = await response.json();
  console.log(`✅ Created channel: #${channel.name} (${channel.id})`);

  return { id: channel.id, name: channel.name };
}

async function createWebhook(
  channelId: string,
  webhookName: string,
): Promise<Webhook> {
  const headers = await getAuthHeaders();

  const response = await fetch(
    `${DISCORD_API_BASE}/channels/${channelId}/webhooks`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: webhookName,
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    console.error(`Failed to create webhook for channel ${channelId}:`, error);
    throw new Error(`Failed to create webhook: ${response.statusText}`);
  }

  const webhook = await response.json();
  console.log(`✅ Created webhook for ${webhookName}`);

  return {
    id: webhook.id,
    token: webhook.token,
    name: webhook.name,
  };
}

function getWebhookUrl(webhook: Webhook): string {
  return `https://discord.com/api/webhooks/${webhook.id}/${webhook.token}`;
}

async function main() {
  const guildId = Deno.env.get("DISCORD_GUILD_ID");
  if (!guildId) {
    throw new Error("DISCORD_GUILD_ID environment variable is required");
  }

  console.log("🤖 Discord Setup: Channel & Webhook Creation");
  console.log(`Guild ID: ${guildId}\n`);

  const webhooks: Record<string, string> = {};
  const errors: string[] = [];

  for (const channelConfig of CHANNELS_CONFIG) {
    try {
      const channel = await createChannel(
        guildId,
        channelConfig.name,
        channelConfig.description,
      );

      const webhook = await createWebhook(
        channel.id,
        `tech-feed-${channelConfig.name}`,
      );

      const envVarName = `DISCORD_WEBHOOK_URL_${channelConfig.name.toUpperCase()}`;
      webhooks[envVarName] = getWebhookUrl(webhook);

      console.log(`  Env: ${envVarName}\n`);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      errors.push(
        `${channelConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📋 GitHub Secrets に登録する内容:\n");

  for (const [key, url] of Object.entries(webhooks)) {
    console.log(`${key}=${url}`);
  }

  console.log("\n" + "=".repeat(60));

  if (errors.length > 0) {
    console.error("\n⚠️ エラーが発生しました:\n");
    errors.forEach((err) => console.error(`  - ${err}`));
  }

  console.log(
    "\n✅ セットアップ完了！\n" +
    "上記の Secrets を GitHub Repository に登録してください。\n" +
    "手順: Settings → Secrets and variables → Actions → New repository secret",
  );

  const secretsFile = "discord-secrets.json";
  await Deno.writeTextFile(secretsFile, JSON.stringify(webhooks, null, 2));
  console.log(`\nJSON形式で ${secretsFile} に保存されました。`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Fatal error:", error.message);
    Deno.exit(1);
  });
}
