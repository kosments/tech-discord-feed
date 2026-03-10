# Setup Guide - Tech Discord Feed Bot

## 必須環境

- GitHub アカウント
- Discord サーバー（管理者権限）
- Git

## ステップ1: Discord Webhook作成

各チャンネルごとにWebhookを作成します。

### 1-1. チャンネル作成（未作成の場合）

Discord Server Settings で以下のテキストチャンネルを作成：
- `#ai-dev`
- `#cloud-release`
- `#kubernetes`
- `#cncf-ecosystem`
- `#observability`
- `#security`
- `#engineering-news`
- `#trending-oss`

### 1-2. Webhook作成

各チャンネルで以下を実行：

1. Channel Settings → Integrations → Webhooks
2. "New Webhook" をクリック
3. 名前を設定（例: `tech-feed-ai`）
4. Copy Webhook URL をクリック
5. 以下の形式で保存：
```
https://discord.com/api/webhooks/{webhook_id}/{token}
```

### 1-3. Webhook URL一覧

作成したURLを以下にメモしておく：

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

## ステップ2: GitHub Repository セットアップ

### 2-1. リポジトリ作成

```bash
mkdir tech-discord-feed
cd tech-discord-feed
git init
git add .
git commit -m "Initial commit: Tech Discord Feed Bot"
git branch -M main
# GitHub上でリポジトリを作成後
git remote add origin https://github.com/{your-username}/tech-discord-feed.git
git push -u origin main
```

### 2-2. Secrets 設定

GitHub Repository Settings → Secrets and variables → Actions → New repository secret

以下の8つを登録：

| Secret Name | Value |
|------------|-------|
| `DISCORD_WEBHOOK_URL_AI` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_CLOUD` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_K8S` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_CNCF` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_OBS` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_SEC` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_ENG` | [1-2で取得したURL] |
| `DISCORD_WEBHOOK_URL_OSS` | [1-2で取得したURL] |

## ステップ3: ローカルテスト

### 3-1. Denoをインストール

```bash
curl -fsSL https://deno.land/install.sh | sh
```

### 3-2. 環境変数設定

```bash
export DISCORD_WEBHOOK_URL_AI="https://discord.com/api/webhooks/..."
export DISCORD_WEBHOOK_URL_CLOUD="https://discord.com/api/webhooks/..."
# ... 他のWebhook URLも設定
```

### 3-3. ローカルで実行

```bash
deno run --allow-net --allow-env --allow-read --allow-write src/bot.ts
```

結果を確認：
- `.feed_state.json` が生成される（新規フィードを追跡）
- Discordに投稿が流れてくる

## ステップ4: GitHub Actions 実行

### 4-1. Workflow トリガー

以下のいずれかで実行：

**自動実行**（15分ごと）
- GitHub Actions → Tech RSS Bot → Workflow dispatch で手動実行可能

**手動実行**
- Actions タブ → "Tech RSS Bot" → "Run workflow"

### 4-2. ログ確認

- Actions タブ → 実行中のワークフロー → "rss-feed" ジョブ
- 詳細は "Run RSS Bot" ステップで確認

## ステップ5: カスタマイズ

### 5-1. フィード追加

`src/feeds.yaml` に新しいソースを追加：

```yaml
  your-category:
    webhook_env: DISCORD_WEBHOOK_URL_CUSTOM
    sources:
      - url: https://example.com/feed.xml
        name: Example Feed
```

### 5-2. キーワードフィルタ変更

`src/feeds.yaml` の `keywords` セクションを編集：

```yaml
keywords:
  priority:
    - "Breaking Change"
    - "Critical Patch"
  include:
    - "Kubernetes"
```

### 5-3. 更新間隔変更

`.github/workflows/rss-bot.yml` のcron式を変更：

```yaml
schedule:
  - cron: "0 */2 * * *"  # 2時間ごと
  - cron: "0 9 * * *"    # 毎日9時
```

## トラブルシューティング

### Webhook エラー
```
Discord webhook error: 404
```
→ Webhook URLが正しいか、削除されていないか確認

### フィード取得エラー
```
Failed to fetch https://example.com/feed.xml
```
→ URLが正しい、アクセス可能か確認

### GitHub Actions が実行されない
→ Actions タブで "Enable" を確認

## 動作確認チェックリスト

- [ ] 8つのDiscordチャンネルを作成
- [ ] 8つのWebhook URLを生成
- [ ] GitHub Secrets に8つ登録
- [ ] ローカルテスト成功
- [ ] Discordに投稿が流れている
- [ ] GitHub Actions が15分ごとに実行
- [ ] `.feed_state.json` が更新される
- [ ] 重複投稿がない

## 今後の改善

- [ ] メッセージテンプレートのカスタマイズ
- [ ] 重複排除ロジック改善
- [ ] エラー通知機能
- [ ] Webhook再試行機構
- [ ] ユーザーフィードバック機能
