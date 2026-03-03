# TASKS.md — 実施すべきタスク一覧

作成日: 2026-03-03
依拠ドキュメント: `IMPROVEMENTS.md`, `Overview.md`, `DATABASE.md`

---

## IMPROVEMENTS.md との現状齟齬チェック結果

| 項目 | IMPROVEMENTS.md の記述 | 実際の状況 |
|------|----------------------|-----------|
| テスト件数 | 52 pass / 0 fail | ✅ 一致（`npm test` で確認済み） |
| Zod バリデーション | task-completions/expenses/shopping/rules/notices/tasks/houses 適用済み | ✅ 一致（ハンドラー層含め適用済み） |
| Firestore セキュリティルール | クライアント直接 read/write 禁止済み | ✅ 一致（`allow read, write: if false;`） |
| Discord 通知 | 未着手（要件定義済み） | ✅ 一致（未実装） |
| Lint/Format 強化 | 未着手 | ✅ 一致（カスタム設定ファイルなし） |
| Emulator ルールテスト | 追加予定 | ✅ 一致（未実装） |
| **CI 環境変数** | 記載なし | ⚠️ **齟齬あり**：`ci.yml` に `NEXTAUTH_SECRET` / `NEXTAUTH_URL` が残存（NextAuth 未使用のため不要な残骸） |
| **旧 TASKS.md 内容** | — | ⚠️ **齟齬あり**：LINE 連携・Prisma Schema など廃止済みの設計が残存 → 本ファイルで上書き |

---

## 優先度：高

### ~~TASK-1: CI 設定から不要な NEXTAUTH 環境変数を削除~~ ✅ 完了

`.github/workflows/ci.yml` から `NEXTAUTH_SECRET` / `NEXTAUTH_URL` を削除済み（2026-03-03）。

---

### ~~TASK-L: 認証なし公開エンドポイントへの `verifyRequest()` 追加~~ ✅ 完了

**完了日: 2026-03-03**

以下の GET エンドポイントに `verifyRequest()` + `unauthorizedResponse()` を追加済み。

| ファイル | 対応内容 |
|---|---|
| `src/app/api/exports/monthly.csv/route.ts` | GET に `verifyRequest()` 追加 |
| `src/app/api/tasks/route.ts` | GET に `verifyRequest()` 追加 |
| `src/app/api/users/route.ts` | GET に `verifyRequest()` 追加 |
| `src/app/api/houses/route.ts` | GET に `verifyRequest()` 追加 |

`/api/users` POST と `/api/houses` POST は登録フロー用として意図的に認証なし（コメントで明記済み）。

---

### ~~TASK-M: `/api/exports/monthly.csv` の `month` パラメータ zod バリデーション追加~~ ✅ 完了

**完了日: 2026-03-03**

`src/app/api/exports/monthly.csv/route.ts` に `monthQuerySchema` を追加済み。
`YYYY-MM` 形式（`/^\d{4}-(0[1-9]|1[0-2])$/`）を zod regex で検証し、
不正値の場合は `{ error, code: "VALIDATION_ERROR", details }` で 400 を返す。

---

### TASK-2: Firestore Emulator でのセキュリティルールテスト追加

**背景**
`firestore.rules` は「全拒否（`allow read, write: if false`）」ルールに設定済みだが、
回帰テストが存在しない。将来のルール変更で意図しない権限付与が発生するリスクがある。
（IMPROVEMENTS.md §4.E「次段で Emulator ルールテストを追加予定」）

**作業内容**
- `@firebase/rules-unit-testing` を開発依存として追加
- `firestore.rules.test.ts` を作成し以下を確認するテストを実装する:
  - 認証済みユーザーがクライアント SDK で直接読み取りしようとすると拒否される
  - 未認証ユーザーが直接書き込みしようとすると拒否される
- CI に Emulator テストステップを追加する（または既存 `npm test` に統合する）

---

## 優先度：中

### TASK-3: 残 API エンドポイントへの zod 展開とエラー形式統一

**背景**
主要 API には zod が適用済みだが、クエリパラメータ受け取り系の API が手動バリデーション。
また、エラーレスポンス形式 `{ error, code, details }` の `details` フィールドが全ルートで
統一されていない。（IMPROVEMENTS.md §5.B）

**残対応ファイル**
- `src/app/api/audit-logs/route.ts` — `parseLimit()` / `parseDate()` の手動バリデーションを zod に置き換え、エラーレスポンスに `details` を追加する
- `src/app/api/exports/monthly.csv/route.ts` — month バリデーションは **TASK-M** で対応。エラー形式（`details` フィールド）の統一はここで行う

**エラー形式の統一（全ルート対象）**
- エラーレスポンスを `{ error: string, code: string, details?: unknown }` に統一する
- `src/shared/lib/api-validation.ts` の共通ヘルパーを活用する

---

### TASK-4: CSV/集計の日付比較ロジック監査

**背景**
`IsoDateTimeString` / `IsoDateString` / `YearMonthString` 型エイリアスは整備済みだが、
CSV エクスポートや月次集計での日付比較に混在バグが残る可能性がある。（IMPROVEMENTS.md §5.C）

**作業内容**
- `src/server/monthly-export.ts` の日付比較ロジックを読んで、型混在がないか確認する
- `src/domain/expenses/calculate-monthly-expense-summary.ts` の比較処理を確認する
- 混在・バグがあれば修正し、テストケースを追加する

---

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

### TASK-6: CSV エクスポート運用手順を docs/ に明文化

**背景**
`taskCompletions` / `expenses` / `shoppingItems` の月次 CSV 出力は実装済みだが、
運用手順が文書化されていない。（IMPROVEMENTS.md §6.H）

**作業内容**
- `docs/csv-export-operations.md` を新規作成し、以下を記載する:
  - エクスポート手順（画面操作 / API 直接呼び出し）
  - ファイル命名規則
  - 保管期間・配布先の推奨
  - 再出力手順と注意事項

---

### TASK-7: Lint / Format 強化

**背景**
現在は Next.js デフォルトの ESLint 設定のみ。Prettier 設定ファイルも存在しない。（IMPROVEMENTS.md §6.I）

**作業内容**
- `eslint.config.mjs` にカスタムルールを追加する
  - `no-unused-vars`, `no-console` 等
  - `@typescript-eslint/strict` ルールセット
- `.prettierrc` を追加してフォーマットルールを統一する
- `package.json` に `"format": "prettier --write ."` スクリプトを追加する
- CI に `npm run lint` ステップを追加する

---

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
| TASK-1 | CI から不要な NEXTAUTH 環境変数を削除 | 高 | ✅ 完了 |
| TASK-L | 認証なし GET エンドポイントへの `verifyRequest()` 追加 | 高（最優先） | ✅ 完了 |
| TASK-M | `/exports/monthly.csv` の `month` パラメータ zod バリデーション | 高 | ✅ 完了 |
| TASK-2 | Firestore Emulator でのセキュリティルールテスト追加 | 高 | 未着手 |
| TASK-3 | 残 API への zod 展開とエラー形式統一 | 中 | 未着手 |
| TASK-4 | CSV/集計の日付比較ロジック監査 | 中 | 未着手 |
| TASK-5 | Discord 通知 MVP 実装 | 中 | 未着手 |
| TASK-6 | CSV エクスポート運用手順を docs/ に明文化 | 低 | 未着手 |
| TASK-7 | Lint / Format 強化 | 低 | 未着手 |
| TASK-8 | PWA / オフライン対応 | 低 | 後段再評価 |
