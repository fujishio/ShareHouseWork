# ShareHouseWork 改善案（DATABASE準拠）

最終更新: 2026-03-03
基準ドキュメント: `DATABASE.md`（Firestore設計）

---

## 1. 目的
- `IMPROVEMENTS.md` を現行の DB/実装定義に合わせる。
- Firestore 前提の運用改善項目を明確化する。
- 古い前提（LINE 連携前提、`/data/*.json` 前提）を除去する。
- 当面の対象外として、DB移行（RDB化）と認証基盤の刷新（NextAuth等）は扱わない。

---

## 2. 現状サマリー（2026-03-03）

| 項目 | 状態 |
|------|------|
| DB基盤 | Firestore（`DATABASE.md` 準拠） |
| 認証 | Firebase Auth の Bearer IDトークン検証（`verifyRequest()`） |
| LINE関連 | 実装・設計の主軸ではない（本ドキュメントから削除） |
| 通知配信 | アプリ内通知は実装済み。外部通知（Discord/メール）は未実装 |
| 設定画面 | 通知文言をメールに統一、ログアウト導線を追加 |
| テスト | **52 pass / 0 fail** |
| 型チェック | `npx tsc --noEmit` 通過 |
| 監査ログ | 全CUD対応（rules/notices/task-completions/expenses/shopping） |
| API入力検証 | zod導入を拡大（`task-completions/expenses/shopping/rules/notices/tasks/houses` 適用済み） |
| 日付運用 | 日時（ISO8601）/日付（`YYYY-MM-DD`）を用途別に運用し、API境界で正規化 |
| CI | `npm test` + `npm run build` 実行。不要な NEXTAUTH 環境変数を削除済み |
| 認証なし公開エンドポイント | `/exports/monthly.csv`, `/tasks` GET, `/users` GET, `/houses` GET に `verifyRequest()` 追加済み（2026-03-03 対応完了） |

---

## 3. DATABASE.md と整合した前提

### 3.1 コレクション（現行）
- `users`
- `houses`
- `tasks`
- `taskCompletions`
- `expenses`
- `shoppingItems`
- `rules`
- `notices`
- `contributionSettings`
- `auditLogs`

### 3.2 データ運用ルール（現行）
- 論理削除: `tasks`, `rules`, `notices` は `deletedAt` 管理。
- 取消: `taskCompletions`, `expenses`, `shoppingItems` は `canceledAt` 系で管理。
- 履歴の `*By` は UID ではなく表示名（`actor.name`）で保存。
- Firestore の参照整合性は API 層で担保。

### 3.3 認証/実行者名の扱い（現行）
- API は `Authorization: Bearer <Firebase ID token>` を検証。
- `completedBy`, `purchasedBy`, `postedBy` などはクライアント入力ではなく、`verifyRequest()` で取得した `actor.name` を使用。

---

## 4. 高優先度 完了済み項目（設計記録）

> タスクの状態管理・着手順は [Tasks.md](Tasks.md) を参照。

### L. ✅ 認証なし公開エンドポイントの修正（2026-03-03）

GET エンドポイント 4 件（`/exports/monthly.csv`, `/tasks`, `/users`, `/houses`）に `verifyRequest()` を追加。
`/api/users` POST と `/api/houses` POST は登録フロー用として意図的に認証なし（コメントで明記済み）。

### M. ✅ `/api/exports/monthly.csv` の `month` パラメータ zod バリデーション（2026-03-03）

`monthQuerySchema` を追加し `YYYY-MM` 形式（`/^\d{4}-(0[1-9]|1[0-2])$/`）を検証。
不正値は `{ error, code: "VALIDATION_ERROR", details }` で 400 を返す。

### E. ✅ Firestore セキュリティルールの最小権限化（2026-03-03）

- クライアントからの Firestore 直接 read/write を禁止（API経由のみ）。
- `firestore.rules.test.ts` による Emulator ルールテストを追加。
- CI に `npm run test:firestore-rules` ステップを追加。

### D. ✅ `actor.name` 永続化方針の明文化（2026-03-02）

履歴の `actor.name` / `*By` は「記録時の表示名スナップショットを固定保存」。後日の表示名変更時に既存履歴は再解決しない。`DATABASE.md` / `Overview.md` に反映済み。

### A. ✅ 監査ログの対象を全 CUD に拡張

`rules` / `notices` / `taskCompletions` / `expenses` / `shoppingItems` の全 CUD に `appendAuditLog` を実装済み。既取消/既チェック状態の再実行では重複ログを抑止。

### F. ✅ API統合テストの運用継続

主要 API（`task-completions`, `expenses`, `shopping`, `rules`）の正常系/異常系テストを追加済み。新規 API 追加時の同時テスト追加を運用ルールとして継続。

---

## 5. 優先度: 中（高優先の次）

### B. APIバリデーションの統一（zod）

**対応状況（2026-03-02）**
- `task-completions` / `expenses` / `shopping` / `rules` / `notices` / `tasks` / `houses` API に zod スキーマを導入。
- `shared/lib/api-validation.ts` に共通スキーマ（trim, ISO日付, ISO日時）を追加。
- エラー形式を段階統一（主要APIで `{ error, code, details }` を返却）。

**残課題**
- `/api/audit-logs/route.ts`: `parseLimit()` / `parseDate()` の手動バリデーションを zod に置き換える。エラーレスポンスに `details` を追加する。
- エラー形式の完全統一（全ルートで `details` を一律化）。特に `audit-logs` と `notices/[id]` の 404 レスポンスが未統一。

### C. 日付フォーマットの扱いを明示し、混在バグを予防

**対応状況（2026-03-02）**
- `types/index.ts` に `IsoDateTimeString` / `IsoDateString` / `YearMonthString` を追加。
- `shared/lib/date-normalization.ts` で日付・日時の正規化関数を共通化。
- `DATABASE.md` に API境界での正規化ルールを追記。

**残課題**
- CSV/集計の比較ルール監査（混在比較の自動検知）。

### G. インデックス/クエリ運用の明文化
- `docs/firestore-query-index-operations.md` を追加。
- 複合インデックス追加の判断基準と本番反映手順を固定化。

### K. Discord通知要件（新規）

**目的**
- 外部通知を Discord に統一し、主要イベントをリアルタイム共有する。

**機能要件（MVP）**
- 送信方式は Discord Incoming Webhook を採用する（Bot は将来拡張）。
- 通知イベントを定義する: `task.completed`, `notice.created`, `expense.added`, `shopping.checked`。
- 通知設定をハウス単位で保持する: `enabled`, `importantOnly`, `webhookUrl`, `updatedAt`, `updatedBy`。
- イベント発生時は同期送信せず、通知キューに積んで非同期送信する。
- 重要通知のみ送るフィルタ（`importantOnly`）を実装する。

**非機能要件**
- 冪等性: `eventId + destination` で重複送信を防止する。
- 再送: 失敗時は指数バックオフでリトライし、上限超過時は dead-letter に退避する。
- 監視: 成功件数/失敗件数/最終エラーを記録し、運用で追跡可能にする。
- セキュリティ: Webhook URL は Secret Manager または `.env.local` に保存し、リポジトリにコミットしない。

**実装方針**
- Firestore に `notificationSettings`（設定）と `notificationQueue`（配信キュー）コレクションを追加。
- API 層はイベント生成のみ行い、送信処理は Cloud Functions/Worker に分離する。
- メッセージテンプレートはイベントごとに固定化し、将来の i18n 可能な構造にする。

**受け入れ基準**
- 設定ONのハウスでイベント発生時、Discord チャンネルに1回だけ通知される。
- 一時失敗時に自動再送され、重複通知が発生しない。
- 設定OFF時は通知が送信されない。

---

## 6. 優先度: 低（後段で対応）

### H. CSVエクスポートの運用拡張
- `taskCompletions` / `expenses` / `shoppingItems` の月次出力は実装済み。
- 運用手順（配布先、命名規則、保管期間、再出力手順）を `docs/` に追記する。

### I. Lint/Format 強化
- lint ルールの厳格化、整形ルール統一。

### J. PWA/オフライン
- 優先課題完了後に再評価。

---

## 7. 完了済み（現行実装で確認済み）

| 項目 | 状態 |
|------|------|
| Firestore ストア実装 | 完了 |
| Firebase Auth Bearer 検証 | 完了 |
| `MEMBER_NAMES` 一元化 | 完了 |
| `toJstMonthKey` / `toLocalDateInputValue` 集約 | 完了 |
| ルール確認ロジックの意図コメント化 | 完了 |
| rules/notices/task-completions の監査ログ | 完了 |
| expenses/shopping の監査ログ | 完了 |
| 設定画面のログアウト導線 | 完了 |
| 通知設定文言のメール統一 | 完了 |
| `package.json` `"type": "module"` | 完了 |
| `npm test` 52件 pass | 完了 |
| `npx tsc --noEmit` 通過 | 完了 |
| CI の不要な NEXTAUTH 環境変数削除 | 完了（2026-03-03） |
| L: 認証なしエンドポイント修正（`/exports/monthly.csv`, `/tasks`, `/users`, `/houses` GET） | 完了（2026-03-03） |
| M: `/exports/monthly.csv` の `month` パラメータ zod バリデーション追加 | 完了（2026-03-03） |
| E: Firestore Emulator ルールテスト追加（`firestore.rules.test.ts` + CI ステップ） | 完了（2026-03-03） |

---

## 8. 直近の確認ログ（2026-03-03）
- `npm test`: 52 pass / 0 fail
- `npx tsc --noEmit`: エラーなし
- CI: `npm test` + `npm run test:firestore-rules` + `npm run build` を実行（NEXTAUTH 環境変数削除済み）
