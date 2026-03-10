/**
 * RSS フィード取得デバッグスクリプト
 * 各フィードが正しく取得できているか確認
 */

import { parse } from "https://deno.land/std@0.208.0/yaml/mod.ts";

interface FeedConfig {
  feeds: Record<
    string,
    {
      webhook_env: string;
      sources: Array<{ url: string; name: string }>;
    }
  >;
}

async function fetchAndAnalyze(url: string): Promise<void> {
  try {
    console.log(`\n📡 Fetching: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return;
    }

    const text = await response.text();
    const size = text.length;

    // アイテム数をカウント
    const itemCount = (text.match(/<item>/g) || []).length;
    const entryCount = (text.match(/<entry>/g) || []).length;
    const totalItems = itemCount + entryCount;

    console.log(`✅ Status ${response.status}`);
    console.log(`   Size: ${(size / 1024).toFixed(2)} KB`);
    console.log(`   Items: ${itemCount}, Entries: ${entryCount} (Total: ${totalItems})`);

    if (totalItems === 0) {
      console.log(`   ⚠️  No items found in feed`);
    }
  } catch (error) {
    console.log(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function main() {
  console.log("🔍 RSS Feed Debug Analysis\n");
  console.log("=".repeat(60));

  const configYaml = await Deno.readTextFile("src/feeds.yaml");
  const config = parse(configYaml) as FeedConfig;

  for (const [category, categoryConfig] of Object.entries(config.feeds)) {
    console.log(`\n🏷️  Category: ${category.toUpperCase()}`);
    console.log("-".repeat(60));

    for (const source of categoryConfig.sources) {
      await fetchAndAnalyze(source.url);
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Debug analysis complete");
}

if (import.meta.main) {
  main().catch(console.error);
}
