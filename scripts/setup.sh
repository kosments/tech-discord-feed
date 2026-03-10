#!/bin/bash

# Tech Discord Feed Bot 統合セットアップスクリプト
#
# このスクリプトは以下を自動実行します:
# 1. Discord チャンネル＆Webhook 作成
# 2. GitHub Secrets 登録
# 3. Git push
# 4. ローカルテスト

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "================================"
echo "Tech Discord Feed Bot セットアップ"
echo "================================"
echo ""

# Step 1: 環境変数の確認
echo "📋 Step 1: 環境変数の確認"
echo ""

if [ -z "$DISCORD_BOT_TOKEN" ]; then
    echo "❌ DISCORD_BOT_TOKEN が設定されていません"
    echo ""
    echo "以下の手順で設定してください:"
    echo "1. DISCORD_BOT_SETUP.md を読む"
    echo "2. Bot Token を取得"
    echo "3. 環境変数を設定:"
    echo "   export DISCORD_BOT_TOKEN=your_token"
    echo "   export DISCORD_GUILD_ID=your_guild_id"
    exit 1
fi

if [ -z "$DISCORD_GUILD_ID" ]; then
    echo "❌ DISCORD_GUILD_ID が設定されていません"
    echo "   export DISCORD_GUILD_ID=your_guild_id"
    exit 1
fi

echo "✅ DISCORD_BOT_TOKEN: ${DISCORD_BOT_TOKEN:0:20}..."
echo "✅ DISCORD_GUILD_ID: $DISCORD_GUILD_ID"
echo ""

# Step 2: Discord セットアップ
echo "📋 Step 2: Discord チャンネル＆Webhook 作成"
echo ""

if [ -f "discord-secrets.json" ]; then
    echo "⚠️  discord-secrets.json が既に存在します"
    read -p "上書きしますか？ (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm discord-secrets.json
        deno run --allow-net --allow-env src/setup-discord.ts
    fi
else
    deno run --allow-net --allow-env src/setup-discord.ts
fi

echo ""

# Step 3: GitHub Secrets 登録
echo "📋 Step 3: GitHub Secrets 登録"
echo ""

if command -v gh &> /dev/null; then
    read -p "GitHub CLI で自動登録しますか？ (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        chmod +x src/setup-github-secrets.sh
        ./src/setup-github-secrets.sh
    else
        echo "手動で以下の内容を登録してください:"
        echo "  GitHub → Repository Settings → Secrets and variables → Actions"
        cat discord-secrets.json | jq '.'
    fi
else
    echo "⚠️  GitHub CLI がインストールされていません"
    echo "手動で以下の内容を登録してください:"
    echo "  GitHub → Repository Settings → Secrets and variables → Actions"
    cat discord-secrets.json | jq '.'
fi

echo ""

# Step 4: ローカルテスト
echo "📋 Step 4: ローカルテスト"
echo ""

read -p "ローカルで Bot を実行してテストしますか？ (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    deno run --allow-net --allow-env --allow-read --allow-write src/bot.ts
fi

echo ""

# Step 5: Git push
echo "📋 Step 5: GitHub にプッシュ"
echo ""

if ! git remote get-url origin &> /dev/null; then
    echo "⚠️  リモートリポジトリが設定されていません"
    echo ""
    echo "GitHub でリポジトリを作成してから以下を実行してください:"
    echo "  git remote add origin https://github.com/{your-username}/tech-discord-feed.git"
    echo "  git branch -M main"
    echo "  git push -u origin main"
else
    read -p "GitHub にプッシュしますか？ (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push -u origin main
        echo "✅ GitHub Actions が有効になりました"
        echo "   https://github.com/{your-username}/tech-discord-feed/actions"
    fi
fi

echo ""
echo "================================"
echo "✅ セットアップ完了！"
echo "================================"
echo ""
echo "次のステップ:"
echo "1. Discord チャンネルを確認"
echo "2. GitHub Actions の実行を確認"
echo "3. ドキュメントを読む (README.md, QUICKSTART.md)"
echo ""
