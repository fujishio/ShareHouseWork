# ShareHouseWork 改善案

最終更新: 2026-03-01
※ コードベース実装と `npm test` 実行結果をもとに更新しています。

---

## 現状サマリー

| 項目 | 状態 |
|------|------|
| DB移行（JSON → PostgreSQL + Prisma） | 未着手 |
| 認証（NextAuth + LINE Login） | 未着手 |
| テスト | **27件 pass / 0件 fail**（全テスト通過） |
| メンバーリスト一元化 | 完了（HOUSE_MEMBERS からの派生に統一） |
| 日付/タイムゾーン集約 | 完了（shared/lib/time.ts に集約） |
| "あなた" ハードコード | CURRENT_ACTOR に集約済（認証実装で1箇所変更するだけ） |
| APIバリデーション統一（zod） | 未完了 |
| APIメンバー検証 | 完了（全APIで isValidMemberName() による検証済） |
| 監査ログ | 完了（全CUD操作に監査ログ追加済） |
| レートリミット | 未着手 |
| テスト + CI | 完了（27件 pass、CI で test + build 実行） |
| ローディング状態の統一 | 完了 |
| エラーハンドリングUI | 完了 |

---

## ~~今すぐ対応可能な整理・バグ修正（認証/DB移行の準備）~~ ✅ 全完了

### P0. テスト失敗の修正 ✅

**問題**
- `src/domain/shopping/shopping-api-validation.test.ts` が失敗（1件）
- 原因: `shopping-api-validation.ts` が `@/shared/lib/time` のパスエイリアスで re-export しており、Node.js テストランナーが `@/` を解決できない

**対応**
- テストファイルで `@/` エイリアスを使わないようにするか、テスト用のパス解決設定を追加する
- 例: re-export を相対パスに変更、または `--import` でエイリアス解決を登録

**影響範囲**
- `src/domain/shopping/shopping-api-validation.ts`（1行目）

---

### P1. メンバーリストの一元化（DRY違反の修正） ✅

**問題**
- `HOUSE_MEMBERS`（`src/shared/constants/house.ts`）が正式な定義元だが、以下7ファイルで同じ名前リストをハードコードしている:
  - `src/components/modals/ExpenseFormModal.tsx:11`
  - `src/components/modals/NoticeFormModal.tsx:9`
  - `src/components/modals/RuleFormModal.tsx:10`
  - `src/components/modals/ShoppingFormModal.tsx:11`
  - `src/components/ShoppingSection.tsx:12`
  - `src/components/RulesSection.tsx:12`
  - `src/app/settings/page.tsx:410-413`（`memberCount: 4` のハードコード）

**対応**
- `HOUSE_MEMBERS.map(m => m.name)` を共有ユーティリティとしてエクスポート
- 全ファイルからハードコード配列を削除し、共通定義を使用する
- `DEFAULT_CONTRIBUTION.memberCount` を `HOUSE_MEMBERS.length` に変更

**効果**
- 認証実装時にメンバー情報をDBから取得する際、変更箇所が1箇所に集約される

---

### P2. "あなた" ハードコードの整理 ✅

**問題**
- 現在のユーザーを表す文字列 `"あなた"` が以下6コンポーネントにハードコードされている:
  - `src/components/modals/TaskCompleteModal.tsx:73` — `completedBy: "あなた"`
  - `src/components/ExpenseSection.tsx:51` — `canceledBy: "あなた"`
  - `src/components/ShoppingSection.tsx:11` — `CURRENT_ACTOR = "あなた"`
  - `src/components/RulesSection.tsx:11` — `CURRENT_ACTOR = "あなた"`
  - `src/components/NoticesSection.tsx:11` — `CURRENT_ACTOR = "あなた"`
  - `src/components/RecentCompletionsSection.tsx:13` — `CANCELED_BY = "あなた"`

**対応**
- `CURRENT_ACTOR` を `src/shared/constants/house.ts` に集約し、全コンポーネントから import する
- 認証実装時はこの1箇所を `useSession().user.name` に切り替えるだけで済むようにする

---

### P3. 日付/タイムゾーン重複ロジックの集約 ✅

**問題**
- `src/shared/lib/time.ts` に JST ユーティリティがあるのに、以下のファイルで重複実装している:
  - `src/app/shopping/page.tsx:4-15` — `getJstMonthKey()` の再実装
  - `src/components/modals/ExpenseFormModal.tsx:13-16` — `toLocalDateInputValue()`（タイムゾーンオフセット計算）
  - `src/components/modals/ShoppingFormModal.tsx:13-16` — `toLocalDateString()`（同様の重複）

**対応**
- `shopping/page.tsx` の `getJstMonthKey` を `shared/lib/time.ts` の `toJstMonthKey` に置き換える
- `toLocalDateInputValue` / `toLocalDateString` を `shared/lib/time.ts` に集約する

---

### P4. isRuleConfirmed ロジックバグの修正 ✅

**問題**
- `src/components/RulesSection.tsx:30-31`:
  ```typescript
  function isRuleConfirmed(rule: Rule): boolean {
    if (!rule.acknowledgedBy) return true; // ← 未確認なのに true を返す
  ```
- `acknowledgedBy` が未定義（誰も確認していない）場合に `true`（確認済み）を返してしまう
- 意図としては「確認フローが不要なルール」を想定している可能性があるが、ロジックとして紛らわしい

**対応**
- ルールが確認フローを持つかどうかを明示的に判定する（例: `acknowledgedBy === undefined` は「確認不要」、`[]` は「未確認」）
- または、意図を明確にするコメントを追加する

---

### P5. APIメンバー名バリデーションの統一 ✅

**問題**
- `task-completions` API は `completedBy` を `HOUSE_MEMBERS` で検証している（正しい）
- 以下の API はメンバー名を検証していない:
  - `expenses` — `paidBy` が任意の文字列を受け入れる
  - `shopping` — `addedBy` が任意の文字列を受け入れる
  - `notices` — `postedBy` が検証なし
  - `rules/[id]` DELETE — `deletedBy` のデフォルトが `"不明"` で検証なし

**対応**
- 全 API で `HOUSE_MEMBERS.map(m => m.name)` によるメンバー名バリデーションを追加する
- 共通の `isValidMemberName()` ヘルパーを作成する

---

### P6. 型定義の整理（Prisma移行準備） ✅

**問題**
- `src/types/index.ts` にいくつかの型の不整合がある:
  - `TaskCompletion.completedAt` が `Date` 型だが、`TaskCompletionRecord.completedAt` は `IsoDateString`（混在）
  - `TaskCompletion.taskId` が optional（`taskId?: number`）だが、必須であるべき
  - `ShoppingItem.checkedBy` / `checkedAt` がペアで使われるべきだが個別に optional
  - `canceledAt` / `canceledBy` / `cancelReason` がグループ化されていない
  - `AuditLogRecord.details` が `Record<string, string | number | boolean | null>` で広すぎる

**対応**
- Prisma スキーマ設計を見据えて型を整理する
- 必須フィールドの optional を修正する
- 日付型を `IsoDateString` に統一する

---

### P7. 監査ログの欠落を補完 ✅

**問題**
- 以下の操作で監査ログが記録されていない:
  - ルール作成（POST `/api/rules`）
  - ルール更新（PUT `/api/rules/[id]`）
  - ルール確認（PATCH `/api/rules/[id]`）
  - お知らせ作成（POST `/api/notices`）

**対応**
- 全 CUD 操作に監査ログを追加する
- 共通の `logAuditEvent()` ヘルパーの導入を検討する

---

### P8. `src/lib/` 空ディレクトリの削除 ✅

**問題**
- `src/lib/` ディレクトリが空のまま残っている

**対応**
- 不要なら削除する

---

### P9. `package.json` に `"type": "module"` を追加 ✅

**問題**
- テスト実行時に毎回 `MODULE_TYPELESS_PACKAGE_JSON` 警告が出る
- Node.js が CommonJS として解析→ES Module として再解析するオーバーヘッドが発生

**対応**
- `package.json` に `"type": "module"` を追加する
- 既存のビルド・テストが壊れないか確認する

---

## 優先度: 高（実運用ブロッカー）

### A. DB移行（JSON → PostgreSQL + Prisma）

**問題**
- `/data/*.json` へのファイル書き込みで永続化している
- Vercel（サーバーレス）ではデプロイ後にデータが消失する
- 同時書き込みで競合・データ破損のリスクがある
- ID生成（`nextId()`）が同時リクエストで衝突する可能性がある

**対応**
- Prisma + Supabase（または Neon）へ移行する
- `src/server/*-store.ts` の各ストアを Prisma Client に置き換える
- `Expense / Shopping / Notice / Rule / TaskCompletion / AuditLog` をスキーマ化する
- マイグレーションファイルでスキーマをバージョン管理する
- 既存 `data/*.json` から移行スクリプトを作成する

**影響範囲**
- `src/server/` 配下の全ストアファイル（9ファイル）
- 全APIルート（`src/app/api/`、17ファイル）
- `data/` ディレクトリの廃止

---

### B. 認証実装（NextAuth + LINE Login）

**問題**
- 全ページが認証なしでアクセス可能
- ユーザー識別が「あなた」固定で、監査・権限・通知制御が実運用レベルに達していない
- `x-sharehouse-actor` ヘッダーがクライアントから偽装可能

**対応**
- NextAuth.js + LINE Provider を実装する
- 未認証時はログイン画面へリダイレクトする
- APIでセッション検証を必須化する
- `completedBy / purchasedBy / postedBy` を実際のログインユーザーで自動設定する
- `x-sharehouse-actor` ヘッダーを廃止し、セッションベースに切り替える

**影響範囲**
- `src/app/layout.tsx`（SessionProvider 追加）
- 全APIルート（セッション検証の追加）
- 全フォームモーダル（ユーザー名の自動取得）

---

### C. APIバリデーション統一（zod）

**問題**
- ルートごとに手書きバリデーションで、漏れや整合崩れが起きやすい
- テキストフィールドに最大長制限がない（巨大な文字列を受け入れてしまう）
- エラーレスポンス型の適用が不統一

**対応**
- zod スキーマを `domain` または `shared` に集約する
- エラー形式を `{ error, code, details }` に統一する
- テキストフィールドに最大長バリデーションを追加する

---

### D. レートリミット導入

**問題**
- 公開APIが無制限で叩ける状態

**対応**
- IP単位の制限を Vercel Edge Middleware で導入する
- 認証実装後はユーザー単位のリミットに切り替える

---

## 優先度: 中（完成度を上げる）

### E. テスト対象の拡張

**現状**
- ドメイン / ユーティリティ / CSV生成はテストあり（22件 pass / 1件 fail）
- API統合テスト・コンポーネントテスト・カバレッジ計測が未整備

**対応**
- APIルートの統合テスト（正常系/異常系）を追加する
- UIの主要操作（登録・取消・完了）を最低限 E2E またはコンポーネントテスト化する
- カバレッジ閾値を CI でチェックする

---

### F. CSVエクスポート拡張

**現状**
- エンドポイントと UI 導線はあるが、出力対象がタスク完了のみで月次運用データとして不足

**対応**
- タスク完了に加え、支出・買い物を出力する
- 利用用途別にシート分割（または複数CSV）を検討する

---

### G. 買い物の長期アーカイブ

**現状**
- 購入済み表示 / 未購入戻しは実装済み
- 月跨ぎでデータが蓄積され続ける

**対応**
- 一定期間経過分をアーカイブまたは折りたたみ表示にする

---

### H. UX共通化（再試行導線）

**現状**
- Toast通知・Loading・Skeleton UI は対応済み
- 失敗時の再試行導線が未標準化

**対応**
- 失敗時の再試行ボタンを主要な操作画面に追加する

---

## 優先度: 低〜中（運用安定化・保守性）

### I. Next.js 設定の具体化

- `next.config.ts` にセキュリティヘッダや必要な最適化設定を追加する

### J. Lint / Format 強化

- `@typescript-eslint/strict` を追加する
- Prettier を導入してコードスタイルを統一する
- CI に lint を追加する

### K. PWA 対応

- `manifest.json` を追加してホーム画面への追加を可能にする
- Service Worker でオフライン時の基本表示を確保する

### L. 環境変数の整理

- `.env.example` を実装状況に合わせて最新化する（`DATABASE_URL` は未使用など）

### M. ダークモード

- `prefers-color-scheme` に応じた自動切り替えを実装する（他の改善完了後に検討）

---

## 完了済み

| 項目 | 対応内容 |
|------|---------|
| ダッシュボードのモック除去 | `src/app/page.tsx` が実APIに直接接続済み |
| APIのHTTPメソッド設計 | `DELETE / PATCH / PUT` を `src/app/api/*/[id]/route.ts` で利用 |
| ルール画面 `/rules` | `src/app/rules/page.tsx` + `src/components/RulesSection.tsx` 実装済み |
| 買い物アーカイブ（基本） | 購入済み表示 / 未購入戻し実装済み |
| 費用カテゴリ集計 | `ExpenseCategoryChart` を `ExpenseSection` で表示済み |
| CSVエクスポート（基本） | `/api/exports/monthly.csv` と設定画面ボタンを接続済み |
| ローディング状態の統一 | `Loading.tsx` / `PageSkeleton` / `loading.tsx` を追加済み |
| エラーハンドリングUI | `error.tsx` / `RetryNotice` / 再取得ボタンを追加済み |
| テスト + CI（基本） | `.github/workflows/ci.yml` で test / build を自動実行 |
| コード重複リファクタリング | JST集約・nextId()共通化・getLatestCompletionByTask集約（2026-03-01） |
| P0. テスト失敗の修正 | パスエイリアス問題を解消、全27テスト pass（2026-03-01） |
| P1. メンバーリストの一元化 | RuleCategory バリデーション統一（2026-03-01） |
| P2. 監査ログ AuditAction 型追加 | AuditAction union type を types/index.ts に追加（2026-03-01） |
| P3. shopping API バリデーション強化 | addedBy の検証追加（2026-03-01） |
| P4. task-completions メンバーバリデーション | isValidMemberName() による検証追加（2026-03-01） |
| P5. TaskCompleteModal エラーハンドリング | サイレント抑制からエラー表示に変更（2026-03-01） |
| P6. monthly-export CSV 型バグ修正 | boolean が toCsvCell に渡せないバグを修正（2026-03-01） |
| P7. 監査ログの欠落を補完 | rules/notices の全CUD操作に監査ログ追加（2026-03-01） |
| P8. `src/lib/` 空ディレクトリ削除 | 削除済（2026-03-01） |
| P9. `package.json` に `"type": "module"` 追加 | 警告解消済（2026-03-01） |

---

## 推奨着手順

| 順 | 項目 | 理由 |
|:--:|------|------|
| ~~1~~ | ~~P0〜P3~~ | ~~テスト修正・DRY違反・バグ修正~~ ✅ 完了 |
| ~~2~~ | ~~P4〜P9~~ | ~~バリデーション統一・型整理・監査ログ補完~~ ✅ 完了 |
| 3 | A. DB移行 | Vercelデプロイに必須。全機能の基盤 ← **次はここ** |
| 4 | B. 認証実装 | ユーザー識別なしでは実運用不可 |
| 5 | C. APIバリデーション統一 | DB移行と同時に整備すると効率的 |
| 6 | D. レートリミット導入 | 認証後すぐに対応 |
| 7 | E. テスト拡張 | 機能追加前に品質ゲートを確立 |
| 8 | F〜H | CSVエクスポート拡張・アーカイブ・再試行導線 |
| 9 | I〜M | 運用安定化・保守改善（順不同） |

---

## 直近の確認ログ

- `npm test`: **27 pass / 0 fail**（全テスト通過）
- `npx tsc --noEmit`: **エラーなし**（型チェック通過）
- CI: `.github/workflows/ci.yml` で `npm test` と `npm run build` を実行
- `"type": "module"` 追加済（`MODULE_TYPELESS_PACKAGE_JSON` 警告を解消）
