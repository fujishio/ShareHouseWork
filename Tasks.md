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
