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
import { ID_TOKEN_COOKIE_NAME } from "@/shared/constants/auth";

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

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        document.cookie = `${ID_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
        setLoading(false);
        return;
      }
      try {
        const token = await u.getIdToken();
        document.cookie =
          `${ID_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=3600; SameSite=Lax`;
      } catch {
        document.cookie = `${ID_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
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
