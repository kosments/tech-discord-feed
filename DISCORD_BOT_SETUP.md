# Discord Bot 作成ガイド

## Step 1: Discord Developer Portal でBot作成

### 1-1. Developer Portal にアクセス

https://discord.com/developers/applications

### 1-2. New Application を作成

1. "New Application" ボタンをクリック
2. アプリケーション名を入力（例: `tech-feed-bot`）
3. "Create" をクリック

### 1-3. Bot を作成

1. 左メニュー → "Bot"
2. "Add Bot" をクリック
3. Bot が作成される

### 1-4. Bot Token を取得

1. Bot ページで "TOKEN" セクションを探す
2. "Copy" ボタンをクリック
3. **以下に保存（絶対に誰にも共有しないこと！）**:
```
DISCORD_BOT_TOKEN=your_bot_token_here
```

### 1-5. Bot Permissions を設定

1. Bot ページで下にスクロール
2. "SCOPES" セクション：
   - ☑️ `bot` を選択

3. "PERMISSIONS" セクション：
   - ☑️ Send Messages
   - ☑️ Manage Channels
   - ☑️ Manage Webhooks
   - ☑️ Read Message History

4. 下の "Copy" ボタンで OAuth2 URL をコピー

### 1-6. Discord サーバーに Bot を招待

1. 上記の OAuth2 URL をブラウザで開く
2. Bot を追加したいサーバーを選択
3. "Authorize" をクリック

## Step 2: Guild ID（サーバーID）を取得

### 2-1. Developer Mode を有効化

Discord:
1. User Settings → Advanced → Developer Mode を ON
2. ウィンドウを閉じる

### 2-2. Guild ID をコピー

1. サーバー名を右クリック
2. "Copy Server ID" をクリック
3. **以下に保存**:
```
DISCORD_GUILD_ID=your_guild_id_here
```

または

1. Discord URL から取得
   - サーバーをクリック後、URL: `https://discord.com/channels/{guild_id}/...`
   - `{guild_id}` の部分がサーバーID

## Step 3: 認証情報の確認

取得すべき情報：

```bash
DISCORD_BOT_TOKEN=xxxxxxxxxxxxxxxxxxxx
DISCORD_GUILD_ID=xxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # GitHub Personal Access Token
```

---

## 次ステップ

`setup-discord.ts` スクリプトに上記の情報を提供して、
自動でチャンネル＋Webhook作成を実行。
