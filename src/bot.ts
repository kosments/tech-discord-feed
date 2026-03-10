import { parse } from "https://deno.land/std@0.208.0/yaml/mod.ts";

interface FeedConfig {
  feeds: Record<
    string,
    {
      webhook_env: string;
      sources: Array<{ url: string; name: string }>;
    }
  >;
  keywords?: {
    priority?: string[];
    include?: string[];
  };
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
  if (!dateStr) return Date.now();
  try {
    return new Date(dateStr).getTime();
  } catch {
    return Date.now();
  }
}

function getItemId(item: RSSItem): string {
  return item.guid || item.link || item.title || "";
}

function shouldIncludeItem(item: RSSItem, keywords?: { priority?: string[]; include?: string[] }): boolean {
  if (!item.title) return false;

  const text = `${item.title} ${item.description || ""}`.toLowerCase();

  // 優先度キーワードをチェック
  if (keywords?.priority) {
    for (const keyword of keywords.priority) {
      if (text.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }

  // 除外キーワードをチェック
  if (keywords?.include) {
    for (const keyword of keywords.include) {
      if (!text.includes(keyword.toLowerCase())) {
        return false;
      }
    }
  }

  return true;
}

async function fetchRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    const response = await fetch(url);
    const xml = await response.text();

    // Simple XML parsing for RSS/Atom feeds
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
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "") : undefined,
        link: linkMatch ? linkMatch[1] : undefined,
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
      const idMatch = entryXml.match(/<id[^>]*>([\s\S]*?)<\/id>/);

      items.push({
        title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, "") : undefined,
        link: linkMatch ? linkMatch[1] : undefined,
        description: summaryMatch ? summaryMatch[1].replace(/<[^>]*>/g, "").substring(0, 200) : undefined,
        pubDate: publishedMatch ? publishedMatch[1] : undefined,
        guid: idMatch ? idMatch[1] : undefined,
      });
    }

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
  // Load configuration
  const configYaml = await Deno.readTextFile("src/feeds.yaml");
  const config = parse(configYaml) as FeedConfig;

  // Load state
  const state = await getStateFile();

  // Process each category
  for (const [category, categoryConfig] of Object.entries(config.feeds)) {
    const webhookUrl = Deno.env.get(categoryConfig.webhook_env);
    if (!webhookUrl) {
      console.warn(`Missing environment variable: ${categoryConfig.webhook_env}`);
      continue;
    }

    console.log(`Processing ${category}...`);

    for (const source of categoryConfig.sources) {
      const items = await fetchRSSFeed(source.url);

      for (const item of items) {
        const itemId = getItemId(item);
        if (!itemId) continue;

        const stateKey = `${category}:${itemId}`;
        if (state.has(stateKey)) {
          continue; // Already processed
        }

        // Filter items by keywords
        if (!shouldIncludeItem(item, config.keywords)) {
          continue;
        }

        // Send to Discord
        const message = formatDiscordMessage(item, source.name, category);
        await sendDiscordMessage(webhookUrl, message);
        console.log(`Sent: ${item.title}`);

        // Mark as processed
        state.set(stateKey, new Date().toISOString());

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  // Clean up old state entries (older than 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [key, value] of state.entries()) {
    try {
      if (new Date(value).getTime() < sevenDaysAgo) {
        state.delete(key);
      }
    } catch {
      // Invalid date format, delete it
      state.delete(key);
    }
  }

  // Save state
  await saveStateFile(state);
  console.log("Done!");
}

function formatDiscordMessage(item: RSSItem, sourceName: string, category: string): string {
  const title = item.title || "No title";
  const link = item.link || "";
  const description = item.description ? item.description.substring(0, 200) : "";

  const categoryEmoji = {
    ai: "🤖",
    cloud: "☁️",
    kubernetes: "☸️",
    cncf: "📦",
    observability: "📊",
    security: "🔒",
    engineering: "⚙️",
    oss: "🚀",
  };

  const emoji = categoryEmoji[category as keyof typeof categoryEmoji] || "📰";

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
