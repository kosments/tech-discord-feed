import { parse } from "https://deno.land/std@0.208.0/yaml/mod.ts";

interface CategoryKeywords {
  priority?: string[];
  include?: string[];
}

interface FeedConfig {
  settings?: {
    max_per_run?: number;
  };
  feeds: Record<
    string,
    {
      webhook_env: string;
      sources: Array<{ url: string; name: string }>;
      keywords?: CategoryKeywords;
    }
  >;
  keywords?: CategoryKeywords;
}

interface RSSItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  guid?: string;
}

const STATE_FILE = ".feed_state.json";

async function getStateFile(): Promise<Map<string, string>> {
  try {
    const content = await Deno.readTextFile(STATE_FILE);
    const data = JSON.parse(content);
    return new Map(Object.entries(data));
  } catch {
    return new Map();
  }
}

async function saveStateFile(state: Map<string, string>): Promise<void> {
  const data = Object.fromEntries(state);
  await Deno.writeTextFile(STATE_FILE, JSON.stringify(data, null, 2));
}

function parseRSSDate(dateStr?: string): number {
  if (!dateStr) return 0;
  try {
    return new Date(dateStr).getTime();
  } catch {
    return 0;
  }
}

function getItemId(item: RSSItem): string {
  return item.guid || item.link || item.title || "";
}

function shouldIncludeItem(
  item: RSSItem,
  globalKeywords?: CategoryKeywords,
  categoryKeywords?: CategoryKeywords,
): boolean {
  if (!item.title) return false;

  const text = `${item.title} ${item.description || ""}`.toLowerCase();

  // グローバル優先度キーワード（どのチャネルも強制通過）
  const priorityList = [
    ...(globalKeywords?.priority || []),
    ...(categoryKeywords?.priority || []),
  ];
  for (const keyword of priorityList) {
    if (text.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  // チャネル固有のincludeキーワード（いずれかに一致すればOK）
  const includeList = categoryKeywords?.include || [];
  if (includeList.length > 0) {
    return includeList.some((kw) => text.includes(kw.toLowerCase()));
  }

  // includeキーワードなし = ソース自体で絞り込み済みなので通過
  return true;
}

async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const response = await fetch(url);
    const xml = await response.text();

    const items: RSSItem[] = [];

    // RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/);
      const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/);
      const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/);
      const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/);

      items.push({
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : undefined,
        link: linkMatch ? linkMatch[1].trim() : undefined,
        description: descMatch ? descMatch[1].replace(/<[^>]*>/g, "").substring(0, 200) : undefined,
        pubDate: pubDateMatch ? pubDateMatch[1] : undefined,
        guid: guidMatch ? guidMatch[1] : undefined,
      });
    }

    // Atom entries
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXml = match[1];

      const titleMatch = entryXml.match(/<title[^>]*>([\s\S]*?)<\/title>/);
      const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*>/);
      const summaryMatch = entryXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
      const publishedMatch = entryXml.match(/<published[^>]*>([\s\S]*?)<\/published>/);
      const updatedMatch = entryXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/);
      const idMatch = entryXml.match(/<id[^>]*>([\s\S]*?)<\/id>/);

      items.push({
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "").trim() : undefined,
        link: linkMatch ? linkMatch[1] : undefined,
        description: summaryMatch ? summaryMatch[1].replace(/<[^>]*>/g, "").substring(0, 200) : undefined,
        pubDate: publishedMatch ? publishedMatch[1] : updatedMatch ? updatedMatch[1] : undefined,
        guid: idMatch ? idMatch[1] : undefined,
      });
    }

    // 新しい順にソート
    items.sort((a, b) => parseRSSDate(b.pubDate) - parseRSSDate(a.pubDate));

    return items;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return [];
  }
}

async function sendDiscordMessage(webhookUrl: string, message: string): Promise<void> {
  try {
    const payload = {
      content: message,
      allowed_mentions: { parse: [] },
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Discord webhook error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Failed to send Discord message:", error.message);
  }
}

async function main() {
  const configYaml = await Deno.readTextFile("src/feeds.yaml");
  const config = parse(configYaml) as FeedConfig;

  const maxPerRun = config.settings?.max_per_run ?? 2;
  const state = await getStateFile();

  for (const [category, categoryConfig] of Object.entries(config.feeds)) {
    const webhookUrl = Deno.env.get(categoryConfig.webhook_env);
    if (!webhookUrl) {
      console.warn(`Missing environment variable: ${categoryConfig.webhook_env}`);
      continue;
    }

    console.log(`Processing ${category}...`);

    let sentCount = 0;

    // 全ソースのアイテムを収集して日付順にまとめてから送信する
    const allItems: Array<{ item: RSSItem; sourceName: string }> = [];

    for (const source of categoryConfig.sources) {
      const items = await fetchRSSFeed(source.url);
      for (const item of items) {
        allItems.push({ item, sourceName: source.name });
      }
    }

    // 全体を新しい順にソート
    allItems.sort((a, b) => parseRSSDate(b.item.pubDate) - parseRSSDate(a.item.pubDate));

    for (const { item, sourceName } of allItems) {
      if (sentCount >= maxPerRun) break;

      const itemId = getItemId(item);
      if (!itemId) continue;

      const stateKey = `${category}:${itemId}`;
      if (state.has(stateKey)) continue;

      if (!shouldIncludeItem(item, config.keywords, categoryConfig.keywords)) {
        // 未読としてマーク（再度フィルタされないよう）
        state.set(stateKey, new Date().toISOString());
        continue;
      }

      const message = formatDiscordMessage(item, sourceName, category);
      await sendDiscordMessage(webhookUrl, message);
      console.log(`Sent [${category}]: ${item.title}`);

      state.set(stateKey, new Date().toISOString());
      sentCount++;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`  → ${sentCount} item(s) sent for ${category}`);
  }

  // 7日より古いステートを削除
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [key, value] of state.entries()) {
    try {
      if (new Date(value).getTime() < sevenDaysAgo) {
        state.delete(key);
      }
    } catch {
      state.delete(key);
    }
  }

  await saveStateFile(state);
  console.log("Done!");
}

function formatDiscordMessage(item: RSSItem, sourceName: string, category: string): string {
  const title = item.title || "No title";
  const link = item.link || "";
  const description = item.description ? item.description.substring(0, 200) : "";

  const categoryEmoji: Record<string, string> = {
    qiita: "🟩",
    zenn: "📘",
    googlecloud: "☁️",
    gke: "⚙️",
    k8s: "☸️",
    cncf: "📦",
    newrelic: "📊",
    hackernews: "🔥",
    bytebytego: "🏗️",
    medium: "📝",
    apigeex: "🔌",
    glb: "🌐",
    akamai: "🛡️",
    fastly: "⚡",
    cloudflare: "🟠",
  };

  const emoji = categoryEmoji[category] ?? "📰";

  let message = `${emoji} **[${sourceName}]** ${title}`;
  if (link) {
    message += `\n${link}`;
  }
  if (description) {
    message += `\n> ${description}`;
  }

  return message;
}

if (import.meta.main) {
  main().catch(console.error);
}
