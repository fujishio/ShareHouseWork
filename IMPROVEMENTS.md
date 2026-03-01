# ShareHouseWork 改善案

最終更新: 2026-02-26
※ コードベース実装と `npm test` 実行結果をもとに更新しています。

---

## 現状サマリー

| 項目 | 状態 |
|------|------|
| DB移行（JSON → PostgreSQL + Prisma） | 未着手 |
| 認証（NextAuth + LINE Login） | 未着手 |
| APIバリデーション統一（zod） | 未完了 |
| レートリミット | 未着手 |
| Next.js設定活用 | 未着手 |
| テスト + CI | 部分完了（27件 pass、API/コンポーネントテストは未整備） |
| CSVエクスポート | 部分完了（タスク完了のみ。支出・買い物は未対応） |
| 買い物の長期アーカイブ | 部分完了（購入済み表示/未購入戻しあり。長期アーカイブは未実装） |
| UX共通化（再試行導線） | 部分完了（Toast・Loadingは対応済み。再試行UIが残） |
| ダッシュボードのモック除去 | 完了 |
| APIのHTTPメソッド設計 | 完了 |
| ルール画面 `/rules` | 完了 |
| ローディング状態の統一 | 完了 |
| エラーハンドリングUI | 完了 |

---

## 優先度: 高（実運用ブロッカー）

### A. DB移行（JSON → PostgreSQL + Prisma）

**問題**
- `/data/*.json` へのファイル書き込みで永続化している
- Vercel（サーバーレス）ではデプロイ後にデータが消失する
- 同時書き込みで競合・データ破損のリスクがある

**対応**
- Prisma + Supabase（または Neon）へ移行する
- `src/server/*-store.ts` の各ストアを Prisma Client に置き換える
- `Expense / Shopping / Notice / Rule / TaskCompletion / AuditLog` をスキーマ化する
- マイグレーションファイルでスキーマをバージョン管理する
- 既存 `data/*.json` から移行スクリプトを作成する

**影響範囲**
- `src/server/` 配下の全ストアファイル（6ファイル）
- 全APIルート（`src/app/api/`）
- `data/` ディレクトリの廃止

---

### B. 認証実装（NextAuth + LINE Login）

**問題**
- 全ページが認証なしでアクセス可能
- ユーザー識別が「あなた」固定で、監査・権限・通知制御が実運用レベルに達していない

**対応**
- NextAuth.js + LINE Provider を実装する
- 未認証時はログイン画面へリダイレクトする
- APIでセッション検証を必須化する
- `completedBy / purchasedBy / postedBy` を実際のログインユーザーで自動設定する

**影響範囲**
- `src/app/layout.tsx`（SessionProvider 追加）
- 全APIルート（セッション検証の追加）
- 全フォームモーダル（ユーザー名の自動取得）

---

### C. APIバリデーション統一（zod）

**問題**
- ルートごとに手書きバリデーションで、漏れや整合崩れが起きやすい

**対応**
- zod スキーマを `domain` または `shared` に集約する
- エラー形式を `{ error, code, details }` に統一する

---

### D. レートリミット導入

**問題**
- 公開APIが無制限で叩ける状態

**対応**
- IP単位の制限を Vercel Edge Middleware で導入する
- 認証実装後はユーザー単位のリミットに切り替える

---

## 優先度: 中（完成度を上げる）

### E. テスト対象の拡張

**現状**
- ドメイン / ユーティリティ / CSV生成はテストあり（27件 pass）
- API統合テスト・コンポーネントテスト・カバレッジ計測が未整備

**対応**
- APIルートの統合テスト（正常系/異常系）を追加する
- UIの主要操作（登録・取消・完了）を最低限 E2E またはコンポーネントテスト化する
- カバレッジ閾値を CI でチェックする

---

### F. CSVエクスポート拡張

**現状**
- エンドポイントと UI 導線はあるが、出力対象がタスク完了のみで月次運用データとして不足

**対応**
- タスク完了に加え、支出・買い物を出力する
- 利用用途別にシート分割（または複数CSV）を検討する

---

### G. 買い物の長期アーカイブ

**現状**
- 購入済み表示 / 未購入戻しは実装済み
- 月跨ぎでデータが蓄積され続ける

**対応**
- 一定期間経過分をアーカイブまたは折りたたみ表示にする

---

### H. UX共通化（再試行導線）

**現状**
- Toast通知・Loading・Skeleton UI は対応済み
- 失敗時の再試行導線が未標準化

**対応**
- 失敗時の再試行ボタンを主要な操作画面に追加する

---

## 優先度: 低〜中（運用安定化・保守性）

### I. Next.js 設定の具体化

- `next.config.ts` にセキュリティヘッダや必要な最適化設定を追加する

### J. Lint / Format 強化

- `@typescript-eslint/strict` を追加する
- Prettier を導入してコードスタイルを統一する
- CI に lint を追加する

### K. PWA 対応

- `manifest.json` を追加してホーム画面への追加を可能にする
- Service Worker でオフライン時の基本表示を確保する

### L. 環境変数の整理

- `.env.example` を実装状況に合わせて最新化する（`DATABASE_URL` は未使用など）

### M. ダークモード

- `prefers-color-scheme` に応じた自動切り替えを実装する（他の改善完了後に検討）

---

## 完了済み

| 項目 | 対応内容 |
|------|---------|
| ダッシュボードのモック除去 | `src/app/page.tsx` が実APIに直接接続済み |
| APIのHTTPメソッド設計 | `DELETE / PATCH / PUT` を `src/app/api/*/[id]/route.ts` で利用 |
| ルール画面 `/rules` | `src/app/rules/page.tsx` + `src/components/RulesSection.tsx` 実装済み |
| 買い物アーカイブ（基本） | 購入済み表示 / 未購入戻し実装済み |
| 費用カテゴリ集計 | `ExpenseCategoryChart` を `ExpenseSection` で表示済み |
| CSVエクスポート（基本） | `/api/exports/monthly.csv` と設定画面ボタンを接続済み |
| ローディング状態の統一 | `Loading.tsx` / `PageSkeleton` / `loading.tsx` を追加済み |
| エラーハンドリングUI | `error.tsx` / `RetryNotice` / 再取得ボタンを追加済み |
| テスト + CI（基本） | 27件 pass、`.github/workflows/ci.yml` で test / build を自動実行 |

---

## 推奨着手順

| 順 | 項目 | 理由 |
|:--:|------|------|
| 1 | A. DB移行 | Vercelデプロイに必須。全機能の基盤 |
| 2 | B. 認証実装 | ユーザー識別なしでは実運用不可 |
| 3 | C. APIバリデーション統一 | DB移行と同時に整備すると効率的 |
| 4 | D. レートリミット導入 | 認証後すぐに対応 |
| 5 | F. CSVエクスポート拡張 | 支出・買い物データを追加 |
| 6 | E. テスト拡張 + カバレッジ | 機能追加前に品質ゲートを確立 |
| 7 | G. 買い物の長期アーカイブ | 運用上の使い勝手を改善 |
| 8 | H. 再試行導線の標準化 | UX品質の底上げ |
| 9 | I〜M | 運用安定化・保守改善（順不同） |

---

## 直近の確認ログ

- `npm test`: **27 pass / 0 fail**
- CI: `.github/workflows/ci.yml` で `npm test` と `npm run build` を実行
- 既知の軽微課題: Node 実行時に `MODULE_TYPELESS_PACKAGE_JSON` 警告あり
