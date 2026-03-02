# ShareHouseWork 改善案（DATABASE準拠）

最終更新: 2026-03-02
基準ドキュメント: `DATABASE.md`（Firestore設計）

---

## 1. 目的
- `IMPROVEMENTS.md` を現行の DB/実装定義に合わせる。
- Firestore 前提の運用改善項目を明確化する。
- 古い前提（LINE 連携前提、`/data/*.json` 前提）を除去する。
- 当面の対象外として、DB移行（RDB化）と認証基盤の刷新（NextAuth等）は扱わない。

---

## 2. 現状サマリー（2026-03-02）

| 項目 | 状態 |
|------|------|
| DB基盤 | Firestore（`DATABASE.md` 準拠） |
| 認証 | Firebase Auth の Bearer IDトークン検証（`verifyRequest()`） |
| LINE関連 | 実装・設計の主軸ではない（本ドキュメントから削除） |
| テスト | **27 pass / 0 fail** |
| 型チェック | `npx tsc --noEmit` 通過 |
| 監査ログ | 全CUD対応（rules/notices/task-completions/expenses/shopping） |
| API入力検証 | 手書きバリデーション中心（zod未導入） |
| 日付運用 | ISO8601 と `YYYY-MM-DD` が混在（`DATABASE.md` 記載どおり） |
| CI | `npm test` + `npm run build` 実行 |

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

### F. API統合テストの追加
- 現在の単体テストに加え、主要 API の正常系/異常系を追加。
- 対象優先: `task-completions`, `expenses`, `shopping`, `rules`。

---

## 5. 優先度: 中（高優先の次）

### B. APIバリデーションの統一（zod）

**現状**
- ルートごとに手書きバリデーションで実装。
- 文字列長や enum 制約がルートごとに散在。

**対応**
- `domain/*` もしくは `shared/*` に zod スキーマを集約。
- 共通エラー形式を定義（例: `{ error, code, details }`）。
- `DATABASE.md` の field 定義（型・必須）と API バリデーションを 1:1 で対応させる。

### C. 日付フォーマットの扱いを明示し、混在バグを予防

**現状**
- 設計上、日時（ISO8601）と日付（`YYYY-MM-DD`）が混在。
- 実装上は妥当だが、境界（比較/ソート/CSV）で事故が起きやすい。

**対応**
- `types/index.ts` で用途別の型 alias を明確化（例: `IsoDateTimeString`, `IsoDateString`）。
- API境界で正規化を必須化（入力即正規化）。
- CSV/集計ロジックで日時・日付を混在比較しない規約を追加。

### G. インデックス/クエリ運用の明文化
- `DATABASE.md` の主要クエリに対し、必要インデックスと運用手順を `docs/` に追加。
- 本番で追加が必要な複合インデックスが出た場合の更新手順を固定化。

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
| `package.json` `"type": "module"` | 完了 |
| `npm test` 27件 pass | 完了 |
| `npx tsc --noEmit` 通過 | 完了 |

---

## 8. 次の着手順（推奨）
1. F: API統合テストを追加
2. B + C: zod統一と日付型/正規化ルールをセットで導入
3. G: インデックス/クエリ運用を `docs/` に明文化
4. H: CSVエクスポートの運用手順を `docs/` に明文化
5. I: Lint/Format強化

---

## 9. 直近の確認ログ
- `npm test`: 27 pass / 0 fail
- `npx tsc --noEmit`: エラーなし
- CI: `.github/workflows/ci.yml` で `npm test` と `npm run build` を実行

---

## 10. 対象内タスクの進捗

DB移行・認証基盤刷新を除く、現時点の作業進捗です。

| 項目 | 進捗 | 推奨優先度 | 補足 |
|---|---|---|---|
| Firestore ルール最小権限化 | 完了 | 高 (1) | クライアントからの Firestore 直接 read/write を禁止（API経由のみ）。 |
| `actor.name` 永続化方針の明文化 | 完了 | 高 (2) | 記録時の表示名スナップショット固定を採用（再解決なし）。 |
| 監査ログの全CUD対応 | 完了 | 高 (3) | `rules/notices/task-completions/expenses/shopping` のCUDログを実装。 |
| API統合テスト | 未着手 | 高 (4) | ユニットテストは整備済み（27 pass）。 |
| APIバリデーション統一（zod） | 未着手 | 中 (5) | 手書きバリデーション中心。 |
| 日付型/正規化ルール整備 | 一部完了 | 中 (5, Bとセット) | ユーティリティ整備済み。型とAPI境界の統一は未完。 |
| クエリ/インデックス運用明文化 | 未着手 | 中 | `DATABASE.md` はあるが運用手順化は未実施。 |
| CSV運用拡張 | 一部完了 | 低 | `task/expenses/shopping` 出力は対応済み。運用向け整備は継続。 |
| Lint/Format強化 | 未着手 | 低 | ルール厳格化・整形統一はこれから。 |
