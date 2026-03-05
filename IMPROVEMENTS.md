# ShareHouseWork 改善案

最終更新: 2026-03-05
基準: セキュリティレビュー（2026-03-05）+ 既存改善案の棚卸し

---

## 0. 進捗サマリー（2026-03-05 時点）

- [x] A. `/api/houses/[id]/members` POST の認証・権限チェック追加
- [x] B. `/api/tasks/[id]` PATCH/DELETE のクロスハウス防止
- [~] C. 依存脆弱性対応（`npm audit fix` 実施済み。high 3件は解消、low 10件は残）
- [x] G. `joinPassword` の最小文字数バリデーション追加（8文字）
- [x] J. セキュリティヘッダー追加（CSP / X-Frame-Options / X-Content-Type-Options）
- [~] D/I/N は未完了（Dは部分対応）
- [x] M. 既存 ESLint 警告の解消（lint クリーン化）
- [x] E. 主要 API の入力文字列長制限を追加
- [x] F. `/api/houses/join` にレート制限を追加

---

## 1. 優先度: 高（即時対応）

### A. `/api/houses/[id]/members` POST — 認証の欠落

**深刻度:** CRITICAL
**状態:** ✅ 完了（2026-03-05）

POST エンドポイントに `verifyRequest()` が呼ばれておらず、認証なしで誰でも任意のユーザーを任意のハウスに追加できる。

**影響:**
- 攻撃者が他人のハウスに侵入し、全データ（費用・タスク・ルール等）にアクセス可能
- マルチテナントのデータ分離が完全に破綻する

**対応:**
- `verifyRequest()` を追加
- ホスト権限チェック（`house.hostUids.includes(actor.uid)`）を追加
- 実装済み: 未認証 `401` / 非ホスト `401`

**ファイル:** `src/app/api/houses/[id]/members/route.ts`

---

### B. `/api/tasks/[id]` PATCH/DELETE — クロスハウスのタスク改ざん

**深刻度:** CRITICAL
**状態:** ✅ 完了（2026-03-05）

認証はされているが、タスクが自分のハウスに属するかチェックしていない。ハウスAのユーザーがハウスBのタスクを編集・削除できる。

**対応:**
- `resolveActorHouseId()` でハウスを特定
- タスクの所属ハウスと照合してから操作を許可する
- 実装済み: `readTask()` 追加、`houseId` 不一致は `403 FORBIDDEN`
- テスト追加: 別ハウスの PATCH/DELETE が `403` になることを確認

**ファイル:** `src/server/api/tasks-api.ts`（handleUpdateTask, handleDeleteTask）, `src/server/task-store.ts`, `src/server/api/tasks-api.test.ts`

---

### C. 依存パッケージの脆弱性（13件: high 3, low 10）

**深刻度:** HIGH
**状態:** 🟡 一部完了（2026-03-05）

| パッケージ | 深刻度 | 概要 |
|-----------|--------|------|
| hono <=4.12.3 | HIGH | Cookie Injection, SSE Injection, 静的ファイルアクセス |
| @hono/node-server <1.19.10 | HIGH | エンコードスラッシュによる認可バイパス |
| tar <=7.5.9 | HIGH | ハードリンクパストラバーサル |
| firebase-admin 依存チェーン | LOW | @tootallnate/once の制御フロースコーピング |

**対応状況:**
- `npm audit fix` 実施済み
- 解消済み: `hono`, `@hono/node-server`, `tar`（high 3件）
- 残課題: `@tootallnate/once` 由来の low 10件（`npm audit fix --force` で `firebase-admin@10.3.0` へダウングレードが必要なため見送り）
- 現在方針: breaking change を伴うため別タスクで計画対応

---

## 2. 優先度: 中

### D. サーバーコンポーネントの認証ワークアラウンド
**状態:** 🟡 一部完了（2026-03-05）

`src/app/page.tsx` で `HOUSE_MEMBERS[0]` をハードコードしており、マルチユーザー環境で誤ったユーザーのデータが表示される。Firebase セッション Cookie 等でサーバー側ユーザー特定が必要。

**対応状況（実装済み）:**
- `src/app/page.tsx` で `resolveRequestHouseId()` が `null` の場合に空データ表示へフォールバック
- `listUsers()` の呼び出しを全件取得から `house.memberUids` 限定取得へ変更（ハウス外ユーザー混入防止）

**残課題:**
- サーバーコンポーネントの認証判定を共通化し、他ページにも同等のガードを適用

### E. 入力文字列の長さ制限
**状態:** ✅ 完了（2026-03-05）

`zNonEmptyTrimmedString` に `max()` がなく、巨大な文字列を送信可能。全 API の Zod スキーマに `.max()` を追加すべき。

**対応状況（実装済み）:**
- `src/server/api/tasks-api.ts`（`name <= 120`）
- `src/server/api/expenses-api.ts`（`title <= 120`, `cancelReason <= 500`）
- `src/server/api/notices-api.ts`（`title <= 120`, `body <= 2000`）
- `src/server/api/rules-api.ts`（`title <= 120`, `body <= 2000`）
- `src/server/api/shopping-api.ts`（`name <= 120`, `quantity <= 60`, `memo <= 500`）
- `src/server/api/balance-adjustments-api.ts`（`reason <= 500`）
- `src/app/api/houses/route.ts`（`name <= 100`, `description <= 500`, `joinPassword <= 128`）
- `src/app/api/profile/route.ts`（`color <= 32`）
- 追加対応: `src/app/api/houses/join/route.ts`（`houseName <= 100`, `joinPassword 8..128`）

**対象ファイル:**
- `src/server/api/tasks-api.ts`
- `src/server/api/expenses-api.ts`
- `src/server/api/notices-api.ts`
- `src/server/api/rules-api.ts`
- `src/server/api/shopping-api.ts`
- `src/server/api/balance-adjustments-api.ts`
- `src/app/api/houses/route.ts`
- `src/app/api/profile/route.ts`

### F. レート制限
**状態:** ✅ 完了（2026-03-05）

`/api/houses/join`（パスワード認証）などにレート制限がなく、ブルートフォース攻撃が可能。Vercel middleware またはカスタムレート制限の導入を検討。

**対応状況（実装済み）:**
- `src/app/api/houses/join/route.ts` にレート制限を追加
  - キー: `IP + userUid`
  - 制限: `1分あたり10回`
  - 超過時: `429 RATE_LIMITED`（`retryAfterSeconds` を返却）
- `src/server/rate-limit.ts` を追加（軽量インメモリ実装）
- `src/server/rate-limit.test.ts` で超過・ウィンドウリセットを検証

### G. ハウス参加パスワードの強度バリデーション
**状態:** ✅ 完了（2026-03-05）

`joinPassword` に最低文字数等の制約がない。`zTrimmedString.min(8)` 等を追加すべき。
- 実装済み:
  - `src/app/api/houses/join/route.ts` で `joinPassword` を最小8文字
  - `src/app/api/houses/route.ts` で作成時の `joinPassword` を空文字または8文字以上に制約

### H. CSV/集計の日付比較ルール監査
**状態:** ✅ 完了（2026-03-05）

混在比較の自動検知が未実施。

**対応状況（実装済み）:**
- `src/server/monthly-export.ts` の月判定を `startsWith("YYYY-MM")` 依存から共通ロジックへ変更
  - 日付のみ (`YYYY-MM-DD`) はそのまま月キー抽出
  - 日時文字列（ISO8601）は JST 基準で月キー化して比較
- `expenses` / `shopping` の月フィルタに共通月判定を適用
- `monthly-export` の並び順も日時パースで比較
- `src/server/monthly-export.test.ts` に境界時刻テストを追加
  - `checkedAt` が UTC 前月末でも JST 当月なら含まれることを確認

### I. Discord 通知要件
**状態:** ⏳ 未着手

外部通知を Discord Incoming Webhook に統一し、主要イベント（`task.completed`, `notice.created`, `expense.added`, `shopping.checked`）をリアルタイム共有する。通知設定はハウス単位、配信は非同期キュー方式。

---

## 3. 優先度: 低

### J. セキュリティヘッダー
**状態:** ✅ 完了（2026-03-05）

`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` を `next.config.ts` の headers で設定。
- 実装済み: `next.config.ts` に全パス向けヘッダー設定を追加

### K. Firestore インデックスの重複
**状態:** ✅ 完了（2026-03-05）

`firestore.indexes.json` に `auditLogs` の重複インデックスあり。不要な方を削除する。

**監査結果:**
- 現行の `auditLogs` インデックス2本は重複ではなく、用途が異なるため維持が妥当
  - `houseId + createdAt`（通常一覧）
  - `houseId + action + createdAt`（action絞り込み一覧）
- そのため削除対応は実施せず、設定は現状維持

### L. CSV エクスポートの運用拡張
**状態:** ✅ 完了（2026-03-05）

運用手順（配布先、命名規則、保管期間、再出力手順）を `docs/` に追記する。

**対応状況:**
- `docs/csv-export-operations.md` に運用手順を整備済み
- 2026-03-05 更新で月判定ルール（JST正規化）に関する注意事項も反映

### M. Lint/Format 強化
**状態:** 🟡 一部完了（2026-03-05）

lint ルールの厳格化、整形ルール統一。

**対応状況（実装済み）:**
- 既存 ESLint 警告（6件）を解消し、`npx eslint .` を警告ゼロ化
  - `scripts/migrate-add-house-id.ts` の未使用 import 削除
  - 同ファイルの `console.log` を標準出力書き込みへ置換
  - `src/app/settings/page.tsx` の未使用変数削除

**残課題:**
- ルールそのものの厳格化（例: 追加ルール導入、CIでの厳格運用）は未実施

### N. PWA/オフライン
**状態:** ⏳ 未着手

優先課題完了後に再評価。

---

## 4. セキュリティレビューで確認済み（問題なし）

| 項目 | 評価 |
|------|------|
| Firestore ルール | `allow read, write: if false` — 全クライアント直接アクセス拒否 |
| 秘密情報管理 | `.env.local` で管理、`.gitignore` 済み、ハードコードなし |
| 認証フロー | Firebase ID Token + Bearer ヘッダー、サーバー検証 |
| パスワードハッシュ | scrypt + salt + timingSafeEqual |
| 監査ログ | 全 CUD 操作をハウススコープで記録 |
| ハウススコープ分離 | 大半のルートで `resolveActorHouseId()` による適切なデータ分離 |
| CSRF | Bearer トークン認証のため暗黙的に保護 |
| XSS | React の自動エスケープ、`dangerouslySetInnerHTML` 使用なし |
| NoSQL インジェクション | Firestore SDK のパラメータ化クエリ使用 |
| 入力バリデーション | 全 API で Zod スキーマによる検証 |
| console.log | 機密情報のログ出力なし |
| eval/Function | 動的コード実行なし |
