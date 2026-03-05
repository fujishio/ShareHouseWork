import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";

function getFirebaseClientConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase client env vars: ${missing.join(", ")}. Set them in .env.local and restart dev server.`,
    );
  }

  return config;
}

function initClientApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(getFirebaseClientConfig());
}

export function getClientAuth() {
  const app = initClientApp();
  const auth = getAuth(app);
  const shouldUseEmulator =
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

  if (shouldUseEmulator) {
    const emulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099";

    // Prevent duplicate connects in HMR / repeated init.
    if (!(auth as { emulatorConfig?: unknown }).emulatorConfig) {
      connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
    }
  }

  return auth;
}
