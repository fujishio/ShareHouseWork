# ShareHouseWork - Overview

最終更新: 2026-03-05（リファクタリング Phase 5 完了）
整合基準: `DATABASE.md`, `IMPROVEMENTS.md`

## 1. プロダクト概要
ShareHouseWork は、4人暮らしのシェアハウス向け生活管理アプリです。
家事・共益費・買い物・ルール・お知らせを一元管理し、日々の運用負荷を下げることを目的とします。

### 解決したい課題
- 誰が何をやったかが曖昧になりやすい
- 共益費の残高と支出が見えづらい
- 連絡がチャットに埋もれて重要事項が伝わりにくい

### スコープ
- 対象: 家事管理、共益費管理、買い物、ルール、お知らせ
- 非対象: 家賃徴収管理

---

## 2. 想定ユーザーと運用条件

### ユーザー
- シェアハウスメンバー（4名想定）

### 利用環境
- デバイス: スマートフォン / PC（レスポンシブ）
- 認証: Firebase Auth（IDトークンによる API 認証）

### 費用前提（現行）
- 共益費は月額設定を管理画面から変更可能
- 共益費内訳は水道・光熱費、消耗品、食費の一部など

---

## 3. 機能要件（現行）

### 3.1 家事管理
- タスク一覧表示（カテゴリ別）
- 完了報告（履歴保存）
- 完了履歴の取消（理由付き）
- 貢献度表示（過去30日）
- タスク追加/編集/削除（設定画面）

### 3.2 費用管理
- 月次の定額拠出設定
- 支出記録（品目・金額・カテゴリ・日付・購入者）
- 支出取消（理由付き）
- 月次残高表示（拠出合計 - 支出合計）

### 3.3 ハウスルール
- ルール作成/編集/削除
- ルール確認（acknowledgedBy）
- カテゴリ別表示

### 3.4 買い物リスト
- アイテム追加（品名・数量・メモ・カテゴリ）
- 購入済みチェック/未購入戻し
- 取消（canceledAt/canceledBy）
- 購入時に支出へ反映するフロー

### 3.5 お知らせ
- 投稿/削除
- 重要通知フラグ
- 古い通知の折りたたみ表示

---

## 4. 非機能要件
- レスポンシブ UI（スマホ優先）
- 低学習コスト
- Firestore 前提の安定運用
- 操作失敗時のエラー表示・再試行導線

---

## 5. 技術スタック（現行）
| レイヤー | 採用技術 |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS |
| DB | Firestore (Firebase) |
| Auth | Firebase Auth（Bearer IDトークン検証） |
| Hosting | Vercel |

---

## 6. データ設計サマリー（DATABASE準拠）

### 主要コレクション
- `users`, `houses`, `tasks`, `taskCompletions`
- `expenses`, `balanceAdjustments`, `shoppingItems`
- `rules`, `notices`, `contributionSettings`, `auditLogs`

### 運用ルール
- 全コレクション（`users`, `houses` を除く）に `houseId` を付与しマルチテナント分離
- 論理削除: `tasks`, `rules`, `notices`
- 取消: `taskCompletions`, `expenses`, `shoppingItems`
- 履歴系 `*By` は `actor.name`（記録時の表示名スナップショット）を保存
- 日付型は ISO8601 と `YYYY-MM-DD` が混在

---

## 7. 実装状況（2026-03-05）

### 実装済み
- 主要画面（`/tasks`, `/expenses`, `/rules`, `/shopping`, `/notices`, `/settings`）
- API エンドポイント一式（CRUD/取消/確認/残高調整/ハウス参加/プロフィール）
- Firestore ストア実装（全コレクション houseId スコープ）
- Firebase Auth による API 認証（Bearer IDトークン + Cookie ベースのサーバー認証）
- 監査ログ（全 CUD 操作をハウススコープで記録）
- CI（lint / typecheck / test / build）
- 本番デプロイ（Vercel + Firebase: Auth・Firestore・セキュリティルール）
- **セキュリティ修正**
  - 未認証エンドポイントに認証を追加
  - joinPassword のハッシュ化・API レスポンスから除外
  - GET /api/users からメールアドレスを除外
  - 全コレクションに houseId を追加しマルチテナント分離
- **リファクタリング（Phase 1-5 完了）**
  - Phase 1: API 境界統一（Route 層の薄層化、共通エラー形式）
  - Phase 2: 型とモジュール境界の整理（ドメイン別型分割、Firestore 永続化型分離）
  - Phase 3: Store 層の一貫性改善（命名規約統一、cursor ページング）
  - Phase 4: テスト再編と不足補完（167テスト、失敗系補強、Store 単体テスト）
  - Phase 5: フロントエンド分割（UI/状態管理/API通信の責務分離）

### 未完了・改善対象
- Discord 通知連携
- PWA / オフライン対応
- 依存脆弱性（low 10件）のアップストリーム修正待ち

---

## 8. ロードマップ（最新）

### ✅ セキュリティ緊急対応（完了）
- 未認証エンドポイントのセキュリティ修正
- joinPassword の API レスポンス漏洩防止
- GET /api/users からメールアドレスを除外

### ✅ アーキテクチャ修正（完了）
- マルチテナント分離（全コレクションに houseId 追加）

### ✅ 本番デプロイ（完了）
- Vercel + Firebase 本番デプロイ
- Firestore セキュリティルール適用

### ✅ リファクタリング Phase 1-5（完了）
- 詳細は `REFACTOR.md` および `IMPROVEMENTS.md` を参照

### 次期: 機能追加
- Discord 通知 MVP 実装
- ユーザー退会・データ削除フロー
- auditLog に actorUid を追加

### 低優先度・後段
- PWA / オフライン対応

---

## 9. 既知制約
- `npm run build` はネットワーク制限下で Google Fonts 取得に失敗する場合がある
- Firebase プロジェクト設定（`.env.local`）が必要

## 9.1 Node バージョン運用ルール
- ローカル開発は Node 25 のまま継続してよい（`EBADENGINE` 警告は許容）
- CI は Node 20 を基準とする（`.github/workflows/ci.yml`）
- PR 作成前に Node 20 または Node 22 で以下を 1 回実行して互換性を確認する
  - `npm ci`
  - `npm run lint`
  - `npm test`

---

## 10. 画面構成
```
/                - ホーム（ダッシュボード）
/tasks           - 家事管理
/expenses        - 費用管理
/rules           - ハウスルール
/shopping        - 買い物リスト
/notices         - お知らせ
/settings        - 設定（通知・共益費・権限）
```

---

## 11. ファイル構成ドキュメント
- ファイル構成・APIルート一覧・レイヤー責務は `DIRECTORY.md` に分離。
- 参照先: `DIRECTORY.md`

---

## 12. メンテナンスによる一時停止手順

### 停止する（全アクセスをブロック）

1. `src/middleware.ts` を作成する（すでにある場合はスキップ）

   ```ts
   import { NextResponse } from "next/server";

   export function middleware() {
     return new NextResponse("メンテナンス中です。しばらくお待ちください。", {
       status: 503,
       headers: { "Content-Type": "text/plain; charset=utf-8" },
     });
   }

   export const config = {
     matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
   };
   ```

2. コミット＆プッシュする

   ```bash
   git add src/middleware.ts
   git commit -m "一時メンテナンス中：全アクセスを503でブロック"
   git push
   ```

3. Vercel のデプロイ完了後（約1〜2分）、サイトに503が返ることを確認する

### 再公開する

1. `src/middleware.ts` を削除する

   ```bash
   git rm src/middleware.ts
   git commit -m "メンテナンス終了：アクセスブロックを解除"
   git push
   ```

2. Vercel のデプロイ完了後、サイトが正常に表示されることを確認する

### 補足
- Vercel ダッシュボードの "Deployment Protection > Vercel Authentication" を **Enable** にしても非公開にできるが、スマホのブラウザが Vercel にログイン済みの場合は素通りするため、middleware 方式の方が確実
- middleware はビルドエラーがなくても機能するため、セキュリティ修正中の緊急停止に適している
