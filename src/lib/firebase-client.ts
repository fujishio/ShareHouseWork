import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
  initClientApp();
  return getAuth();
}
