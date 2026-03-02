# ShareHouseWork - Overview

最終更新: 2026-03-02
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
- `expenses`, `shoppingItems`, `rules`, `notices`
- `contributionSettings`, `auditLogs`

### 運用ルール
- 論理削除: `tasks`, `rules`, `notices`
- 取消: `taskCompletions`, `expenses`, `shoppingItems`
- 履歴系 `*By` は `actor.name`（記録時の表示名スナップショット）を保存
- 日付型は ISO8601 と `YYYY-MM-DD` が混在

---

## 7. 実装状況（2026-03-02）

### 実装済み
- 主要画面（`/tasks`, `/expenses`, `/rules`, `/shopping`, `/notices`, `/settings`）
- API エンドポイント一式（CRUD/取消/確認）
- Firestore ストア実装
- Firebase Auth による API 認証
- 監査ログ（rules/notices/task-completions/expenses/shopping）
- CI（`npm test`, `npm run build`）

### 未完了・改善対象
- APIバリデーションの zod 統一
- API統合テストの追加
- クエリ/インデックス運用・CSV運用手順の明文化

---

## 8. ロードマップ（最新）

### Phase 1: テスト基盤の強化
- API 統合テスト整備

### Phase 2: バリデーションと型の標準化
- zod スキーマ導入
- 日付型の明確化（日時/日付の用途分離）

### Phase 3: 運用整備
- インデックス/クエリ運用の明文化
- CSV出力運用（配布・保管・再出力）の明文化

### Phase 4: 品質運用の仕上げ
- Lint/Format 強化
- 長期運用向けのアーカイブ・分析改善

---

## 9. 既知制約
- `npm run build` はネットワーク制限下で Google Fonts 取得に失敗する場合がある
- Firebase プロジェクト設定（`.env.local`）が必要

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
