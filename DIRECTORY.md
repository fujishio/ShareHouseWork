# ShareHouseWork - Directory

最終更新: 2026-03-03
整合基準: `Overview.md`, `DATABASE.md`

## 1. 現在のファイル構成と役割

### 主要ディレクトリ構成
```text
.
├─ src/app/                    # 画面（App Router）と API Route
│  ├─ page.tsx                 # ホーム（ダッシュボード）
│  ├─ tasks|expenses|rules|shopping|notices|settings/
│  │                            # 各機能ページ
│  └─ api/                     # HTTP エンドポイント
│     ├─ audit-logs/route.ts            # 監査ログ一覧取得
│     ├─ expenses/route.ts              # 支出一覧取得・支出登録
│     ├─ expenses/[id]/route.ts         # 支出取消
│     ├─ exports/monthly.csv/route.ts   # 月次CSV出力
│     ├─ houses/route.ts                # ハウス一覧取得・作成
│     ├─ houses/[id]/members/route.ts   # ハウスメンバー追加
│     ├─ notices/route.ts               # お知らせ一覧取得・投稿
│     ├─ notices/[id]/route.ts          # お知らせ削除
│     ├─ rules/route.ts                 # ルール一覧取得・作成
│     ├─ rules/[id]/route.ts            # ルール更新・確認・削除
│     ├─ settings/contribution/route.ts # 共益費設定取得・更新
│     ├─ shopping/route.ts              # 買い物一覧取得・追加
│     ├─ shopping/[id]/route.ts         # 購入チェック/戻し・取消
│     ├─ task-completions/route.ts      # 完了履歴取得・完了登録
│     ├─ task-completions/[id]/route.ts # 完了履歴取消
│     ├─ tasks/route.ts                 # タスク一覧取得・作成
│     ├─ tasks/[id]/route.ts            # タスク更新・削除
│     └─ users/route.ts                 # ユーザー一覧取得・upsert
├─ src/server/                 # サーバー層（Firestore I/O と APIロジック）
│  ├─ api/*.ts                 # API のユースケース/バリデーション/レスポンス
│  ├─ *-store.ts               # Firestore への read/write
│  └─ auth.ts                  # Firebase IDトークン検証
├─ src/domain/                 # ドメインロジック（純粋関数中心）
│  ├─ tasks/
│  ├─ expenses/
│  ├─ shopping/
│  └─ *.test.ts                # ドメインロジックの単体テスト
├─ src/components/             # UI コンポーネント
├─ src/shared/                 # 共通ユーティリティ/定数/API共通処理
│  └─ lib/*.test.ts            # 共通ユーティリティの単体テスト
├─ src/server/api/*.test.ts    # APIユースケースのテスト
├─ src/server/*.test.ts        # サーバーユーティリティのテスト
├─ src/types/                  # 型定義
├─ scripts/seed-firestore.ts   # Firestore 初期データ投入スクリプト
├─ docs/
│  ├─ csv-export-operations.md          # 月次CSVエクスポート運用手順
│  └─ firestore-query-index-operations.md # Firestore クエリ/インデックス運用手順
├─ DATABASE.md                 # Firestore 設計の正本
├─ DIRECTORY.md                # ファイル構成と役割（本ファイル）
├─ Overview.md                 # プロダクト全体概要
└─ IMPROVEMENTS.md             # 改善計画・進捗
```

## 2. APIルート一覧（実ファイル準拠）
| Endpoint | Methods | 役割 | File |
|---|---|---|---|
| `/api/audit-logs` | `GET` | 監査ログの一覧取得（期間・action・limit フィルタ） | `src/app/api/audit-logs/route.ts` |
| `/api/expenses` | `GET`, `POST` | 支出一覧取得 / 支出登録 | `src/app/api/expenses/route.ts` |
| `/api/expenses/[id]` | `DELETE` | 支出の取消（論理取消） | `src/app/api/expenses/[id]/route.ts` |
| `/api/exports/monthly.csv` | `GET` | 月次オペレーション CSV を生成・ダウンロード | `src/app/api/exports/monthly.csv/route.ts` |
| `/api/houses` | `GET`, `POST` | ハウス一覧取得 / ハウス作成 | `src/app/api/houses/route.ts` |
| `/api/houses/[id]/members` | `POST` | ハウスにメンバー UID を追加 | `src/app/api/houses/[id]/members/route.ts` |
| `/api/notices` | `GET`, `POST` | お知らせ一覧取得 / 投稿 | `src/app/api/notices/route.ts` |
| `/api/notices/[id]` | `DELETE` | お知らせ削除（論理削除） | `src/app/api/notices/[id]/route.ts` |
| `/api/rules` | `GET`, `POST` | ルール一覧取得 / ルール作成 | `src/app/api/rules/route.ts` |
| `/api/rules/[id]` | `PUT`, `PATCH`, `DELETE` | ルール更新 / 確認（ack）/ 削除 | `src/app/api/rules/[id]/route.ts` |
| `/api/settings/contribution` | `GET`, `POST` | 共益費設定の取得 / 更新（オーナーのみ） | `src/app/api/settings/contribution/route.ts` |
| `/api/shopping` | `GET`, `POST` | 買い物リスト取得 / アイテム追加 | `src/app/api/shopping/route.ts` |
| `/api/shopping/[id]` | `PATCH`, `DELETE` | 購入済みチェック・未購入戻し / 取消 | `src/app/api/shopping/[id]/route.ts` |
| `/api/task-completions` | `GET`, `POST` | タスク完了履歴取得 / 完了登録 | `src/app/api/task-completions/route.ts` |
| `/api/task-completions/[id]` | `PATCH` | タスク完了履歴の取消 | `src/app/api/task-completions/[id]/route.ts` |
| `/api/tasks` | `GET`, `POST` | タスク一覧取得 / タスク作成 | `src/app/api/tasks/route.ts` |
| `/api/tasks/[id]` | `PATCH`, `DELETE` | タスク更新 / タスク削除（論理削除） | `src/app/api/tasks/[id]/route.ts` |
| `/api/users` | `GET`, `POST` | ユーザー一覧取得 / ユーザー upsert | `src/app/api/users/route.ts` |

## 3. レイヤー責務（実装方針）
- `src/app/api/**/route.ts`: ルーティングと依存注入（薄い層）
- `src/server/api/*.ts`: リクエスト解釈、バリデーション、認可、監査ログ（厚い層）
- `src/server/*-store.ts`: 永続化アクセス（Firestore）
- `src/domain/**/*.ts`: ビジネスロジック（UI/DB 非依存）
- `src/**/*.test.ts`: 各レイヤーのユニットテスト/統合寄りテスト（Node test runner）
- `src/components/*.tsx`: 表示と操作UI
