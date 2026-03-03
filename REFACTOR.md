# REFACTOR Plan

## Goal
- 本番ビルドを常時グリーンに保つ
- ドメイン層・サーバ層・UI層の責務を明確化する
- 型安全性とテスト容易性を高め、機能追加時の変更コストを下げる

## Principles
- 動作維持優先: 既存挙動を壊さない小さなPR単位で進める
- 型の単一情報源化: API契約とドメイン型を再利用し重複定義をなくす
- 関心分離: `app` 配下の画面ロジックからデータ取得/整形ロジックを分離する
- 不要物の削減: 未使用ファイル・未使用エクスポート・死んだ分岐を継続的に削除する
- 安全な移行: 各段階で `npm run build` と既存テストを通す

## Scope
- 対象: `src/app`, `src/components`, `src/domain`, `src/server`, `src/shared`
- 非対象: UIデザイン刷新、大規模な機能追加、Firestoreスキーマ変更

## Progress (2026-03-03)
- Phase 0: 完了
  - `register` ページの型不整合を修正（`ColorPicker` と state 型を整合）
- Phase 1: 完了（環境依存のビルド最終確認を除く）
  - `app/api` の `as NextResponse<...>` を共通レスポンスヘルパへ移行
  - `server` 層の unsafe cast を削減（`user-store` 等をZod/型ガード寄りに整理）
  - `ColorPicker` / `PresetColor` の型境界を統一
  - `readJson<T>` を導入し、主要画面の `response.json()` 直接利用を整理
  - `readJson<T>` にガード適用を拡張し、主要レスポンスで実行時境界を追加
  - `TaskCategory` / `RuleCategory` / `ExpenseCategory` の重複定義を共通定数へ集約
  - レスポンスガードを `shared/lib/response-guards.ts` へ集約

### Notes
- `npx tsc --noEmit` は通過済み。
- `npm run build` は型チェックを通過するが、Firestore 接続 (`127.0.0.1:8080`) が必要な prerender が現環境で `EPERM` となるため、最終完了判定はエミュレータ接続可能環境で再確認が必要。

## Deletion / Cleanup Policy
- 削除対象:
  - 参照されていないコンポーネント・ユーティリティ・型定義
  - 重複実装（同等機能の並立コード）
  - 使われていない一時ファイル・ログ・検証用コード
- 判定方法:
  - `rg` と TypeScript の参照解決で未使用を確認
  - 削除前後で `npm run build` / `npm run test` を比較
  - 副作用が疑われる場合は段階削除（deprecate -> remove）
- 進め方:
  - 1PRで1責務（例: 未使用コンポーネント削除のみ）
  - 削除理由と影響範囲をPR本文に明記

## Phase 0: Build Stabilization (P1)
- `register` ページの型不整合を修正し、本番ビルドを通す
- ビルドエラーを CI で再発検知できるよう、失敗箇所を `Tasks.md` に記録

## Phase 1: Type Boundary Cleanup
- API Request/Response 型を `src/types` に集約し、`app/api` と `app/*/page.tsx` で共通利用
- `as` キャスト乱用箇所を削減し、バリデーション関数 (`shared/lib/api-validation.ts`) に統一
- `PRESET_COLORS` などの定数由来型に対し、フォーム状態型との境界を明示
- 併せて未使用型・未使用ユーティリティを削除

## Phase 2: Server Logic Consolidation
- `src/server/*-store.ts` の重複CRUD処理を共通ユーティリティへ抽出
- APIルートでは入出力検証とオーケストレーションのみを担当
- 監査ログ書き込みをサービス関数化し、各ルートの分岐重複を解消
- 使われなくなった旧実装・互換コードを削除

## Phase 3: UI/State Refactor
- ページ内に肥大化したセクションを `components/sections/*` へ分割
- データ取得・更新処理をカスタムフック化 (`useProfileColor`, `useHouseMembers` など)
- フォーム送信処理を共通化し、トースト/エラー表示の分散を削減
- JSX重複・条件分岐重複を統合し、未使用props/未使用stateを削除

## Phase 4: Test Strengthening
- ドメイン関数: 正常系/境界値/異常系テストを追加
- API: `src/server/api/*` に対する入力バリデーションテストを拡張
- 主要ページ: クリティカルパス (登録/参加/保存) のコンポーネントテストを追加

## Definition of Done
- `npm run lint`
- `npm run test`
- `npm run build`
- 新規追加した型/関数に対応するテストが存在
- 1PRあたりの変更責務が単一で、レビュー可能なサイズに分割済み
- 未使用ファイル/未使用コードの削除が完了し、理由が追跡可能

## Execution Order
1. P1: register ビルドエラー解消
2. 型境界の整理 (Phase 1)
3. server 集約 (Phase 2)
4. UI state 分割 (Phase 3)
5. テスト強化 (Phase 4)
