# Firestore クエリ/インデックス運用

最終更新: 2026-03-02

## 1. 方針
- 本プロジェクトの基本クエリは単一フィールド（`orderBy` / `where` 単体）を前提とする。
- 単一フィールドは Firestore 自動インデックスで対応し、複合インデックスは必要時のみ追加する。
- 追加時は「実装変更」と「インデックス定義」を同一PRで管理する。

## 2. 現行の主要クエリ
- `auditLogs`: `orderBy(createdAt desc)`
- `expenses`: `orderBy(purchasedAt desc)`
- `notices`: `orderBy(postedAt desc)`
- `rules`: `orderBy(createdAt desc)`
- `shoppingItems`: `orderBy(addedAt desc)`
- `taskCompletions`: `orderBy(completedAt desc)`
- `houses`: `orderBy(createdAt desc)`
- `tasks`: `where(deletedAt == null)`

## 3. 追加インデックスの判断基準
- `where` と `orderBy` を同時に使うクエリを新規追加した場合。
- 複数 `where` を組み合わせるクエリを新規追加した場合。
- エミュレータまたは本番で `FAILED_PRECONDITION: The query requires an index.` が発生した場合。

## 4. 追加手順
1. クエリを実装し、Firestore Emulator で動作確認する。
2. エラーに表示される定義リンクか `firebase firestore:indexes` で必要インデックスを確認する。
3. `firestore.indexes.json` を更新して定義を保存する。
4. PRに「対象クエリ」「追加理由」「想定データ件数」を記載する。
5. 本番反映時に `firebase deploy --only firestore:indexes` を実行する。

## 5. 運用ルール
- インデックス定義の手修正は最小限にし、可能な限り Firebase CLI の生成内容を尊重する。
- 未使用インデックスの削除は、対象クエリの廃止PRと同時に行う。
- 文字列日付でのソートはフォーマット規約が前提:
  - 日時: `ISO8601`（例: `2026-03-02T08:15:30.000Z`）
  - 日付: `YYYY-MM-DD`（例: `2026-03-02`）
