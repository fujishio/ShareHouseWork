import {
  handleCreateSessionCookie,
  handleDeleteSessionCookie,
} from "@/server/api/auth-session-api";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { ID_TOKEN_COOKIE_NAME } from "@/shared/constants/auth";

export const runtime = "nodejs";

const deps = {
  verifyRequest,
  unauthorizedResponse,
  cookieName: ID_TOKEN_COOKIE_NAME,
  isProduction: process.env.NODE_ENV === "production",
};

export async function POST(request: Request) {
  return handleCreateSessionCookie(request, deps);
}

export async function DELETE() {
  return handleDeleteSessionCookie(deps);
}
