import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { ID_TOKEN_COOKIE_NAME } from "@/shared/constants/auth";
import { resolveActorHouseId } from "@/server/auth";

export async function resolveRequestHouseId(): Promise<string | null> {
  const token = (await cookies()).get(ID_TOKEN_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      return null;
    }
    return resolveActorHouseId(decoded.uid);
  } catch {
    return null;
  }
}
