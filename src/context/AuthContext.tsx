"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type User, onIdTokenChanged, signOut as firebaseSignOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase-client";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncSessionCookie = async (token: string | null) => {
    const response = await fetch("/api/auth/session", {
      method: token ? "POST" : "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      throw new Error("Failed to sync auth session cookie");
    }
  };

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        await syncSessionCookie(null).catch(() => {});
        setLoading(false);
        return;
      }
      try {
        const token = await u.getIdToken();
        await syncSessionCookie(token);
      } catch {
        await syncSessionCookie(null).catch(() => {});
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await firebaseSignOut(getClientAuth());
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
