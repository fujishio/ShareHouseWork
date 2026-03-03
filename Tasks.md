# TASKS.md — 実施すべきタスク一覧

作成日: 2026-03-03
依拠ドキュメント: `IMPROVEMENTS.md`, `Overview.md`, `DATABASE.md`

---

## 優先度：中

### TASK-5: Discord 通知 MVP 実装

**背景**
要件定義済み・完全未実装。（IMPROVEMENTS.md §5.K）

**実装ステップ**

1. **Firestore コレクション追加**
   - `notificationSettings`（ハウス単位）: `enabled`, `importantOnly`, `webhookUrl`, `updatedAt`, `updatedBy`
   - `notificationQueue`（配信キュー）: `eventId`, `destination`, `payload`, `status`, `retryCount`, `createdAt`

2. **API 層にイベント生成を追加**
   - `task.completed`（タスク完了時）
   - `notice.created`（お知らせ投稿時）
   - `expense.added`（支出記録時）
   - `shopping.checked`（買い物チェック時）

3. **非同期送信 Worker 実装**
   - Cloud Functions または Vercel Cron Job で `notificationQueue` を処理する
   - Discord Incoming Webhook に POST する
   - 失敗時は指数バックオフでリトライし、上限超過時は dead-letter に退避する

4. **セキュリティ**
   - `webhookUrl` は `.env.local` に保存する
   - `.env.example` に `DISCORD_WEBHOOK_URL` を追記する

5. **冪等性保証**
   - `eventId + destination` の複合キーで重複送信を防止する

**受け入れ基準**
- 設定 ON のハウスでイベント発生時、Discord チャンネルに 1 回だけ通知される
- 一時失敗時に自動再送され、重複通知が発生しない
- 設定 OFF 時は通知が送信されない

---

## 優先度：低

### TASK-8: PWA / オフライン対応（後段再評価）

**背景**
IMPROVEMENTS.md §6.J。現時点では優先課題完了後に再評価。

**着手時の検討事項**
- Service Worker の導入可否をスマホ実機で検証する
- オフライン時の UI（読み取り専用モードなど）を設計する

---

## タスク一覧サマリー

| ID | タイトル | 優先度 | 状態 |
|----|---------|--------|------|
| TASK-5 | Discord 通知 MVP 実装 | 中 | 未着手 |
| TASK-8 | PWA / オフライン対応 | 低 | 後段再評価 |
| TASK-P1 | 本番ビルドエラー修正（register ページの型不整合） | 高 | 完了 |
| TASK-P2 | Firebase 本番デプロイ構成を追加 | 高 | 未着手 |
| TASK-P3 | 本番環境変数・Secret 設定 | 高 | 未着手 |
| TASK-P4 | Firestore 本番反映手順の固定化 | 高 | 未着手 |
| TASK-P5 | 未認証エンドポイントの悪用対策 | 中 | 未着手 |

---

## 本番 Firebase 向け追加タスク（2026-03-03 追記）

### TASK-P1: 本番ビルドエラー修正（register ページの型不整合）

**状態**: 完了

**内容**
- `src/app/register/page.tsx` の `color` state を `useState<string>(DEFAULT_COLOR)` に変更し、`ColorPicker` の `onChange` 型と一致させる。
- `npm run build` を再実行し、ビルド成功を確認する。

### TASK-P2: Firebase 本番デプロイ構成を追加

**状態**: 未着手

**内容**
- Firebase での実行方式（App Hosting / Hosting + Functions）を確定する。
- `firebase.json` に本番デプロイ用設定を追加し、emulator 設定と併存できる形に整理する。
- `.firebaserc` の default プロジェクトを本番 project id に切り替える（`demo-sharehouse-work` 固定を解消）。

### TASK-P3: 本番環境変数・Secret 設定

**状態**: 未着手

**内容**
- Server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` を Secret として設定する。
- Client: `NEXT_PUBLIC_FIREBASE_*` を本番値へ設定し、`NEXT_PUBLIC_USE_FIREBASE_EMULATOR` は本番で無効化する。
- 公開リポジトリ運用として、実値はコミットせず `.env.example` はサンプル値のみ維持する。

### TASK-P4: Firestore 本番反映手順の固定化

**状態**: 未着手

**内容**
- `firestore.rules` の本番反映（`firebase deploy --only firestore:rules`）をデプロイ手順に追加する。
- 将来の複合インデックス追加に備え、`firestore.indexes.json` を管理対象に追加し、`firebase deploy --only firestore:indexes` 手順を確立する。

### TASK-P5: 未認証エンドポイントの悪用対策

**状態**: 未着手

**内容**
- `/api/users` POST と `/api/houses` POST にレート制限（IP/UID ベース）を追加する。
- 異常トラフィック検知のため、失敗系の監査ログとアラート条件を定義する。
