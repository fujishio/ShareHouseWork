# ShareHouseWork 改善案（現状反映版）

最終更新: 2026-02-26

このドキュメントは、コードベース実装と `npm test` 実行結果をもとに更新しています。

---

## 1. 現状サマリー

| 項目 | 状態 | 根拠 |
|---|---|---|
| JSONファイル永続化 | 未解決 | `src/server/*-store.ts` が `data/*.json` を直接読み書き |
| 認証（NextAuth/LINE Login） | 未着手 | `src/app/layout.tsx` にセッション制御なし、`.env.example` のみ定義 |
| ダッシュボードのモック除去 | 完了 | `src/app/page.tsx` が `readTaskCompletions/readExpenses/readNotices` 等を直接利用 |
| APIメソッド整理（DELETE/PATCH） | 概ね完了 | `src/app/api/*/[id]/route.ts` で `DELETE/PATCH/PUT` を利用 |
| テスト + CI | 部分完了 | `npm test` 成功（27件）、`.github/workflows/ci.yml` で test/build 実行 |
| ルール画面 `/rules` | 完了 | `src/app/rules/page.tsx` + `src/components/RulesSection.tsx` 実装済み |
| 買い物アーカイブ | 部分完了 | 購入済み表示/未購入戻しあり。長期アーカイブ機構は未実装 |
| 費用カテゴリ可視化 | 部分完了 | `ExpenseCategoryChart` を `ExpenseSection` で表示済み。推移比較は未実装 |
| CSVエクスポート | 部分完了 | `/api/exports/monthly.csv` と設定画面ボタンは接続済み。出力対象は現状タスク完了中心 |
| API入力バリデーション統一 | 未完了 | ルートごとに手書きバリデーション。zod未導入 |
| レートリミット | 未着手 | Middleware/RateLimit 実装なし |
| Next.js設定活用 | 未着手 | `next.config.ts` は空オブジェクト |

---

## 2. 優先度: 高（実運用ブロッカー）

### 2-A. 永続化基盤を DB へ移行（JSON -> PostgreSQL + Prisma）

**理由**
- 現状のファイル書き込み方式はデプロイ環境で永続性・同時更新耐性が弱い

**対応**
- Prisma 導入、`Expense/Shopping/Notice/Rule/TaskCompletion/AuditLog` をスキーマ化
- `src/server/*-store.ts` を Prisma repository に置換
- 既存 `data/*.json` から移行スクリプトを作成

### 2-B. 認証実装（NextAuth + LINE Login）

**理由**
- 操作者が `"あなた"` 固定で、監査・権限・通知制御が実運用レベルに達していない

**対応**
- NextAuth + LINE Provider を導入
- API でセッション検証を必須化
- `completedBy/purchasedBy/postedBy` をログインユーザーで自動設定

### 2-C. バリデーション方式の統一（zod）

**理由**
- ルートごとの個別実装で漏れや整合崩れが起きやすい

**対応**
- zodスキーマを `domain` または `shared` に集約
- エラー形式を `{ error, code, details }` に統一

### 2-D. レートリミット導入

**理由**
- 公開APIが無制限で叩ける状態

**対応**
- まずは IP 単位の制限を Middleware で導入
- 認証後はユーザー単位に移行

---

## 3. 優先度: 中（完成度を上げる）

### 3-A. テスト対象の拡張

**現状**
- ドメイン/ユーティリティ/CSV生成はテストあり
- API統合テスト・コンポーネントテスト・カバレッジ計測は未整備

**対応**
- APIルート統合テスト（正常系/異常系）を追加
- UIの主要操作（登録・取消・完了）を最低限E2Eまたはコンポーネントテスト化
- カバレッジ閾値をCIでチェック

### 3-B. CSVエクスポート対象の拡張

**現状**
- エンドポイントとUI導線はあるが、月次運用データとしては情報不足

**対応**
- タスク完了に加え、支出・買い物・必要なら監査ログを出力
- 利用用途別にシート分割（または複数CSV）を検討

### 3-C. 買い物の長期アーカイブ

**現状**
- 今月の購入済み表示はある
- 月跨ぎでデータが蓄積され続ける

**対応**
- 「購入済みを表示/非表示」トグル
- 一定期間経過分のアーカイブまたは折りたたみ

### 3-D. UXの共通化（Loading/Error）

**現状**
- 主要操作（登録/更新/削除/完了）に共通トーストとローディング表示を適用済み
- 再試行UIは未実装

**対応**
- 追加済み: `ToastViewport` / `showToast` / `RequestStatus` / `getApiErrorMessage`
- 残対応: 失敗時の再試行導線を標準化

---

## 4. 優先度: 低〜中（運用安定化・保守性）

### 4-A. Next.js設定の具体化

- `next.config.ts` にセキュリティヘッダや必要な最適化設定を追加

### 4-B. Lint/Format強化

- `@typescript-eslint` 厳格ルールと Prettier を導入
- CIに lint を追加

### 4-C. PWA対応

- `manifest.json` + Service Worker で最低限のモバイルUXを補強

### 4-D. 環境変数整理

- 実装済み/未実装の差分を `.env.example` で明示
- 未使用変数の棚卸し

---

## 5. 推奨着手順（2026-02-26版）

1. DB移行（Prisma + PostgreSQL）
2. 認証導入（NextAuth + LINE Login）
3. zodでAPIバリデーション統一
4. レートリミット導入
5. CSVエクスポート拡張（支出・買い物含む）
6. API/画面テスト拡張 + カバレッジ導入
7. Loading/Error UI 共通化
8. Lint/Format・Next.js設定・PWAの順で保守改善

---

## 6. 直近の確認ログ

- `npm test` 実行結果: **27 pass / 0 fail**
- CI定義: `.github/workflows/ci.yml` で `npm test` と `npm run build` を実行
- 既知の軽微課題: Node 実行時に `MODULE_TYPELESS_PACKAGE_JSON` 警告あり


# ShareHouseWork 改善案

2026-02-26 時点のコードベース全体レビューに基づく改善案。

--------------------------------------------------------------------------------------

## 1. アーキテクチャ・インフラ（優先度：高）

### 1-A. データベース移行（JSONファイル → PostgreSQL + Prisma）

**現状の問題**

- `/data/*.json` へのファイル書き込みで永続化している
- Vercel（サーバーレス）ではファイルシステムが一時的なため、デプロイ後にデータが消失する
- 同時書き込みで競合・データ破損のリスクがある

**改善案**

- Prisma + Supabase（または Neon）へ移行する
- `src/server/*-store.ts` の各ストアを Prisma Client に置き換える
- マイグレーションファイルでスキーマをバージョン管理する

**影響範囲**

- `src/server/` 配下の全ストアファイル（6ファイル）
- 全APIルート（`src/app/api/`）
- `data/` ディレクトリの廃止

---

### 1-B. 認証の実装（NextAuth.js + LINE Provider）

**現状の問題**

- `.env.example` に NextAuth 関連の変数があるが、実装がない
- 全ページが認証なしでアクセス可能
- ユーザー識別が「あなた」固定で、実際の操作者を区別できない

**改善案**

- NextAuth.js + LINE Provider を実装する
- `completedBy`・`purchasedBy`・`postedBy` を実際のログインユーザーに紐付ける
- 未認証時はログイン画面へリダイレクトする

**影響範囲**

- `src/app/layout.tsx`（SessionProvider 追加）
- 全APIルート（セッション検証の追加）
- 全フォームモーダル（ユーザー名の自動取得）

---

        ## 2. コード品質（優先度：高）  →完了

        ### 2-A. ダッシュボードのモックデータ除去

        **現状の問題**

        - `src/features/home/mock/dashboard-data.ts` でハードコードされた日付・データを使用中
        - 実APIは実装済みなのに、ホーム画面が接続されていない

        **改善案**

        - ダッシュボードの各ウィジェットを実APIに接続する
        - `src/features/home/mock/` を削除する

        **影響範囲**

        - `src/app/page.tsx`
        - `src/components/ContributionWidget.tsx`
        - `src/components/RecentTasksWidget.tsx`
        - `src/components/ExpenseWidget.tsx`
        - `src/components/NoticesWidget.tsx`

        ---

        ### 2-B. APIのHTTPメソッド設計

        **現状の問題**

        - 削除・キャンセル操作が `POST` で実装されている（例: `POST /api/expenses/[id]`）
        - RESTful な慣例から外れており、意図が読みにくい

        **改善案**

        - 削除: `DELETE /api/expenses/[id]`
        - キャンセル: `PATCH /api/task-completions/[id]`（部分更新）
        - 更新: `PUT` または `PATCH`

        **影響範囲**

        - `src/app/api/` 配下の全 `[id]/route.ts`
        - 各画面の `fetch` 呼び出し

        ---

        ### 2-C. テスト戦略の強化

        **現状の問題**

        - テストはドメインロジック中心（7ファイル）で、APIルートやコンポーネントのテストがない
        - CI連携がなく、PRマージ前の品質ゲートがない

        **改善案**

        - APIルートの統合テストを追加する
        - GitHub Actions で `npm test` と `npm run build` を自動実行する
        - カバレッジ計測を導入する

---

## 3. 機能的な改善（優先度：中）

        ### 3-A. ハウスルール画面の実装 →完了

        **現状の問題**

        - `Overview.md` の画面構成に `/rules` が記載されているが、未実装
        ---

        ### 3-B. 買い物リストのアーカイブ機能

        **現状の問題**

        - 購入済みアイテムがリストに残り続け、リストが肥大化する

        **改善案**

        - 購入済みアイテムを一定期間後に自動非表示にする、または「アーカイブ」ボタンを追加する
        - 「購入済みを表示 / 非表示」のトグルを設ける

---

### 3-C. 費用管理のカテゴリ別集計強化

**現状の問題**

- `ExpenseCategoryChart` コンポーネントは存在するが、活用が薄い

**改善案**

- 月次レポート画面でカテゴリ別の推移グラフを表示する
- 前月比や年間推移の可視化を追加する

---

### 3-D. CSVエクスポートの完成

**現状の問題**

- `/api/exports/monthly.csv` のエンドポイントはあるが、不完全

**改善案**

- タスク完了・費用・買い物の全データを月次CSVとしてエクスポートできるようにする
- 設定画面のエクスポートボタンと接続する

---

## 4. UX・デザイン（優先度：中）

        ### 4-A. ローディング状態の統一

        **現状の問題**

        - API呼び出し時のローディング表示がページによって不統一

        **改善案**

        - 共通の `<Loading />` コンポーネントを作成する
        - 初回表示に Skeleton UI を導入する

---

### 4-B. エラーハンドリングのUI

**現状の問題**

- API失敗時のユーザーフィードバックが不足しており、サイレント失敗の可能性がある

**改善案**

- トースト通知コンポーネントを導入し、操作の成功・失敗をフィードバックする
- ネットワークエラー時のリトライUIを追加する

---

### 4-C. PWA対応

**現状の問題**

- スマホ中心の利用想定だが、PWA設定がない

**改善案**

- `manifest.json` を追加してホーム画面への追加を可能にする
- Service Worker でオフライン時の基本表示を確保する

---

### 4-D. ダークモード（優先度：低）

**現状の問題**

- Tailwind CSS の `dark:` バリアントが未活用

**改善案**

- `prefers-color-scheme` に応じた自動切り替えを実装する
- 優先度は低いため、他の改善完了後に検討

---

## 5. セキュリティ・運用（優先度：高）

### 5-A. API入力バリデーションの統一

**現状の問題**

- バリデーション関数は存在するが、全APIルートで一貫して使われているか不明確

**改善案**

- zod を導入し、全APIルートでスキーマバリデーションを統一する
- バリデーションエラー時のレスポンス形式を共通化する

---

### 5-B. レートリミット

**現状の問題**

- 認証なしの公開APIにレートリミットがない

**改善案**

- Vercel Edge Middleware でIPベースのレートリミットを実装する
- 認証実装後はユーザー単位のリミットに切り替える

---

### 5-C. 環境変数の整理

**現状の問題**

- `.env.example` の内容と実装状況にズレがある（`DATABASE_URL` は未使用など）

**改善案**

- 実装に合わせて `.env.example` を最新化する
- 新しい環境変数追加時は必ず `.env.example` も更新する（CLAUDE.md のルール通り）

---

## 6. 開発体験（優先度：低〜中）

### 6-A. Linter・Formatter 設定の強化

**現状の問題**

- `eslint-config-next` のみで、独自ルールがない

**改善案**

- `@typescript-eslint/strict` を追加する
- Prettier を導入してコードスタイルを統一する

---

### 6-B. Next.js 設定の活用

**現状の問題**

- `next.config.ts` が空のまま

**改善案**

- 画像最適化、セキュリティヘッダー、リダイレクト等を必要に応じて設定する

---

## 推奨する着手順序

| 順番 | 項目 | 理由 |
|:---:|------|------|
| 1 | 1-A. DB移行 | Vercelデプロイに必須。全機能の基盤 |
| 2 | 1-B. 認証実装 | ユーザー識別なしでは実運用不可 |
| 3 | 2-A. ダッシュボード実API接続 | モック除去で実データが反映される |
| 4 | 5-A. バリデーション統一 | DB移行と同時に整備すると効率的 |
| 5 | 2-B. HTTPメソッド設計修正 | DB移行のタイミングでAPI全体を見直す |
| 6 | 3-A. ハウスルール画面 | Overview記載の未実装機能 |
| 7 | 4-A〜B. ローディング・エラーUI | UX品質の底上げ |
| 8 | 2-C. テスト・CI整備 | 機能追加前に品質ゲートを確立 |
| 9 | 4-C. PWA対応 | スマホ利用体験の向上 |
| 10 | 残りの項目 | 運用開始後にフィードバックを見て判断 |
