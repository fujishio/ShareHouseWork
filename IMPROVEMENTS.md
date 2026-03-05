# ShareHouseWork 改善案

最終更新: 2026-03-05

---

## 未完了タスク一覧

| ID | 優先度 | 概要 | 状態 |
|----|--------|------|------|
| C | 高 | 依存脆弱性（low 10件）対応 | 一部完了 |
| O | 高 | `GET /api/users` ハウス未所属時の全ユーザー漏洩 | 完了 |
| D | 中 | サーバーコンポーネントの認証ワークアラウンド | 完了 |
| I | 中 | Discord 通知連携 | 未着手 |
| M | 低 | Lint ルール厳格化・CI 整備 | 一部完了 |
| N | 低 | PWA/オフライン対応 | 未着手 |

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

**状態:** 一部完了（2026-03-05）

**実装済み:** 既存 ESLint 警告 6件を解消し `npx eslint .` を警告ゼロ化

**残課題:**
- ESLint ルールの追加・厳格化
- CI（GitHub Actions 等）での lint/type-check の自動実行

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
