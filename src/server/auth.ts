import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

export type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

type VerifyRequestOptions = {
  requireEmailVerified?: boolean;
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function verifyRequest(
  request: Request,
  options: VerifyRequestOptions = {}
): Promise<AuthenticatedUser> {
  const requireEmailVerified = options.requireEmailVerified ?? true;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Authorization header missing or invalid");
  }

  const idToken = authHeader.slice(7);
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  if (requireEmailVerified && !decoded.email_verified) {
    throw new AuthError("Email is not verified");
  }

  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const rawName = userDoc.exists ? userDoc.data()?.name : undefined;
  const name =
    typeof rawName === "string" && rawName.trim()
      ? rawName
      : (decoded.email ?? decoded.uid);

  return {
    uid: decoded.uid,
    name,
    email: decoded.email ?? "",
  };
}

export async function resolveActorHouseId(uid: string): Promise<string | null> {
  const { listHouses } = await import("./house-store");
  const houses = await listHouses(uid);
  return houses[0]?.id ?? null;
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json(
    { error: message, code: "UNAUTHORIZED", details: { reason: message } },
    { status: 401 }
  );
}
