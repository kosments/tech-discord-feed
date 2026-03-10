# 🚀 クイックスタート

Tech Discord Feed Bot を 5 分で運用開始するガイド

## 前提条件

- Deno をインストール: https://deno.land/
- GitHub CLI (`gh`) をインストール: https://cli.github.com/
- Discord サーバー（管理者権限）
- GitHub アカウント

## Step 1: Discord Bot Token & Guild ID を取得 (5分)

### 1-1. Discord Bot を作成

詳細は `DISCORD_BOT_SETUP.md` を参照

必要な情報：
```bash
export DISCORD_BOT_TOKEN="your_bot_token_here"
export DISCORD_GUILD_ID="your_guild_id_here"
```

## Step 2: Discord チャンネル＆Webhook を自動作成 (1分)

```bash
# チャンネルと Webhook を自動作成
deno run --allow-net --allow-env src/setup-discord.ts
```

**出力例:**
```
✅ Created channel: #ai-dev
✅ Created webhook for tech-feed-ai
  Webhook URL: DISCORD_WEBHOOK_URL_AI=https://discord.com/api/webhooks/...
...
```

これで `discord-secrets.json` が生成されます。

## Step 3: GitHub Repository を作成 (2分)

```bash
# GitHub で新しいリポジトリを作成
# https://github.com/new
# リポジトリ名: tech-discord-feed

# ローカルリポジトリをリモートに接続
git remote add origin https://github.com/{your-username}/tech-discord-feed.git
git branch -M main
git push -u origin main
```

## Step 4: GitHub Secrets を登録 (1分)

### 方法1: 自動登録（推奨）

```bash
# GitHub CLI で自動登録
chmod +x src/setup-github-secrets.sh
./src/setup-github-secrets.sh
```

### 方法2: 手動登録

GitHub Repository Settings → Secrets and variables → Actions → New repository secret

`discord-secrets.json` の内容を手動で登録

**登録する内容:**
```
DISCORD_WEBHOOK_URL_AI=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_CLOUD=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_K8S=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_CNCF=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_OBS=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_SEC=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_ENG=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_URL_OSS=https://discord.com/api/webhooks/...
```

## Step 5: ローカルテスト (1分)

```bash
# ローカルで Bot を実行
deno run --allow-net --allow-env --allow-read --allow-write src/bot.ts
```

**期待される動作:**
- `.feed_state.json` が生成される
- Discord チャンネルにテスト投稿が流れる
- コンソールにログが表示される

## Step 6: GitHub Actions で自動化開始 (0分)

Push すると自動で Actions が有効になります。

```bash
git status
git push  # すでに push 済みなら不要
```

### 実行確認

1. GitHub → Actions タブ
2. "Tech RSS Bot" ワークフローを確認
3. 15分ごとに自動実行

## トラブルシューティング

### Discord API エラー
```
⚠️ エラーが発生しました:
  - Bot がサーバーに参加していない
  - トークンが無効
```

**解決:**
- Bot を招待し直す（`DISCORD_BOT_SETUP.md` 参照）
- Token を確認

### GitHub Secrets エラー
```
Discord webhook error: 404
```

**解決:**
- Secrets 名が正しいか確認
- Webhook URL が有効か確認

### Deno エラー
```
error: Uncaught PermissionDenied
```

**解決:**
```bash
# 必要なパーミッションを指定
deno run --allow-net --allow-env --allow-read --allow-write src/bot.ts
```

## 次のステップ

- ✅ [カスタマイズ](./README.md#カスタマイズ) - フィード追加、キーワード変更
- ✅ [ドキュメント](./SETUP.md) - 詳細なセットアップガイド
- ✅ [実装詳細](./IMPLEMENTATION.md) - 技術的な詳細

---

**完全に運用開始するのに要する時間: 約 10分**

何かエラーが出たら、GitHub Issues で報告してください！
