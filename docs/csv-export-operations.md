# 月次CSVエクスポート運用手順

最終更新: 2026-03-03
対象API: `GET /api/exports/monthly.csv`

## 1. 目的と対象データ
- 月次運用レポートとして以下3系統を1ファイルで出力する。
- `taskCompletions`（メンバー集計 + TOTAL）
- `expenses`
- `shoppingItems`

CSV内は `# task_member_summary` / `# expenses` / `# shopping` の3セクション構成。

## 2. 事前条件
- アプリにログイン済みであること。
- API直接呼び出し時は Firebase IDトークン（Bearer）が取得できること。
- 対象月は必ず `YYYY-MM` 形式で明示すること（例: `2026-03`）。

## 3. エクスポート手順（画面操作）
1. 設定画面（`/settings`）を開く。
2. 「月次データエクスポート」で対象月を選択する。
3. 「CSV出力」を押下し、ダウンロードしたファイルを保存する。
4. ダウンロードファイル名が `operations-YYYY-MM.csv` であることを確認する。

## 4. エクスポート手順（API直接呼び出し）
1. Firebase IDトークンを取得する。
2. 次のコマンドでCSVを取得する。

```bash
curl -sS -G \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  --data-urlencode "month=2026-03" \
  "http://127.0.0.1:3000/api/exports/monthly.csv" \
  -o operations-2026-03.csv
```

本番環境ではホストを本番URLに置き換える。

## 5. ファイル命名規則
- APIレスポンス既定: `operations-YYYY-MM.csv`
- 配布・保管用の推奨リネーム:
  - `operations-YYYY-MM_YYYYMMDD-HHmm_JST.csv`
  - 例: `operations-2026-03_20260303-1820_JST.csv`

同月再出力が起きるため、取得日時（JST）を必ず含める。

## 6. 保管期間・配布先（推奨）
- 保管先: 共有ドライブの `operations-csv/`（アクセス制御あり）
- 原本保管期間: 13か月（当月 + 過去12か月）
- 配布先: ハウスメンバー閲覧用フォルダ（編集権限なし）
- 取り扱い: 外部共有リンクは禁止。必要時は期限付きリンクを使う。

## 7. 再出力手順
1. 同一 `month` で再度 CSV を出力する。
2. 既存ファイルは上書きせず、取得日時付きファイル名で保存する。
3. 変更理由（例: 取消反映、遅延登録反映）を配布コメントに残す。
4. 最新版を `latest` 扱いにし、旧版は `archive/` に移動する。

## 8. 注意事項
- `month` の形式が不正な場合は `400 VALIDATION_ERROR`。
- 認証ヘッダ未指定/不正は `401 UNAUTHORIZED`。
- `month` 未指定時はサーバ時刻（UTC）基準の当月が使われるため、月末/月初の境界誤差を避けるために必ず `month` を明示する。
- `taskCompletions` は JST月で集計、`expenses` と `shoppingItems` は日付文字列の `YYYY-MM` 前方一致で抽出される。再出力時に差分が出る場合があるため、取得日時付きで管理する。
