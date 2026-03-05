# デプロイ手順

## 前提

- ホスティング: Vercel
- Firebase: Auth + Firestore のみ使用（Firebase Hosting / Functions は使用しない）
- Firebase CLI がインストール済み（`npm install -g firebase-tools`）

---

## 1. Vercel 環境変数の設定

Vercel ダッシュボード（Project Settings > Environment Variables）またはVercel CLI で設定する。

### サーバーサイド変数（Encrypted Secret を推奨）

| 変数名 | 取得元 |
|-------|-------|
| `FIREBASE_PROJECT_ID` | Firebase Console > Project Settings > General |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console > Project Settings > Service Accounts > Generate new private key |
| `FIREBASE_PRIVATE_KEY` | 同上（JSON の `private_key` フィールド。改行は実際の `\n` を含む生の値で貼り付け） |

> **重要**: `FIREBASE_PRIVATE_KEY` は Vercel の UI に貼り付ける際、`"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` の形式でそのまま貼り付ける（バックスラッシュnを実際の改行に変換不要）。

### クライアントサイド変数（Plain Text）

| 変数名 | 取得元 |
|-------|-------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console > Project Settings > Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | 同上 |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | 同上 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 同上 |

### 本番で設定しない変数（エミュレーター用）

以下は本番環境では**設定しない**か空にする:

- `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` — 設定しないか空のまま
- `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL` — 設定不要
- `FIRESTORE_EMULATOR_HOST` — 設定不要
- `FIREBASE_AUTH_EMULATOR_HOST` — 設定不要

### Vercel CLI での一括設定例

```bash
vercel env add FIREBASE_PROJECT_ID production
vercel env add FIREBASE_CLIENT_EMAIL production
vercel env add FIREBASE_PRIVATE_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
```

---

## 2. Firestore ルール・インデックスの本番反映

### 管理ファイル

| ファイル | 用途 |
|---------|------|
| `firestore.rules` | Firestore セキュリティルール（全クライアント書き込みを拒否） |
| `firestore.indexes.json` | 複合インデックス定義（houseId + 各タイムスタンプフィールド） |
| `firebase.json` | Firebase CLI の設定（rules / indexes のパスを参照） |

### デプロイコマンド

```bash
# ルールとインデックスを同時にデプロイ（通常はこれを使う）
firebase deploy --only firestore:rules,firestore:indexes

# ルールだけ変更した場合
firebase deploy --only firestore:rules

# インデックスだけ追加・変更した場合
firebase deploy --only firestore:indexes
```

> `.firebaserc` の `default` エイリアスが本番プロジェクト（`sharehousework`）を指しているため、`--project` 指定は不要。

### インデックスを追加するとき

1. `firestore.indexes.json` の `"indexes"` 配列に新しいエントリを追記する
2. `firebase deploy --only firestore:indexes` を実行する
3. Firebase Console > Firestore > インデックス で「構築中」→「有効」になるまで待つ（数分〜数十分）

### デプロイ確認

```bash
# デプロイ後、Firebase Console で確認
# https://console.firebase.google.com/project/sharehousework/firestore/rules
# https://console.firebase.google.com/project/sharehousework/firestore/indexes
```

> ローカル開発時は `firebase emulators:start --project development` を使用する（本番には影響しない）。

---

## 3. Vercel へのアプリデプロイ

```bash
# Vercel CLI でデプロイ
vercel --prod

# または GitHub 連携で main ブランチへの push 時に自動デプロイ
```

---

## ローカル開発

```bash
# .env.local をコピーして値を設定
cp .env.example .env.local
# .env.local に各変数の実値を設定する

# Firebase エミュレーター起動（別ターミナル）
firebase emulators:start --project development

# 開発サーバー起動
npm run dev
```

`.env.local` に以下を設定してエミュレーターを有効化:

```
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL=http://127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```
