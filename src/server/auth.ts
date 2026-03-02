import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

export type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export async function verifyRequest(request: Request): Promise<AuthenticatedUser> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Authorization header missing or invalid");
  }

  const idToken = authHeader.slice(7);
  const decoded = await getAdminAuth().verifyIdToken(idToken);

  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(decoded.uid).get();
  const name = userDoc.exists ? (userDoc.data()?.name as string) : (decoded.email ?? decoded.uid);

  return {
    uid: decoded.uid,
    name,
    email: decoded.email ?? "",
  };
}

export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json(
    { error: message, code: "UNAUTHORIZED" },
    { status: 401 }
  );
}
