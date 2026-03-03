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

## 4. 優先度: 高（先に着手）

### L. 認証なし公開エンドポイントの修正（新規・最優先）

**発見日: 2026-03-03**

以下のエンドポイントが `verifyRequest()` を呼んでおらず、未認証でアクセス可能な状態。

| ルートファイル | メソッド | 問題 |
|---|---|---|
| `src/app/api/exports/monthly.csv/route.ts` | GET | 月次CSVデータ全件が認証なしでダウンロード可能 |
| `src/app/api/tasks/route.ts` | GET | タスク一覧が認証なしで取得可能 |
| `src/app/api/users/route.ts` | GET | 全ユーザー情報（名前・メール・色）が認証なしで取得可能 |
| `src/app/api/houses/route.ts` | GET | 全ハウス情報が認証なしで取得可能 |

**補足: POST の扱い**
- `/api/users` POST と `/api/houses` POST も認証なしだが、登録フロー（Firebase Auth トークン取得直後）で使用している可能性がある。
- 設計意図を確認した上で対応方針（認証追加 or 意図的公開の明文化）を決める。

**対応方針**
- 上記 GET エンドポイントに `verifyRequest()` を追加する。
- POST については設計意図をコメントで明記するか、同様に認証を追加する。

---

### M. `/api/exports/monthly.csv` の `month` パラメータ検証漏れ（新規）

**発見日: 2026-03-03**

`src/app/api/exports/monthly.csv/route.ts` の `resolveMonth()` は `YYYY-MM` 形式を検証せず、
不正な値（例: `2024-13`, `invalid`）がそのまま `buildMonthlyOperationsCsv()` に渡される。

**対応方針**
- `/api/exports/monthly.csv` の GET に zod バリデーションを追加し、`month` が `YYYY-MM` 形式であることを検証する。
- 認証追加（項目 L）と同時に対応する。

---

### E. Firestore セキュリティルールの最小権限化

**現状（対応前）**
- `request.auth != null` で広く read/write 可能。

**対応状況**
- クライアントからの Firestore 直接 read/write を禁止（API経由のみ）に変更済み。
- 次段で Emulator ルールテストを追加予定。

### D. `actor.name` 永続化方針の明文化

**決定（2026-03-02）**
- 履歴の `actor.name` / `*By` は「記録時の表示名スナップショットを固定保存」する。
- 後日の表示名変更時に、既存履歴の表示名は再解決しない。

**対応**
- `DATABASE.md` / `Overview.md` に方針を反映。
- 監査ログ・履歴APIの実装は現行方針（固定保存）に合わせて維持。

### A. 監査ログの対象を全 CUD に拡張

**現状（対応後）**
- 実装済み:
  - `rules`: 作成/更新/確認/削除
  - `notices`: 作成/削除
  - `taskCompletions`: 作成/取消
  - `expenses`: 作成/取消
  - `shoppingItems`: 作成/チェック/取消/未購入戻し

**対応状況**
- `expenses` / `shopping` API に `appendAuditLog` を追加済み。
- `AuditAction` を不足分まで拡張済み。
- 重複ログ抑止のため、既取消/既チェック状態の再実行では監査ログを追加しないよう調整。

### F. API統合テストの運用継続
- 主要 API（`task-completions`, `expenses`, `shopping`, `rules`）は正常系/異常系の統合テスト追加済み。
- 今後は新規 API 追加時の同時テスト追加を運用ルール化する。

---

## 5. 優先度: 中（高優先の次）

### B. APIバリデーションの統一（zod）

**対応状況（2026-03-02）**
- `task-completions` / `expenses` / `shopping` / `rules` / `notices` / `tasks` / `houses` API に zod スキーマを導入。
- `shared/lib/api-validation.ts` に共通スキーマ（trim, ISO日付, ISO日時）を追加。
- エラー形式を段階統一（主要APIで `{ error, code, details }` を返却）。

**残課題**
- `/api/audit-logs/route.ts`: `parseLimit()` / `parseDate()` の手動バリデーションを zod に置き換える。エラーレスポンスに `details` を追加する。
- `/api/exports/monthly.csv/route.ts`: `month` クエリパラメータの zod バリデーションを追加する（項目 M と統合）。
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

---

## 8. 次の着手順（推奨）
1. ~~**L + M**: 認証なしエンドポイントの修正 + `/exports/monthly.csv` の month バリデーション追加~~ **完了（2026-03-03）**
2. E: Firestore Emulator のルールテストを追加（最小権限化の回帰防止）
3. B + C: 残APIへの zod/日付正規化ルール展開とエラー形式統一（`audit-logs` が残存）
4. K: Discord 通知の MVP 実装（設定・キュー・非同期送信）
5. H: CSVエクスポートの運用手順を `docs/` に明文化
6. I: Lint/Format強化

---

## 9. 直近の確認ログ
- `npm test`: 52 pass / 0 fail
- `npx tsc --noEmit`: エラーなし
- CI: `.github/workflows/ci.yml` で `npm test` と `npm run build` を実行（NEXTAUTH 環境変数削除済み）
- 実装調査（2026-03-03）: `/exports/monthly.csv`, `/tasks` GET, `/users` GET, `/houses` GET に認証なしを確認

---

## 10. 対象内タスクの進捗

DB移行・認証基盤刷新を除く、現時点の作業進捗です。

| 項目 | 進捗 | 推奨優先度 | 補足 |
|---|---|---|---|
| Firestore ルール最小権限化 | 完了 | 高 (1) | クライアントからの Firestore 直接 read/write を禁止（API経由のみ）。 |
| `actor.name` 永続化方針の明文化 | 完了 | 高 (2) | 記録時の表示名スナップショット固定を採用（再解決なし）。 |
| 監査ログの全CUD対応 | 完了 | 高 (3) | `rules/notices/task-completions/expenses/shopping` のCUDログを実装。 |
| API統合テスト | 完了 | 高 (4) | `task-completions/expenses/shopping/rules` の統合テストを追加済み。 |
| API統合テスト運用 | 一部完了 | 高 (4) | 主要APIは対応済み。新規API追加時の同時テスト追加ルール化が残課題。 |
| APIバリデーション統一（zod） | 一部完了 | 中 (5) | `task-completions/expenses/shopping/rules/notices/tasks/houses` は対応。残りAPIへ展開中。 |
| 日付型/正規化ルール整備 | 一部完了 | 中 (5, Bとセット) | 型alias追加とAPI境界の正規化を導入。CSV/集計側の監査は継続。 |
| クエリ/インデックス運用明文化 | 完了 | 中 | `docs/firestore-query-index-operations.md` を追加し、運用手順を文書化。 |
| Discord通知要件定義 | 完了 | 中 | Webhook前提のMVP要件（キュー/再送/冪等/監視/秘匿）を本書に追記。 |
| Discord通知実装 | 未着手 | 中 | 要件定義済み。`notificationSettings`/`notificationQueue` と送信Worker実装が必要。 |
| 認証なしエンドポイントの修正（L） | 完了 | 高（最優先） | `/exports/monthly.csv`, `/tasks` GET, `/users` GET, `/houses` GET に `verifyRequest()` 追加済み（2026-03-03）。 |
| `exports/monthly.csv` の month バリデーション（M） | 完了 | 高 | `YYYY-MM` 形式の zod バリデーション追加済み（2026-03-03）。L と同時対応。 |
| CI の NEXTAUTH 環境変数削除 | 完了 | 高 | `ci.yml` から不要な `NEXTAUTH_SECRET` / `NEXTAUTH_URL` を削除済み（2026-03-03）。 |
| 設定画面ログアウト | 完了 | 低 | `settings` から `signOut()` 実行後に `/login` へ遷移。 |
| 通知設定の文言整備 | 完了 | 低 | 通知UIの `LINE` 表記を `メール` に統一。 |
| CSV運用拡張 | 一部完了 | 低 | `task/expenses/shopping` 出力は対応済み。運用向け整備は継続。 |
| Lint/Format強化 | 未着手 | 低 | ルール厳格化・整形統一はこれから。 |
