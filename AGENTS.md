# AGENTS.md

## Public Repo Security Rules

- このリポジトリは `public` 前提。実キーや実トークンは絶対にコミットしない。
- `*.env*` はサンプル (`.env.example`) のみ追跡し、実値は `.env.local` に置く。
- `NEXT_PUBLIC_*` であっても実運用値は原則コミットしない。サンプル値のみ許可。
- ログ (`*.log`) やドキュメントに認証ヘッダ、トークン、秘密鍵を含めない。

## Pre-commit Secret Check

コミット前に次を実行し、ヒットがないことを確認する。

```bash
rg -n --hidden -S "(api[_-]?key|apikey|secret|token|private[_-]?key|client[_-]?secret|BEGIN [A-Z ]+PRIVATE KEY|x-api-key|authorization:|AIza[0-9A-Za-z_-]{35}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16})" .
```

## If a Secret Is Leaked

- 1. まず当該キーを即時ローテーション（無効化）する。
- 2. 露出ファイルを修正し、履歴からの削除（`git filter-repo` 等）を検討する。
- 3. 影響範囲を確認し、必要ならアクセスログを監査する。
