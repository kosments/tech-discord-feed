# Tech Discord Feed Automation

Tech系のニュース・リリース情報を自動収集し、Discordサーバーに通知するシステム

## 目的

- テックニュースの自動収集と整理
- Kubernetes/CloudのBreaking Changesの即時検知
- AIツール更新情報の把握
- セキュリティアドバイザリの共有
- Discord上でリアルタイムに情報収集

対象：SRE / Platform Engineer

## アーキテクチャ

```
┌─────────────────┐
│   RSS Feeds     │
│  (40+ sources)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  GitHub Actions Bot     │
│  - RSS fetch (15min)    │
│  - Diff check           │
│  - Filter (keyword)     │
│  - Deduplicate          │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────┐
│  Discord Webhook API │
│  (no external deps)  │
└────────┬─────────────┘
         │
         ▼
┌────────────────────────────┐
│   Discord Channels         │
│  - #ai-dev                 │
│  - #cloud-release          │
│  - #kubernetes             │
│  - #cncf-ecosystem         │
│  - #observability          │
│  - #security               │
│  - #engineering-news       │
│  - #trending-oss           │
└────────────────────────────┘
```

## 実装方法（無料構成）

### GitHub Actions + Deno Bot

**メリット**
- ✅ 完全無料（GitHub Actions無料枠内）
- ✅ 依存サービス不要
- ✅ カスタムフィルタ対応
- ✅ キーワード検索可能
- ✅ 重複投稿防止
- ✅ スケーラブル

**実装形式**
- Deno runtime（TypeScript）
- Cron: 15分ごと実行
- 状態管理: Gist/Git repository

## セットアップ手順

### 1. Discord Webhook作成

```
Server Settings
  → Integrations
  → Webhooks
  → New Webhook
  → Copy Webhook URL
```

Webhook URL形式: `https://discord.com/api/webhooks/{webhook_id}/{token}`

### 2. GitHub Repository設定

```bash
# Repository Secrets に設定
DISCORD_WEBHOOK_URL_AI=https://discord.com/api/webhooks/xxx
DISCORD_WEBHOOK_URL_CLOUD=https://discord.com/api/webhooks/xxx
# ... 各カテゴリーのWebhook
```

### 3. フィード・Webhook対応表

| カテゴリ | Channel | Webhook Secret |
|---------|---------|-----------------|
| AI | #ai-dev | `DISCORD_WEBHOOK_URL_AI` |
| Cloud | #cloud-release | `DISCORD_WEBHOOK_URL_CLOUD` |
| Kubernetes | #kubernetes | `DISCORD_WEBHOOK_URL_K8S` |
| CNCF | #cncf-ecosystem | `DISCORD_WEBHOOK_URL_CNCF` |
| Observability | #observability | `DISCORD_WEBHOOK_URL_OBS` |
| Security | #security | `DISCORD_WEBHOOK_URL_SEC` |
| Engineering | #engineering-news | `DISCORD_WEBHOOK_URL_ENG` |
| OSS Trending | #trending-oss | `DISCORD_WEBHOOK_URL_OSS` |

## RSS Feed 一覧

### AI (6 feeds)
- https://www.anthropic.com/news/rss.xml
- https://openai.com/blog/rss.xml
- https://blog.google/technology/ai/rss/
- https://cursor.sh/changelog/rss.xml
- https://github.blog/tag/copilot/feed/
- https://developers.googleblog.com/en/rss/

### Cloud (4 feeds)
**Google Cloud**
- https://cloud.google.com/feeds/gcp-release-notes.xml
- https://cloud.google.com/blog/rss/

**AWS**
- https://aws.amazon.com/new/feed/
- https://aws.amazon.com/blogs/aws/feed/

### Kubernetes (3 feeds)
- https://github.com/kubernetes/kubernetes/releases.atom
- https://kubernetes.io/feed.xml
- https://github.com/kubernetes/enhancements/releases.atom

### CNCF Ecosystem (6 feeds)
- https://www.cncf.io/feed/
- https://istio.io/latest/news/releases/index.xml
- https://github.com/helm/helm/releases.atom
- https://github.com/argoproj/argo-cd/releases.atom
- https://linkerd.io/feed/
- https://github.com/envoyproxy/envoy/releases.atom

### Observability (5 feeds)
- https://opentelemetry.io/feed.xml
- https://github.com/prometheus/prometheus/releases.atom
- https://github.com/grafana/grafana/releases.atom
- https://www.datadoghq.com/blog/rss.xml
- https://newrelic.com/blog/rss

### Security (4 feeds)
- https://github.com/kubernetes/kubernetes/security/advisories.atom
- https://tag-security.cncf.io/feed.xml
- https://security.googleblog.com/feeds/posts/default
- https://aws.amazon.com/blogs/security/feed/

### Engineering News (4 feeds)
- https://www.infoq.com/feed/
- https://hnrss.org/frontpage
- https://sreweekly.com/feed/
- https://lwkd.info/rss

### OSS Trending (3 feeds)
- https://github.com/trending.atom
- https://github.com/releases.atom
- https://landscape.cncf.io/feed.xml

**合計: 35 RSS Feeds**

## ディレクトリ構成

```
tech-discord-feed/
├── .github/
│   └── workflows/
│       └── rss-bot.yml           # GitHub Actions Workflow
├── src/
│   ├── bot.ts                    # メインロジック
│   ├── feeds.yaml                # フィード定義
│   ├── discord.ts                # Discord Webhook API
│   ├── rss-parser.ts             # RSS パーサー
│   └── deduplicator.ts           # 重複排除ロジック
├── deno.json                     # Deno設定
└── README.md
```

## 実装予定

- [ ] GitHub Actionsワークフロー作成
- [ ] Deno Bot実装（RSS fetch + parse）
- [ ] Discord Webhook統合
- [ ] 重複排除・フィルタ機構
- [ ] Webhook Secret設定
- [ ] テスト・デバッグ
- [ ] 本番運用開始

## 今後の拡張

- Slack連携
- Notion連携
- Telegram連携
- カスタムフィルタUI
- 購読管理機能

---

**コスト**: 0円（GitHub Actions 無料枠内）
**更新間隔**: 15分
**初期セットアップ**: 30分程度
