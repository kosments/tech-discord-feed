#!/bin/bash

# GitHub Secrets 自動登録スクリプト
#
# 使用方法:
# chmod +x src/setup-github-secrets.sh
# ./src/setup-github-secrets.sh

set -e

SECRETS_FILE="discord-secrets.json"

if [ ! -f "$SECRETS_FILE" ]; then
    echo "❌ Error: $SECRETS_FILE が見つかりません。"
    echo "先に setup-discord.ts を実行してください:"
    echo "  deno run --allow-net --allow-env src/setup-discord.ts"
    exit 1
fi

echo "🔐 GitHub Secrets 自動登録開始"
echo ""

# 現在のリポジトリ情報を確認
REPO=$(git config --get remote.origin.url | sed 's/.*[:/]\([^/]*\)\/\([^.]*\)\.git/\1\/\2/')
echo "Repository: $REPO"
echo ""

# JSON から Secrets を読み込んで登録
jq -r 'to_entries[] | "\(.key)=\(.value)"' "$SECRETS_FILE" | while read line; do
    KEY=$(echo "$line" | cut -d'=' -f1)
    VALUE=$(echo "$line" | cut -d'=' -f2-)

    echo "📝 Registering: $KEY"

    # gh CLI で Secrets を登録
    echo "$VALUE" | gh secret set "$KEY" --repo "$REPO"

    echo "✅ $KEY registered"
    echo ""
done

echo "🎉 All secrets registered successfully!"
echo ""
echo "次のステップ:"
echo "1. GitHub Repository Settings で Secrets を確認"
echo "2. ローカルテスト: deno run --allow-net --allow-env --allow-read --allow-write src/bot.ts"
echo "3. Git Push して GitHub Actions を実行"
