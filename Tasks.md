# TASKS.md — 実施すべきタスク一覧

作成日: 2026-03-03
依拠ドキュメント: `IMPROVEMENTS.md`, `Overview.md`, `DATABASE.md`

---

## IMPROVEMENTS.md との現状齟齬チェック結果

| 項目 | IMPROVEMENTS.md の記述 | 実際の状況 |
|------|----------------------|-----------|
| テスト件数 | 80 pass / 0 fail | ✅ 一致（`npm test` で確認済み） |
| Zod バリデーション | task-completions/expenses/shopping/rules/notices/tasks/houses 適用済み | ✅ 一致（ハンドラー層含め適用済み） |
| Firestore セキュリティルール | クライアント直接 read/write 禁止済み | ✅ 一致（`allow read, write: if false;`） |
| Discord 通知 | 未着手（要件定義済み） | ✅ 一致（未実装） |
| Lint/Format 強化 | 実装済み | ✅ 一致（`eslint.config.mjs` / `.prettierrc` 追加済み） |
| Emulator ルールテスト | 追加予定 | ✅ 実装済み（`firestore.rules.test.ts` + CI `test:firestore-rules`） |
| **CI 環境変数** | 記載なし | ✅ 不要な `NEXTAUTH_SECRET` / `NEXTAUTH_URL` を削除済み |
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

### ~~TASK-2: Firestore Emulator でのセキュリティルールテスト追加~~ ✅ 完了

**完了日: 2026-03-03**

- `firestore.rules.test.ts` を作成済み:
  - 認証済みユーザーのクライアント SDK 直接読み取りが拒否されることを確認
  - 未認証ユーザーの直接書き込みが拒否されることを確認
- CI（`.github/workflows/ci.yml`）に `Run Firestore rules tests` ステップ（`npm run test:firestore-rules`）を追加済み
- `package.json` に `test:firestore-rules` スクリプト（Emulator 起動 → テスト実行）を追加済み

---

## 優先度：中

### ~~TASK-3: 残 API エンドポイントへの zod 展開とエラー形式統一~~ ✅ 完了

**完了日: 2026-03-03**

**対応内容**
- `src/app/api/audit-logs/route.ts` の `parseLimit()` / `parseDate()` を zod クエリスキーマに置き換え
- `src/shared/lib/api-validation.ts` に `apiErrorResponse()` を追加し、共通エラー形式を利用開始
- `src/app/api/exports/monthly.csv/route.ts` の `EXPORT_CSV_FAILED` 応答を含め、`details` 付きに統一
- `src/app/api/notices/[id]/route.ts` を含む未統一ルートで `details` フィールドを補完

---

### ~~TASK-4: CSV/集計の日付比較ロジック監査~~ ✅ 完了

**完了日: 2026-03-03**

**調査結果**
- `calculate-monthly-expense-summary.ts`: バグなし。`purchasedAt` は date-only `YYYY-MM-DD` が保証されており、月比較ロジックも正確。
- `monthly-export.ts`: **UTC/JST タイムゾーンバグを発見・修正済み**（下記参照）

**修正内容**

| ファイル | バグ | 修正 |
|---------|------|------|
| `src/server/monthly-export.ts` | `completedAt.startsWith(month)` が UTC month prefix で比較 → 毎月1日 00:00〜08:59 JST 完了分が前月CSVに漏れる | `toJstMonthKey(new Date(record.completedAt)) === month` に変更 |
| `src/domain/shopping/shopping-api-validation.ts` | datetime 文字列を `toISOString().slice(0,10)` (UTC日付) に変換 → JST日付と乖離 | `getJstDateString(date)` に変更 |
| `src/domain/expenses/expense-api-validation.ts` | 同上 | 同上 |

**追加テスト**
- `monthly-export.test.ts`: UTC 前月・JST 当月の境界ケース（`2026-01-31T15:30:00.000Z` = JST 2/1 00:30 が 2026-02 CSV に含まれること）
- `shopping-api-validation.test.ts`: JST 基準の日付正規化テストに更新
- `expense-api-validation.test.ts`: UTC/JST 境界ケース（`2026-02-25T01:30:00.000+09:00` → `"2026-02-25"`）

---

### ~~TASK-9: Phase 4 Test Strengthening（API/Domain）~~ ✅ 完了

**完了日: 2026-03-03**

**対応内容**
- `src/server/api/*` の未カバー分岐（`INVALID_JSON` / `VALIDATION_ERROR` / `NOT_FOUND`）をテスト追加
- `task-completions` の `to` クエリ不正・`limit` 上限制御（200）を検証
- `calculate-monthly-expense-summary` に取消済み除外・不正 monthKey 例外を追加
- `prioritize-tasks` に `limit=0` の境界値テストを追加
- `npm test` で `80 pass / 0 fail` を確認

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

### ~~TASK-6: CSV エクスポート運用手順を docs/ に明文化~~ ✅ 完了

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

### ~~TASK-7: Lint / Format 強化~~ ✅ 完了

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
| TASK-2 | Firestore Emulator でのセキュリティルールテスト追加 | 高 | ✅ 完了 |
| TASK-3 | 残 API への zod 展開とエラー形式統一 | 中 | ✅ 完了 |
| TASK-4 | CSV/集計の日付比較ロジック監査 | 中 | ✅ 完了 |
| TASK-9 | Phase 4 Test Strengthening（API/Domain） | 中 | ✅ 完了 |
| TASK-5 | Discord 通知 MVP 実装 | 中 | 未着手 |
| TASK-6 | CSV エクスポート運用手順を docs/ に明文化 | 低 | ✅ 完了 |
| TASK-7 | Lint / Format 強化 | 低 | ✅ 完了 |
| TASK-8 | PWA / オフライン対応 | 低 | 後段再評価 |
| TASK-H1 | ホーム画面の currentUser をログイン中ユーザーで解決する | 中 | ✅ 完了 |

---

## 本番 Firebase 向け追加タスク（2026-03-03 追記）

### TASK-P1: 本番ビルドエラー修正（register ページの型不整合）

**状態**: 未着手

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

---

## ホーム画面の既知課題（2026-03-03 追記）

### ~~TASK-H1: ホーム画面の currentUser をログイン中ユーザーで解決する~~ ✅ 完了

**完了日: 2026-03-03**

**状態**: 完了

**背景**

`src/app/page.tsx` はサーバーコンポーネントのため、Firebase Auth のクライアント SDK が使えない。
現状は `HOUSE_MEMBERS[0]`（家主）をハードコードで `currentUser` としているため、
ContributionWidget の以下の値が実際のログインユーザーと一致しない。

- `myPoints` / `myRank` — ログイン中ユーザーの貢献ポイントと順位
- `currentUserId` — 円グラフで「あなた」と表示するための ID

**実装方針（案）**

1. **セッション Cookie 方式（推奨）**
   - Firebase Admin SDK の `createSessionCookie()` でサーバー側セッションを発行する。
   - `page.tsx` でセッション Cookie を検証し、`uid` → `/users/{uid}` から `Member` を取得する。
   - メリット: サーバーコンポーネントのまま完結する。

2. **クライアント分離方式（暫定）**
   - ContributionWidget のスコア表示部分（`myPoints` / `myRank`）をクライアントコンポーネントとして切り出す。
   - `useAuth()` で UID を取得し、`/api/users` から自分のデータを引いて表示する。
   - メリット: サーバー側の変更が不要。デメリット: データ取得が2ウォーターフォールになる。

**受け入れ基準**
- どのメンバーがログインしても、挨拶・ポイント・順位・円グラフの「あなた」が正しく表示される。
