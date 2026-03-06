# TASKS.md — 実施すべきタスク一覧

作成日: 2026-03-03
更新日: 2026-03-05
依拠ドキュメント: `IMPROVEMENTS.md`, `Overview.md`, `DATABASE.md`

---

## タスク一覧サマリー（優先順）

| 優先度 | ID | タイトル | 状態 | Phase |
|--------|----|---------|----|-------|
| 高 | TASK-SEC1 | Cookie セキュリティ属性の追加 | 完了 | 5.1 |
| 中 | TASK-SEC2 | セキュリティヘッダーの追加 | 完了 | 5.1 |
| 中 | TASK-OPT1 | デッドコード・不要コードの削除 | 完了 | 7 |
| 中 | TASK-OPT2 | 重複ユーティリティ関数の統合 | 完了 | 7 |
| 中 | TASK-OPT3 | 重複ロジックのカスタムフック化 | 未着手 | 7 |
| 低 | TASK-OPT4 | loading.tsx の拡充 | 未着手 | 7 |
| 低 | TASK-P11 | auditLog に actorUid を追加 | 未着手 | 6 |
| 低 | TASK-8 | PWA / オフライン対応 | 後段再評価 | 6 |

---

## Phase 5.1 — セキュリティ修正

### TASK-SEC1: Cookie セキュリティ属性の追加

**状態**: 完了
**優先度**: 高

**発覚した問題**

`src/context/AuthContext.tsx` で設定している ID トークン Cookie（`shw_id_token`）に `Secure` / `HttpOnly` 属性が付与されていない。
CSP が堅牢なため即座のリスクは低いが、多層防御として対応すべき。

**修正ステップ**

1. **Cookie 設定をサーバーサイドに移行**（`HttpOnly` は `document.cookie` では付与不可のため）
   - ID トークン発行後にサーバー側 API を呼び出し、`Set-Cookie` ヘッダーで返す方式に変更
2. **`Secure` 属性を追加** — 本番環境で HTTPS のみに限定
3. **`HttpOnly` 属性を追加** — JavaScript からのアクセスを防止
4. **既存の `SameSite=Lax; Path=/; Max-Age=3600` は維持**

**受け入れ基準**
- 本番環境で Cookie に `Secure; HttpOnly; SameSite=Lax` が設定されている
- ログイン・ログアウトフローが正常に動作する
- サーバーサイド認証（`verifyRequest`）が引き続き機能する

---

### TASK-SEC2: セキュリティヘッダーの追加

**状態**: 完了
**優先度**: 中

**発覚した問題**

`next.config.ts` に CSP / X-Frame-Options / X-Content-Type-Options は設定済みだが、以下のヘッダーが未設定。

- `Strict-Transport-Security`（HSTS）
- `Referrer-Policy`

**修正ステップ**

1. **`next.config.ts` の `headers()` に以下を追加**
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Referrer-Policy: strict-origin-when-cross-origin`
2. **Vercel プレビューデプロイでヘッダーが返ることを確認**

**受け入れ基準**
- レスポンスヘッダーに `Strict-Transport-Security` と `Referrer-Policy` が含まれる
- 既存のページ表示・API 通信に影響がない

---

## Phase 7 — ローディング最適化・コード整理

### TASK-OPT1: デッドコード・不要コードの削除

**状態**: 完了
**優先度**: 中

**対象箇所**

1. **`src/components/NoticesWidget.tsx` L13** — `const filteredNotices = notices;` がフィルタなしの代入。`notices` を直接使用すべき
2. **`src/proxy.ts` L3-14** — 関数本体がすべてコメントアウト。ファイルごと削除可能

**受け入れ基準**
- 上記のデッドコードが除去されている
- lint / typecheck / test がパスする

---

### TASK-OPT2: 重複ユーティリティ関数の統合

**状態**: 完了
**優先度**: 中

**発覚した問題**

月関連のユーティリティ関数が複数ファイルに重複定義されている。

| 関数 | 重複箇所 |
|------|---------|
| `toMonthKey()` | `src/app/tasks/page.tsx` L11-15, `src/app/expenses/page.tsx` L17-21, `src/server/monthly-export.ts` L27-37 |
| `addOneMonth()` | `src/app/expenses/page.tsx` L31-37, `src/domain/expenses/calculate-monthly-expense-summary.ts` L13-24 |
| `subtractOneMonth()` | `src/app/expenses/page.tsx` L23-29 |
| 日付フォーマット | `src/components/ExpenseSection.tsx` L25-32 (`formatPurchaseDateLabel`), `src/components/ShoppingSection.tsx` L14-21 (`formatDate`) |

**修正ステップ**

1. `src/shared/lib/month-utils.ts` を作成し、`addOneMonth()`, `subtractOneMonth()`, `toMonthKey()` を集約
2. `toMonthKey()` は既存の `toJstMonthKey()`（`src/shared/lib/time.ts`）で代替可能なら置換
3. 日付フォーマット関数を `src/shared/lib/time.ts` に統合
4. 各ファイルのローカル定義を削除し、共通モジュールからインポートに変更

**受け入れ基準**
- 重複定義がなくなり、1箇所からインポートされている
- 既存の動作に変更がない（テストパス）

---

### TASK-OPT3: 重複ロジックのカスタムフック化

**状態**: 未着手
**優先度**: 中

**発覚した問題**

`RecentTasksWidget.tsx` と `UrgentTasksSection.tsx` に、localStorage を使った pending tasks の読み書き・API 取得ロジックがほぼ同一の形で重複している。

- `RecentTasksWidget.tsx` L73-136
- `UrgentTasksSection.tsx` L100-177

**修正ステップ**

1. `src/hooks/usePendingTasks.ts` を作成し、共通ロジックを抽出
2. 両コンポーネントで新フックを使用するよう書き換え

**受け入れ基準**
- pending tasks のロジックが 1 箇所にまとまっている
- 両コンポーネントの動作に変更がない

---

### TASK-OPT4: loading.tsx の拡充

**状態**: 未着手
**優先度**: 低

**現状**

- `src/app/loading.tsx`（汎用スケルトン）と `src/app/expenses/loading.tsx` のみ存在
- `/tasks`, `/rules`, `/shopping`, `/notices`, `/settings` にはルートレベルの loading.tsx がない

**修正ステップ**

1. 各ルートに `loading.tsx` を追加し、ページ固有のスケルトン UI を提供
2. 最低限 `/tasks` と `/shopping`（データ量が多いページ）を優先

**受け入れ基準**
- 主要ルートでページ遷移時にスケルトンが表示される

---

## Phase 6 — 低優先度・後段

### TASK-P11: auditLog に actorUid を追加

**状態**: 未着手
**優先度**: 低

**発覚した問題**

`AuditLogRecord.actor` は表示名の文字列のみ保持しており、UID を持たない。
ユーザーが改名した場合、過去の監査ログと現在のアカウントの対応が取れなくなる。

**修正ステップ**

1. **`AuditLogRecord` に `actorUid: string` フィールドを追加**（`src/types/index.ts`）
2. **`appendAuditLog` の呼び出し箇所で `actorUid` を渡すよう更新**
3. **既存ドキュメントへの `actorUid` 付与スクリプトは任意**（表示名からの逆引きが難しい場合はスキップ可）

**受け入れ基準**
- 新規に書き込まれる監査ログに `actorUid` が含まれる
- `GET /api/audit-logs` のレスポンスに `actorUid` が含まれる

---

### TASK-8: PWA / オフライン対応（後段再評価）

**状態**: 後段再評価
**優先度**: 低

**背景**
IMPROVEMENTS.md §6.J。現時点では優先課題完了後に再評価。

**着手時の検討事項**
- Service Worker の導入可否をスマホ実機で検証する
- オフライン時の UI（読み取り専用モードなど）を設計する
