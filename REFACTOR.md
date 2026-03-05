# REFACTOR.md

最終更新: 2026-03-05  
対象: ShareHouseWork 全体

## 1. 目的

- 機能追加前に、保守性・安全性・変更容易性を上げる
- API/Server/Domain/UI の責務境界を明確化し、修正時の影響範囲を縮小する
- テストと運用手順を整備し、回帰不具合と本番反映リスクを下げる

## 2. リファクタリング方針

- 振る舞いを変えない変更を優先し、機能変更は別PRで実施する
- 1フェーズごとに `lint` / `typecheck` / `test` / `build` を通す
- 影響の大きい変更は「先にテスト追加、後で実装変更」の順で進める
- 公開リポジトリ前提で秘密情報を含む差分を作らない

## 3. 現状の論点（要約）

- `src/app/api/**` と `src/server/api/**` で処理分担はあるが、認可・バリデーション・レスポンス整形の実装揺れが残る
- ドメインごとの型が `src/types/index.ts` に集中し、変更時の依存影響が大きい
- Store 層にクエリ条件・変換処理・監査考慮が混在し、意図が追いにくい箇所がある
- テストは存在するが、ユースケースの共通失敗パターン（認可失敗・不正入力・境界値）の網羅に偏りがある
- ドキュメントは充実しているため、実装側との同期を運用手順として固定すると効果が高い

## 4. 全体計画（フェーズ）

## Phase 0: ベースライン固定（1日）

- 実施内容
  - 現在のテスト/ビルド結果を記録し、以後の比較基準を作る
  - ディレクトリ責務を `DIRECTORY.md` と一致確認
  - `npm run lint && npm run typecheck && npm test && npm run build` の実行結果を保存
- 完了条件
  - 4コマンドの結果が再現可能
  - 既知失敗がある場合は原因と暫定対応を記録済み

## Phase 1: API 境界の統一（2-3日）

- 実施内容
  - `src/app/api/**/route.ts` を「ルーティング + 入出力変換」に限定
  - 認証/認可/監査ログの実処理を `src/server/api/**` に寄せる
  - エラーコード体系（`errorJson` / `api-error`）を統一
  - Zod バリデーション呼び出し位置を統一（Route か UseCase かを固定）
- 完了条件
  - 主要APIで同じ失敗ケースに同じHTTPステータス・エラー形式が返る
  - Route 層の重複ロジックが削減される

## Phase 2: 型とモジュール境界の整理（2-3日）

- 実施内容
  - `src/types/index.ts` の肥大化を解消し、ドメイン別型へ分割
  - `src/domain/**` の入出力型を明示し、UI/DB 依存型を分離
  - API公開型（レスポンス型）と内部永続化型（Firestore型）を分離
- 完了条件
  - 型変更時の影響範囲がドメイン単位で追える
  - `any` / あいまいな型推論依存が減っている

## Phase 3: Store 層の一貫性改善（3-4日）

- 実施内容
  - `*-store.ts` の責務を「Firestore I/O + 変換」に限定
  - クエリ条件・ソート・ページング規約を共通化
  - `docTo*` 系変換関数を明示フィールド選択に統一
  - 監査ログ対象操作の境界を明文化（UseCase責務と切り分け）
- 完了条件
  - 主要Storeで命名規約（`read/list/create/update`）が揃う
  - レスポンスに不要フィールド混入リスクが低減

## Phase 4: テスト再編と不足補完（3-4日）

- 実施内容
  - テストを「Domain / Server API / Store / Rules」に役割整理
  - 失敗系テスト（401/403/409/422/429）を主要APIで補強
  - 共有テストヘルパーを導入し、重複セットアップを削減
- 完了条件
  - 主要APIの正常系・異常系が最小セットで網羅
  - 変更時に壊れた箇所を特定しやすいテスト構造になる

## Phase 5: フロントエンド分割（2-3日）

- 実施内容
  - `src/components` の肥大コンポーネントを分割（表示/状態/データ取得）
  - `hooks` の責務を整理し、API通信とUI状態管理を分離
  - `shared/lib/fetch-client.ts` と `submit-api-action.ts` の利用パターンを統一
- 完了条件
  - 画面単位の変更で触るファイル数が減る
  - UIロジックとAPIロジックの混在が減る

## Phase 6: ドキュメント・運用同期（1日）

- 実施内容
  - `Overview.md` / `DIRECTORY.md` / `DATABASE.md` / `IMPROVEMENTS.md` を実装と同期
  - 変更時チェックリストを追加（型変更、インデックス、監査ログ、セキュリティ）
  - SecretスキャンコマンドをPR前チェックに固定
- 完了条件
  - 新規参加者がドキュメントだけで構成と運用手順を追える
  - ドキュメントの更新漏れ検知ルールが明文化される

## 5. 進め方（推奨）

- 1フェーズ = 1PR を基本とする（レビュー容易化）
- 各PRに以下を必須記載
  - 変更目的
  - 非機能影響（性能/セキュリティ/運用）
  - テスト結果
  - ドキュメント更新有無
- 大規模移動（ファイル分割）は、挙動変更PRと分離する

## 6. 優先実行順（着手順）

1. Phase 0（ベースライン固定）
2. Phase 1（API境界統一）
3. Phase 3（Store一貫性）  
4. Phase 2（型整理）
5. Phase 4（テスト補完）
6. Phase 5（フロント分割）
7. Phase 6（ドキュメント同期）

※ 実装影響の大きい `Phase 2` は、`Phase 1/3` で責務を安定化させた後に着手する。

## 7. KPI（完了判定の定量目安）

- `npm run lint` / `npm run typecheck` / `npm test` / `npm run build` が常時成功
- 主要APIの異常系テスト件数が現状比で増加
- 1機能修正あたりの変更ファイル数が減少（体感でなくPR実績で確認）
- ドキュメント更新漏れゼロ（PRテンプレート運用）

## 8. リスクと対策

- リスク: 型分割時の広範囲コンパイルエラー  
  対策: エクスポート互換レイヤーを一時配置し段階移行

- リスク: Store変更でクエリ性能が悪化  
  対策: `firestore.indexes.json` を同時更新し、実行クエリを確認

- リスク: リファクタ中の仕様混入  
  対策: 「仕様変更禁止」をPRテンプレートで明示し、別PRへ分離

## 9. 直近アクション（次の1週間）

1. Phase 0 を実施し、ベースライン結果を `IMPROVEMENTS.md` に記録
2. API 2-3本を対象に Phase 1 のテンプレート実装を作成
3. `docTo*` 変換の明示化対象を洗い出し、Phase 3 の作業チケット化

## 10. Phase 0 チェックリスト（実行用）

実施日: `YYYY-MM-DD`  
実施者: `name`

### 10.1 事前確認

- [ ] `git status` で差分を確認（意図しない変更がない）
- [ ] `.env.local` が開発用設定になっている
- [ ] 依存がインストール済み（`npm ci` または `npm install` 済み）

### 10.2 ベースライン実行

以下を順番に実行し、結果を記録する。

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### 10.3 記録テンプレート

| Check | Command | Result | Notes |
|---|---|---|---|
| Lint | `npm run lint` | `PASS / FAIL` | 失敗時は最初の1件を記録 |
| Typecheck | `npm run typecheck` | `PASS / FAIL` | 型エラー件数を記録 |
| Test | `npm test` | `PASS / FAIL` | 失敗したテスト名を記録 |
| Build | `npm run build` | `PASS / FAIL` | 失敗時は原因（例: フォント取得） |

### 10.4 追加確認（推奨）

- [ ] `npm run test:firestore-rules` を実行してルールテスト結果を記録
- [ ] 失敗項目を `IMPROVEMENTS.md` の「未完了タスク一覧」に転記
- [ ] 実行ログに秘密情報が含まれていないことを確認

### 10.5 Secret スキャン（コミット前必須）

```bash
rg -n --hidden -S "(api[_-]?key|apikey|secret|token|private[_-]?key|client[_-]?secret|BEGIN [A-Z ]+PRIVATE KEY|x-api-key|authorization:|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})" .
```

### 10.6 Phase 0 完了条件（チェック）

- [ ] 主要4コマンドの結果が記録済み
- [ ] FAIL がある場合、再現手順と暫定対応を記録済み
- [ ] `IMPROVEMENTS.md` と差分内容が同期済み

### 10.7 最新実行結果（2026-03-05）

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS（97 passed / 0 failed）
- `npm run build`: PASS（`middleware` deprecation warning のみ）
- `npm run test:firestore-rules`: FAIL（`port 8080 taken`）
- 詳細記録先: `IMPROVEMENTS.md` の `R0` セクション

## 11. Phase 1 完了レビュー（チェックリスト）

### 11.1 Route 層責務

- [x] `src/app/api/**/route.ts` が「依存注入 + ハンドラ呼び出し」の薄い層になっている
- [x] 認証・認可・バリデーション・監査ログは `src/server/api/**` 側に集約されている
- [x] 主要 Route で `export const runtime = "nodejs";` が統一されている

### 11.2 エラー形式

- [x] `INVALID_JSON` は共通形式（`error`, `code`, `details`）で返る
- [x] `VALIDATION_ERROR` は `validationError()` 経由で返る
- [x] 同一エラーコードでメッセージの揺れがない（例: `*_NOT_FOUND`）

### 11.3 認証・ハウス解決

- [x] 認証は `resolveAuthenticatedActor()` または `resolveHouseScopedContext()` を利用
- [x] `NO_HOUSE` の返却条件が API 間で一貫している
- [x] Route 層での `verifyRequest()` 直書きロジックが残っていない

### 11.4 検証

- [x] `npm run lint` が成功
- [x] `npm run typecheck` が成功
- [x] `npm test` が成功
- [x] 実施結果を `IMPROVEMENTS.md` に同期済み

### 11.5 判定

- Phase 1 は **完了**（チェック 14/14 完了）
- 備考: `audit-logs` / `settings/contribution` / `exports/monthly.csv` の Route 直書き認証を `src/server/api` へ移管済み

## 12. Phase 4 進捗レビュー（2026-03-05）

### 12.1 テスト再編

- [x] `src/server/api/test-helpers.ts` を追加し、主要 API テストの認証セットアップを共通化
- [x] 重複していた `verifyRequest` / `unauthorizedResponse` / `resolveActorHouseId` の記述を削減

### 12.2 失敗系補完

- [x] `401`（未認証）を `audit-logs` / `rules` / `notices` / `houses join` に追加
- [x] `429`（レート制限）を `houses join` に追加
- [x] `403` / `404` / `409` の既存主要ケースが継続して通ることを確認
- [x] `422` の採用方針を API 全体で明文化（現状は `400 VALIDATION_ERROR` を継続）

### 12.3 Rules / Store

- [x] `firestore.rules.test.ts` の初期化重複をヘルパー化
- [x] Rules で認証済みクライアント書き込み拒否テストを追加
- [x] Store 補助ユーティリティとして `month-range` の単体テストを追加
- [x] `store-utils` の単体テストを追加（`read/list/create/update`）
- [x] `task-store` / `expense-store` の単体テストを追加（read/list/create/update）
- [x] `notice-store` / `rule-store` / `shopping-store` / `task-completions-store` の単体テストを追加
- [x] `audit-log` / `balance-adjustment` / `user` / `house` / `contribution-settings` store の単体テストを追加

### 12.4 検証

- [x] `node --test --experimental-strip-types "src/server/api/*.test.ts"` が成功（71/71）
- [x] `npm test` が成功（167/167）
- [x] `npm run lint` が成功
- [x] `npm run typecheck` が成功
