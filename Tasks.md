# TASKS.md — 実施すべきタスク一覧

作成日: 2026-03-03
更新日: 2026-03-04
依拠ドキュメント: `IMPROVEMENTS.md`, `Overview.md`, `DATABASE.md`

---

## タスク一覧サマリー（優先順）

| 優先度 | ID | タイトル | 状態 | Phase |
|--------|----|---------|----|-------|
| 最高 | TASK-P5 | 未認証エンドポイントのセキュリティ修正 | 完了 | 1 |
| 高 | TASK-P7 | joinPassword の API レスポンス漏洩防止 | 完了 | 1 |
| 高 | TASK-P8 | GET /api/users からメールアドレスを除外 | 完了 | 1 |
| 最高 | TASK-P6 | マルチテナント分離（全コレクションに houseId 追加） | 未着手 | 2 |
| 高 | TASK-P2 | Firebase 本番デプロイ構成を追加 | 未着手 | 3 |
| 高 | TASK-P3 | 本番環境変数・Secret 設定 | 未着手 | 3 |
| 高 | TASK-P4 | Firestore 本番反映手順の固定化 | 未着手 | 3 |
| 中 | TASK-P9 | 全件取得のスケーラビリティ改善 | 未着手 | 4 |
| 中 | TASK-5 | Discord 通知 MVP 実装 | 未着手 | 5 |
| 中 | TASK-P10 | ユーザー退会・データ削除フロー | 未着手 | 5 |
| 低 | TASK-P11 | auditLog に actorUid を追加 | 未着手 | 6 |
| 低 | TASK-8 | PWA / オフライン対応 | 後段再評価 | 6 |
| 高 | TASK-P1 | 本番ビルドエラー修正（register ページの型不整合） | 完了 | - |

---

## Phase 1 — セキュリティ緊急対応（即着手）

> P5・P7 は同じファイル（house-store.ts）を触るため、同時実施が効率的。

### TASK-P5: 未認証エンドポイントのセキュリティ修正

**状態**: 完了
**優先度**: 最高（本番公開中のため即対処が必要）

**発覚した問題**

| # | エンドポイント | 問題 | 影響 |
|---|--------------|------|------|
| 1 | `POST /api/users` | `verifyRequest` なし | 誰でも任意 UID のプロフィールを上書き可能 |
| 2 | `POST /api/houses` | `verifyRequest` なし | 誰でもハウスを無制限作成（Firestore スパム） |
| 3 | `POST /api/houses/join` | `verifyRequest` なし・`userUid` をボディで受け取る | 合言葉さえ知れば他人の UID をハウスに追加できる |
| 4 | `houses` コレクション | `joinPassword` をプレーンテキストで保存 | レートリミットなしでブルートフォース可能 |
| 5 | `GET /api/houses` | 全ハウスを返す | 自分と無関係なハウス情報が閲覧できる |

**修正ステップ**

1. **`POST /api/users` に認証を追加**（`src/app/api/users/route.ts`）
   - `verifyRequest` でトークンを検証する
   - ボディの `uid` とトークンの `actor.uid` が一致しない場合は `403 Forbidden` を返す
   - 登録フローは `createUserWithEmailAndPassword` 直後にトークンが取れるため問題なし

2. **`POST /api/houses` に認証を追加**（`src/app/api/houses/route.ts`）
   - `verifyRequest` でトークンを検証する
   - `ownerUid` をボディから取らず `actor.uid` を使う

3. **`POST /api/houses/join` に認証を追加**（`src/app/api/houses/join/route.ts`）
   - `verifyRequest` でトークンを検証する
   - `userUid` をボディから取らず `actor.uid` を使う

4. **合言葉のハッシュ化**（`src/server/house-store.ts`）
   - 保存時に `bcrypt`（または `crypto.subtle`）でハッシュ化する
   - 照合時はハッシュ比較に切り替える
   - 既存データの移行スクリプトを用意する

5. **`GET /api/houses` を自分のハウスのみに絞り込む**（`src/server/house-store.ts`）
   - `listHouses()` に `uid` を受け取らせ、`memberUids` に含まれるハウスのみ返す

6. **レートリミット**（任意・後回し可）
   - Vercel の `@vercel/edge-config` や `upstash/ratelimit` を使い IP ベースで制限を追加する

**受け入れ基準**
- 未認証の curl で `POST /api/users`, `POST /api/houses`, `POST /api/houses/join` が 401 を返す
- 他人の UID を指定した `POST /api/users` が 403 を返す
- `joinPassword` が Firestore にハッシュ値で保存される

---

### TASK-P7: joinPassword の API レスポンス漏洩防止

**状態**: 完了
**優先度**: 高

**発覚した問題**

`src/server/house-store.ts` の `docToHouse` 関数は `House` 型にない `joinPassword` を明示的に除外していない。
TypeScript の型の安全性に依存しているが、ランタイムでは Firestore の生ドキュメントが戻り値に混入する余地がある。
また、`listHouses()` の全件取得レスポンスにパスワードが含まれるリスクがある。

**修正ステップ**

1. **`docToHouse` を明示的フィールド選択に変更**（`src/server/house-store.ts`）
   - オブジェクトスプレッドを使わず、必要フィールドだけをピックアップして返す
   ```ts
   // Before（リスクあり）
   return { id, ...data };
   // After（安全）
   return { id, name: data.name, memberUids: data.memberUids, ... };
   ```

2. **`House` 型に `joinPassword` を追加しないことを明文化**（`src/types/index.ts` のコメント）
   - レスポンス型に含めないという設計方針をコメントで記載する

**受け入れ基準**
- `GET /api/houses` のレスポンスに `joinPassword` フィールドが含まれない
- `docToHouse` がスプレッドを使用していない

---

### TASK-P8: GET /api/users からメールアドレスを除外

**状態**: 完了
**優先度**: 高

**発覚した問題**

`GET /api/users`（`src/app/api/users/route.ts`）は `email` フィールドを含む全ユーザー情報を返す。
UI でメンバー一覧表示に必要なのは `name` と `color` のみであり、他メンバーのメールアドレスが全員に公開される状態はプライバシー上の問題である。

**修正ステップ**

1. **`GET /api/users` のレスポンスから `email` を除外する**
   - `listUsers()` の戻り値または API レスポンス生成時に `email` を含めない
   - `Member` 型から `email` を省いた `PublicMember` 型を新設してもよい

2. **自分のメールアドレスは `GET /api/profile` で取得可能なままにする**
   - `actor.uid === リクエストUID` の場合のみ `email` を返す構成にするか、`/api/profile` 専用で完結させる

**受け入れ基準**
- `GET /api/users` のレスポンスに `email` フィールドが含まれない
- 自分自身のメールアドレスは `GET /api/profile` で引き続き取得できる

---

## Phase 2 — アーキテクチャ修正（Phase 1 直後）

### TASK-P6: マルチテナント分離（全コレクションに houseId 追加）

**状態**: 未着手
**優先度**: 最高（複数ハウスが共存する時点でデータが混在・相互参照できる致命的欠陥）

**発覚した問題**

`tasks`, `taskCompletions`, `expenses`, `shoppingItems`, `rules`, `notices`, `auditLogs`, `contributionSettings` の各コレクションに `houseId` フィールドが存在しない。
現在 Firestore はフラットなコレクション構造（例: `/tasks`, `/expenses`）であり、複数ハウスのデータが混在する。
認証済みであれば他ハウスの家事・費用・ルール・監査ログがすべて閲覧・操作できてしまう。

**修正ステップ**

1. **型定義に `houseId` を追加**（`src/types/index.ts`）
   - `Task`, `TaskCompletionRecord`, `ExpenseRecord`, `ShoppingItem`, `Rule`, `Notice`, `AuditLogRecord`, `ContributionSettingsHistoryRecord` に `houseId: string` フィールドを追加する

2. **ストア層の全クエリに houseId フィルターを追加**
   - `readTasks(houseId)`, `readExpenses(houseId)` 等、全 `*-store.ts` の read 関数にフィルターを追加する
   - `addCollectionDoc` でも `houseId` を保存する

3. **API 層でメンバーシップ検証を追加**
   - `verifyRequest` で取得した `actor.uid` が対象 `house.memberUids` に含まれているかを確認する
   - 含まれない場合は `403 Forbidden` を返す

4. **`contributionSettings` のドキュメント ID 変更**
   - 現在: `YYYY-MM`（ハウス間衝突）→ 変更後: `{houseId}_{YYYY-MM}`

5. **既存データの移行スクリプト作成**（`scripts/migrate-add-house-id.ts`）
   - 既存ドキュメントに `houseId` を付与するワンショットスクリプトを作成する

6. **Firestore クエリ用インデックスの追加**（`firestore.indexes.json`）
   - `tasks`: `houseId + deletedAt`, `expenses`: `houseId + purchasedAt` 等の複合インデックスを追加する

**受け入れ基準**
- ハウス A のメンバーが `/api/tasks`, `/api/expenses` 等を呼んでも、ハウス B のデータが返らない
- 別ハウスのリソースを操作しようとすると 403 が返る
- `auditLogs` がハウス単位でフィルタリングできる

---

## Phase 3 — 本番デプロイ準備（Phase 2 完了後）

### TASK-P2: Firebase 本番デプロイ構成を追加

**状態**: 未着手
**優先度**: 高

**内容**
- Firebase での実行方式（App Hosting / Hosting + Functions）を確定する。
- `firebase.json` に本番デプロイ用設定を追加し、emulator 設定と併存できる形に整理する。
- `.firebaserc` の default プロジェクトを本番 project id に切り替える（`demo-sharehouse-work` 固定を解消）。

---

### TASK-P3: 本番環境変数・Secret 設定

**状態**: 未着手
**優先度**: 高

**内容**
- Server: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` を Secret として設定する。
- Client: `NEXT_PUBLIC_FIREBASE_*` を本番値へ設定し、`NEXT_PUBLIC_USE_FIREBASE_EMULATOR` は本番で無効化する。
- 公開リポジトリ運用として、実値はコミットせず `.env.example` はサンプル値のみ維持する。

---

### TASK-P4: Firestore 本番反映手順の固定化

**状態**: 未着手
**優先度**: 高

**内容**
- `firestore.rules` の本番反映（`firebase deploy --only firestore:rules`）をデプロイ手順に追加する。
- 将来の複合インデックス追加に備え、`firestore.indexes.json` を管理対象に追加し、`firebase deploy --only firestore:indexes` 手順を確立する。

---

## Phase 4 — スケーラビリティ改善（Phase 2 完了後）

> TASK-P6 で houseId フィルターが追加されてから実施する。

### TASK-P9: 全件取得のスケーラビリティ改善

**状態**: 未着手
**優先度**: 中

**発覚した問題**

以下の関数がページネーション・サーバーサイドフィルタリングなしで全件取得しており、ハウス数・ユーザー数・ログ数の増加に伴って Firestore 読み取り課金が急増し、レスポンスが劣化する。

| 関数 | 問題 |
|------|------|
| `readAuditLogs()` | 全件取得後メモリ内でフィルタリング |
| `listUsers()` | 全ユーザー取得 |
| `listHouses()` | 全ハウス取得 |
| `readExpenses()` | 月フィルターなしで全件取得 |

**修正ステップ**

1. **`readAuditLogs()` を Firestore クエリフィルタリングに変更**
   - `from`, `to`, `action`, `houseId` をクエリパラメータとして Firestore に渡す
   - メモリ内フィルタリングを廃止する

2. **`readExpenses()` に月フィルターを追加**
   - クライアントから指定された月（`YYYY-MM`）で `purchasedAt` を範囲フィルタリングする

3. **`listUsers()` / `listHouses()` にページネーションを追加**
   - `limit` + `startAfter` による Firestore カーソルページネーションを実装する

4. **該当する Firestore 複合インデックスを `firestore.indexes.json` に追加する**

**受け入れ基準**
- `GET /api/audit-logs` が Firestore 側でフィルタリングされ、全件転送が発生しない
- `GET /api/expenses?month=2026-03` が当月データのみ返す
- Firestore 読み取り数が大幅に削減される

---

## Phase 5 — 機能追加・中優先度

### TASK-5: Discord 通知 MVP 実装

**状態**: 未着手
**優先度**: 中

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

### TASK-P10: ユーザー退会・データ削除フロー

**状態**: 未着手
**優先度**: 中

**発覚した問題**

Firebase Auth アカウントを削除しても Firestore の `/users/{uid}` や各ドキュメント内の `completedBy`, `purchasedBy` 等の個人情報が残り続ける。
個人情報保護法・GDPR の「忘れられる権利」への対応として、退会時のデータ処理方針が必要。

**設計方針（実装前に決定すること）**

- 退会ユーザーの `*By` フィールドを「退会済みユーザー」に置換するか、UID のみ残してマスキングするかを決める
- 監査ログは法的要件上保持すべき場合があるため、匿名化（表示名削除）にとどめることを検討する

**修正ステップ**

1. **退会 API の作成**（`DELETE /api/profile`）
   - Firebase Auth アカウントを削除する
   - `/users/{uid}` ドキュメントを削除する
   - 各ドキュメントの `*By` フィールドを「退会済みユーザー」に更新する（または UID のみ保持）

2. **退会確認 UI の追加**（設定画面）
   - 確認ダイアログ付きの退会ボタンを設置する

3. **ハウス退出フローとの連携**
   - 退会時に `house.memberUids` から UID を削除する
   - `hostUids` に含まれていた場合、後継 host が存在しなければ退会不可にする

**受け入れ基準**
- 退会操作後、Firebase Auth アカウントおよび `/users/{uid}` ドキュメントが削除される
- 退会ユーザーの `*By` フィールドが匿名化される
- 退会後にそのアカウントでログインできない

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

---

## 完了済みタスク

### TASK-P1: 本番ビルドエラー修正（register ページの型不整合）

**状態**: 完了

**内容**
- `src/app/register/page.tsx` の `color` state を `useState<string>(DEFAULT_COLOR)` に変更し、`ColorPicker` の `onChange` 型と一致させる。
- `npm run build` を再実行し、ビルド成功を確認する。
