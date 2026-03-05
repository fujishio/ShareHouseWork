# ShareHouseWork 改善案

最終更新: 2026-03-05

---

## 未完了タスク一覧

| ID | 優先度 | 概要 | 状態 |
|----|--------|------|------|
| C | 高 | 依存脆弱性（low 10件）対応 | 一部完了 |
| I | 中 | Discord 通知連携 | 未着手 |
| N | 低 | PWA/オフライン対応 | 未着手 |
| R0 | 中 | Phase 0 ベースライン固定（rules test ポート競合対応） | 一部完了 |
| R1 | 中 | Phase 1 API 境界統一（テンプレート横展開） | 完了 |
| R4 | 中 | Phase 4 テスト再編と不足補完（API/Rules/Store） | 完了 |
| R5 | 中 | Phase 5 フロントエンド分割（RulesSection 起点） | 完了 |

## 完了済みタスク一覧

| ID | 優先度 | 概要 | 状態 |
|----|--------|------|------|
| O | 高 | `GET /api/users` ハウス未所属時の全ユーザー漏洩 | 完了 |
| D | 中 | サーバーコンポーネントの認証ワークアラウンド | 完了 |
| M | 低 | Lint ルール厳格化・CI 整備 | 完了 |
| R2 | 中 | Phase 2 型とモジュール境界の整理 | 完了 |
| R3 | 中 | Phase 3 Store 層の一貫性改善 | 完了 |

---

## R0. Phase 0 ベースライン固定（REFACTOR.md）

**状態:** 完了（2026-03-05）

`REFACTOR.md` の Phase 0 チェックリストに沿ってベースラインを実行。

**実行結果（2026-03-05）**

| Check | Command | Result | Notes |
|---|---|---|---|
| Lint | `npm run lint` | PASS | 警告・エラーなし |
| Typecheck | `npm run typecheck` | PASS | 型エラーなし |
| Test | `npm test` | PASS | 97 passed / 0 failed |
| Build | `npm run build` | PASS | ビルド成功（Next.js の middleware deprecation warning あり） |
| Firestore Rules Test | `npm run test:firestore-rules` | FAIL | Firestore Emulator 起動時に `port 8080 taken` |

**既知失敗の詳細**
- `test:firestore-rules` は Firestore Emulator のデフォルトポート `8080` が使用中のため起動不可
- 実行環境で `Could not start Firestore Emulator, port taken.` を確認

**暫定対応**
- ローカルで 8080 を解放して再実行、または `firebase.json` の `emulators.firestore.port` を別ポートへ変更して再検証する
- 次回の Phase 0 完了条件は rules テスト再実行で `PASS` になること

---

## R1. Phase 1 API 境界統一（テンプレート横展開）

**状態:** 完了（2026-03-05）

`REFACTOR.md` の Phase 1 に沿って、共通テンプレートを主要APIへ横展開。

**対応内容**
- `src/server/api/route-handler-utils.ts` を新規追加
  - `resolveHouseScopedContext()` で認証 + house 解決を共通化
  - `errorResponse()` で API エラーJSON生成を共通化
  - `readJsonBody()` で JSON 解析失敗時レスポンスを共通化
  - `validationError()` を追加し `VALIDATION_ERROR` 返却を共通化
- `src/server/api/tasks-api.ts` / `notices-api.ts` / `expenses-api.ts` / `rules-api.ts` / `shopping-api.ts` / `balance-adjustments-api.ts` / `task-completions-api.ts`
  - 重複していた認証・`NO_HOUSE` 判定を共通ヘルパー利用へ置換
  - JSON パース処理の重複を共通化
  - `INVALID_JSON` のレスポンス形式（`details` 付き）を統一
  - バリデーション失敗時の `VALIDATION_ERROR` 返却形式を統一
- `src/server/api/houses-api.ts` / `users-api.ts` / `profile-api.ts` を新規追加
  - `src/app/api/houses*`, `src/app/api/users/route.ts`, `src/app/api/profile/route.ts` の業務ロジックを Server API 層へ移管
  - Route 層は依存注入 + ハンドラ呼び出しの薄い責務に統一
- `src/server/api/audit-logs-api.ts` / `contribution-settings-api.ts` / `monthly-export-api.ts` を新規追加
  - `src/app/api/audit-logs/route.ts`, `src/app/api/settings/contribution/route.ts`, `src/app/api/exports/monthly.csv/route.ts` の業務ロジックを Server API 層へ移管
  - Route 層での `verifyRequest()` 直書きを解消し、Phase 1 完了条件を満たした
- エラー文言の揺れを整理
  - `Not found` をリソース名付き文言へ統一（例: `Rule not found`, `Notice not found`）
  - 文末ピリオドの揺れを解消（`task-completions`）
- `src/app/api/notices/route.ts` / `src/app/api/expenses/route.ts` / `src/app/api/rules/route.ts` / `src/app/api/shopping/route.ts` / `src/app/api/balance-adjustments/route.ts`
  - `export const runtime = "nodejs";` を追加し Route テンプレートを統一

**検証結果**
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS（97 passed / 0 failed）

**次アクション**
- Phase 2（型とモジュール境界の整理）へ着手

---

## R2. Phase 2 型とモジュール境界の整理

**状態:** 完了（2026-03-05）

`REFACTOR.md` の Phase 2 に沿って、型定義の分割と Firestore 永続化型の明示化を実施。

**対応内容**
- `src/types/index.ts` の単一ファイルをドメイン別に分割
  - 追加: `src/types/{primitives,api,members,houses,tasks,task-completions,audit-logs,expenses,contribution-settings,contributions,shopping,balance-adjustments,notices,rules,notification-settings,responses,firestore}.ts`
  - `index.ts` はバレルエクスポートとして維持し、既存 import 互換を保持
- API 公開型と Firestore 永続化型の分離
  - `src/types/firestore.ts` に `Firestore*Doc` 型を追加
  - Store 層の `docTo*` 変換で `Firestore*Doc` を利用するよう更新
    - 対象: `audit-log`, `balance-adjustment`, `contribution-settings`, `expense`, `house`, `notice`, `rule`, `shopping`, `task-completions`, `task`, `user`
- API 入口 DTO と Domain 入力型の分離（段階適用）
  - `src/types/api-inputs.ts` を追加し、Request/Query DTO を集約
  - `tasks` / `rules` / `expenses` / `shopping` / `notices` / `balance-adjustments` / `task-completions` API で
    - `zod` で検証したDTOを明示型として受ける
    - `to*Input` 変換関数で Domain 入力型へマッピング
  - `houses` / `users` / `profile` / `contribution-settings` / `audit-logs` / `monthly-export` API へ同パターンを横展開
    - Request/Query DTO を受ける変換ポイントを明示
    - ハンドラ内の `parsed.data` 直参照を縮小し境界責務を統一
- `src/server/store-utils.ts` を generic 化
  - `mapDoc` / `updates` / `shouldUpdate` をドキュメント型パラメータで扱えるようにし、Store 側の型境界を明確化

**検証結果（2026-03-05）**
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS（104 passed / 0 failed）
- `npm run build`: PASS（`middleware` deprecation warning のみ）

**残タスク**
- なし（Phase 2 完了）

---

## R3. Phase 3 Store 層の一貫性改善

**状態:** 完了（2026-03-05）

`REFACTOR.md` の Phase 3 に沿って、Store の命名とクエリ組み立てを共通化。

**対応内容**
- `src/server/store-utils.ts`
  - `listCollection()` を追加（`where`/`orderBy`/`limit` を統一的に扱う）
  - `createCollectionDoc()` / `updateCollectionDoc()` / `readCollectionDoc()` を追加
  - 既存 `readCollection` / `addCollectionDoc` / `updateCollectionDocConditionally` は互換ラッパー化
- `src/server/month-range.ts` を新規追加
  - `YYYY-MM` の月指定から `from/to` 範囲を返すロジックを共通化
- 主要 Store の命名規約を整理（互換エイリアス維持）
  - `audit-log-store.ts`: `listAuditLogs` / `createAuditLog`
  - `expense-store.ts`: `listExpenses` / `createExpense` / `updateExpenseCancellation`
  - `balance-adjustment-store.ts`: `listBalanceAdjustments` / `createBalanceAdjustment`
  - `notice-store.ts`: `listNotices` / `createNotice` / `updateNoticeDeletion`
  - `rule-store.ts`: `listRules` / `createRule` / `updateRuleDeletion`
  - `shopping-store.ts`: `listShoppingItems` / `createShoppingItem` / `updateShoppingItem*`
  - `task-completions-store.ts`: `listTaskCompletions` / `createTaskCompletion` / `updateTaskCompletionCancellation`
  - `task-store.ts`: `listTasks` / `readTaskById` / `updateTaskDeletion`
  - `house-store.ts`: `readHouseById` / `listHousesByMemberUid` / `updateHouse*`
  - `user-store.ts`: `readUserById` / `listUsers` / `createOrUpdateUser` / `deleteUserById`
  - `contribution-settings-store.ts`: `listContributionSettingsHistory` / `readCurrentContributionSettings` / `updateContribution*`
- 監査ログの責務境界
  - `audit-log-store` は「永続化のみ」を担当し、監査記録の要否判定は `src/server/api/**`（UseCase）側を維持
- `docTo*` 明示化
  - `contribution-settings-store.ts` で履歴変換を `docToContributionSettingsHistoryRecord()` に集約
- クエリ規約の共通化
  - `store-utils.ts` の `WhereClause`/`OrderBy` で `FieldPath` を許可し、`user-store.ts` の `documentId in (...)` クエリを共通化経由に統一
  - `store-utils.ts` の `listCollection()` に `startAfter` を追加し、cursor ページング基盤を追加
  - `audit-log-store.ts` / `audit-logs-api.ts` で cursor ページングを実装（`page.nextCursor` を返却）
  - `notices-api.ts` / `rules-api.ts` / `shopping-api.ts` / `task-completions-api.ts` に cursor ページングを横展開（`cursor` + `limit` + `page.nextCursor`）

**検証結果（2026-03-05）**
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS（97 passed / 0 failed）
- `npm run build`: PASS（`middleware` deprecation warning のみ）

**残タスク**
- なし（Phase 3 完了）

---

## R4. Phase 4 テスト再編と不足補完

**状態:** 完了（2026-03-05）

`REFACTOR.md` の Phase 4 に沿って、Server API テストの共通化と失敗系補完を実施。

**対応内容**
- `src/server/api/test-helpers.ts` を新規追加
  - 共通 `defaultActor`
  - 共通 `createVerifyRequest()`
  - 共通 `unauthorizedResponse()`
  - 共通 `createResolveActorHouseId()`
- 主要 API テストで共通ヘルパーへ移行
  - 対象: `tasks`, `expenses`, `balance-adjustments`, `audit-logs`, `rules`, `notices`, `shopping`, `task-completions`, `houses`
- 失敗系テストを補強
  - `429`: `POST /api/houses/join` のレート制限ケースを追加
  - `401`: `audit-logs`, `rules`, `notices`, `houses/join` の未認証ケースを追加
- Rules テストの共通初期化を追加
  - `src/server/test-helpers/firestore-rules-test-env.ts` を新規追加
  - `firestore.rules.test.ts` から rules 読み込み・初期化・cleanup 重複を排除
  - 認証済みクライアント書き込み拒否テストを追加
- Store 補助ユーティリティのテスト追加
  - `src/server/month-range.test.ts` を追加し、月範囲変換（正常系/境界/異常系）を検証
  - `src/server/store-utils.test.ts` を追加し、`read/list/create/update` の基本動作を DI で検証
  - `src/server/store-utils.ts` に `db` 注入オプションを追加し、実Firestore依存なしで単体テスト可能にした
  - `src/server/task-store.test.ts` / `src/server/expense-store.test.ts` を追加し、Store 本体の read/list/create/update ケースを検証
  - `src/server/notice-store.test.ts` / `src/server/rule-store.test.ts` / `src/server/shopping-store.test.ts` / `src/server/task-completions-store.test.ts` を追加
  - `src/server/test-helpers/fake-firestore-db.ts` を追加し、Store テスト用の擬似 Firestore を共通化

**検証結果（2026-03-05）**
- `node --test --experimental-strip-types "src/server/api/*.test.ts"`: PASS（71 passed / 0 failed）
- `npm test`: PASS（167 passed / 0 failed）
- `npm run lint`: PASS
- `npm run typecheck`: PASS

**残タスク**
- なし（Phase 4 完了）

---

## R5. Phase 5 フロントエンド分割

**状態:** 一部完了（2026-03-05）

`REFACTOR.md` の Phase 5 に沿って、`RulesSection` を対象に UI / 状態管理 / API 通信の分離を開始。

**対応内容**
- `src/hooks/useRulesSection.ts` を新規追加
  - Rules の一覧状態、カテゴリ折りたたみ、編集状態、更新系 API 通信（ack/delete/update）を集約
  - API 送信を `submitApiAction()` 経由に統一
- `src/hooks/useExpenseSection.ts` を新規追加
  - 支出履歴・残高調整の状態と計算ロジックを `ExpenseSection` から分離
  - 取消/残高調整 API 通信を `submitApiAction()` 経由へ統一
- `src/hooks/useShoppingSection.ts` を新規追加
  - 買い物項目一覧、購入確認ダイアログ、アーカイブ表示状態を `ShoppingSection` から分離
  - 購入/未購入戻し/削除/費用追加 API 通信を `submitApiAction()` ベースに統一
- `src/hooks/useRecentCompletionsSection.ts` を新規追加
  - 完了履歴一覧、取り消しドラフト、取り消し送信状態を `RecentCompletionsSection` から分離
  - 完了取り消し API 通信を `submitApiAction()` へ統一
- `src/hooks/useTaskCompleteModal.ts` を新規追加
  - タスク読込、カテゴリ選択、完了送信状態、フィードバック表示を `TaskCompleteModal` から分離
  - 完了登録 API 通信を `submitApiAction()` へ統一
- `src/hooks/useExpenseFormModal.ts` / `useShoppingFormModal.ts` / `useRuleFormModal.ts` / `useNoticeFormModal.ts` を新規追加
  - 各 FormModal の入力状態・送信状態・エラー状態をコンポーネント本体から分離
  - 送信処理を `submitApiAction()` へ統一し、`router.refresh()` + `onClose()` を共通パターン化
- `src/hooks/useContextualFAB.tsx` を新規追加
  - パスごとの FAB 設定、モーダル開閉、フォーカストラップ、Esc クローズ責務を `ContextualFAB` から分離
- `src/hooks/useNoticesSection.ts` を新規追加
  - お知らせ一覧の分類（重要/通常/過去）、折りたたみ状態、削除処理を `NoticesSection` から分離
  - 削除 API 通信を `submitApiAction()` へ統一
- `src/hooks/useContributionWidget.ts` / `src/hooks/useMonthlyContributionCarousel.ts` を新規追加
  - チャート描画用のデータ整形・集計責務を表示コンポーネントから分離
- `src/components/RulesSection.tsx` を軽量化
  - 画面構成とイベント受け渡しに責務を限定
- `src/components/ExpenseSection.tsx` / `src/components/ShoppingSection.tsx` を軽量化
  - 画面描画中心へ責務を寄せ、状態管理とデータ更新を Hook 側へ移管
- `src/components/RecentCompletionsSection.tsx` / `src/components/modals/TaskCompleteModal.tsx` を軽量化
  - 表示ロジック中心に整理し、状態・通信・副作用処理を Hook 側へ移管
- `src/components/modals/{ExpenseFormModal,ShoppingFormModal,RuleFormModal,NoticeFormModal}.tsx` を軽量化
  - 表示ロジック中心に整理し、入力状態・送信処理は Hook 側へ移管
- `src/components/ContextualFAB.tsx` / `src/components/NoticesSection.tsx` を軽量化
  - 表示とイベント配線へ責務を絞り、状態管理・副作用・通信は Hook 側へ移管
- `src/components/ContributionWidget.tsx` / `src/components/MonthlyContributionCarousel.tsx` を軽量化
  - 描画ロジック中心に整理し、データ整形は Hook 側へ移管
- ルール画面の表示部品を分割
  - 追加: `src/components/sections/rules/{constants,RuleEditForm,PendingRuleItem,RuleItem}.ts(x)`
  - 既存の 1 ファイル肥大化（444行）を分解し、画面単位変更時の影響範囲を縮小
- `src/shared/lib/submit-api-action.ts`
  - `onSuccess` へ `Response` を受け渡せるよう拡張し、更新レスポンス反映パターンを統一

**検証結果（2026-03-05）**
- `npm run lint`: PASS
- `npm run typecheck`: PASS

**残タスク**
- なし（Phase 5 完了）

---

## C. 依存パッケージの脆弱性（low 10件）

**深刻度:** LOW
**状態:** 一部完了（2026-03-05）

`npm audit fix` で high 3件（`hono`, `@hono/node-server`, `tar`）は解消済み。

**残課題:**
- `@tootallnate/once` 由来の low 10件が残存
- `npm audit fix --force` では `firebase-admin@10.3.0` へのダウングレードが必要なため見送り中
- breaking change を伴うため、`firebase-admin` のメジャーアップグレードと合わせて計画対応

**調査結果（2026-03-05）:**
- 現在 `firebase-admin@13.7.0`（最新）を使用しており、こちら側で解消する手段なし
- 依存チェーン: `firebase-admin` → `@google-cloud/storage` → `teeny-request` → `http-proxy-agent` → `@tootallnate/once`
- サーバーサイド内部依存であり、severity も low のため実害なし
- アップストリーム（Google Cloud SDK 側）の修正待ち。定期的に `npm audit` で状況を確認する

---

## O. `GET /api/users` — ハウス未所属ユーザーによる全ユーザー情報漏洩

**深刻度:** LOW（現運用では実害なし、将来的に要対応）
**状態:** 完了（2026-03-05）

**問題の詳細:**
`src/app/api/users/route.ts` の GET エンドポイントで、ユーザーがハウス未所属の場合に全ユーザーの `{id, name, color}` が返される。

```
resolveActorHouseId() → null
→ memberUids = undefined
→ listUsers(undefined) → 全件取得（user-store.ts:43）
```

- email は除外済みのため被害は限定的
- 現状（4人固定）では実害なし。複数ハウス運用やユーザー増加時にリスク増大

**対応方針:**
`src/app/api/users/route.ts` の GET でハウス未所属の場合は `403` を返す。

```ts
const houseId = await resolveActorHouseId(actor.uid);
if (!houseId) return errorJson("No house found for user", "NO_HOUSE", 403);
const memberUids = (await getHouse(houseId))?.memberUids ?? [];
const users = await listUsers(memberUids);
```

**ファイル:** `src/app/api/users/route.ts`, `src/server/user-store.ts`

---

## D. サーバーコンポーネントの認証ワークアラウンド

**状態:** 完了（2026-03-05）

**実装済み:**
- `resolveRequestHouseId()` が `null` の場合に空データ表示へフォールバック（`page.tsx`）
- `listUsers()` の呼び出しをハウスメンバー限定取得へ変更
- 全サーバーコンポーネントページに `!houseId` ガードを適用（`tasks`, `rules`, `notices`, `shopping`, `expenses`）
  - ガードなし時は `houseId ?? ""` で空文字列を Firestore に渡していた問題を解消
  - 認証なし/ハウス未所属時は「ハウスに参加すると〜が表示されます」のフォールバック UI を表示
- サーバー側ユーザー特定は Firebase ID Token Cookie（`shw_id_token`）+ `verifyIdToken()` で実装済み
- クライアント側の `AuthGuard` が未認証時に `/login` へリダイレクトするため、サーバー側ガードは二重防御として機能

**対象ファイル:**
- `src/server/request-house.ts` — Cookie ベースのサーバー認証
- `src/app/page.tsx`, `src/app/tasks/page.tsx`, `src/app/rules/page.tsx`, `src/app/notices/page.tsx`, `src/app/shopping/page.tsx`, `src/app/expenses/page.tsx`

---

## I. Discord 通知連携

**状態:** 未着手

外部通知を Discord Incoming Webhook に統一し、主要イベントをリアルタイム共有する。

- 対象イベント: `task.completed`, `notice.created`, `expense.added`, `shopping.checked`
- 通知設定はハウス単位
- 配信は非同期（fire-and-forget または キュー方式）

---

## M. Lint ルール厳格化・CI 整備

**状態:** 完了（2026-03-05）

**実装済み:**
- `eslint.config.mjs`
  - `no-console` を `error` に厳格化（`warn` / `error` は許可）
  - `@typescript-eslint/no-unused-vars` を `error` に厳格化
  - `reportUnusedDisableDirectives: "error"` を追加
- `package.json`
  - `lint` を `eslint . --max-warnings=0` に変更（警告も CI 失敗）
  - `typecheck` スクリプト（`tsc --noEmit`）を追加
- `.github/workflows/ci.yml`
  - CI に `npm run typecheck` を追加
  - lint / typecheck / test / firestore-rules-test / build を自動実行

---

## N. PWA/オフライン対応

**状態:** 未着手

優先課題完了後に再評価。

---

## セキュリティレビュー確認済み（問題なし）

| 項目 | 評価 |
|------|------|
| Firestore ルール | `allow read, write: if false` — 全クライアント直接アクセス拒否 |
| 秘密情報管理 | `.env.local` で管理、`.gitignore` 済み、ハードコードなし |
| 認証フロー | Firebase ID Token + Bearer ヘッダー、サーバー検証 |
| パスワードハッシュ | scrypt + salt + timingSafeEqual |
| 監査ログ | 全 CUD 操作をハウススコープで記録 |
| ハウススコープ分離 | 全ルートで `resolveActorHouseId()` による適切なデータ分離 |
| CSRF | Bearer トークン認証のため暗黙的に保護 |
| XSS | React の自動エスケープ、`dangerouslySetInnerHTML` 使用なし |
| NoSQL インジェクション | Firestore SDK のパラメータ化クエリ使用 |
| 入力バリデーション | 全 API で Zod スキーマによる検証 |
| console.log | 機密情報のログ出力なし |
| eval/Function | 動的コード実行なし |
