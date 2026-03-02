# Firebase Emulator setup

## 1. `.env.local` を作成
`.env.example` をコピーして `.env.local` を作り、ローカル開発用の値を設定します。

```bash
cp .env.example .env.local
```

最低限、次の値を入れてください。

```dotenv
FIREBASE_PROJECT_ID="demo-sharehouse-work"
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"

NEXT_PUBLIC_FIREBASE_API_KEY="demo-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="demo-sharehouse-work.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-sharehouse-work"
NEXT_PUBLIC_FIREBASE_APP_ID="1:000000000000:web:localdev"
NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL="http://127.0.0.1:9099"
```

`FIREBASE_CLIENT_EMAIL` と `FIREBASE_PRIVATE_KEY` は Emulator 利用時は不要です。

## 2. Emulator を起動
```bash
npm run emulators:start
```

データを保持したい場合:
```bash
npm run emulators:start:import
```

## 3. Next.js を起動
別ターミナルで:
```bash
npm run dev
```

## 4. ログインユーザーを作成
Firebase Emulator UI (`http://127.0.0.1:4000`) で Auth ユーザーを作成し、
そのメール/パスワードで `/login` からログインします。
