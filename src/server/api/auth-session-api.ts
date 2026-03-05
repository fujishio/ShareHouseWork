import type { AuthDeps } from "./route-handler-utils.ts";

export type SessionCookieDeps = AuthDeps & {
  cookieName: string;
  isProduction: boolean;
};

const COOKIE_MAX_AGE_SECONDS = 3600;

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value);
}

function serializeCookie(
  name: string,
  value: string,
  options: { maxAge: number; httpOnly: boolean; secure: boolean }
): string {
  const secure = options.secure ? "; Secure" : "";
  const httpOnly = options.httpOnly ? "; HttpOnly" : "";
  return `${name}=${encodeCookieValue(value)}; Path=/; Max-Age=${options.maxAge}; SameSite=Lax${httpOnly}${secure}`;
}

function createUnauthorizedTokenResponse(deps: AuthDeps): Response {
  return deps.unauthorizedResponse("Authorization header missing or invalid");
}

function readBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function handleCreateSessionCookie(
  request: Request,
  deps: SessionCookieDeps
): Promise<Response> {
  const token = readBearerToken(request);
  if (!token) {
    return createUnauthorizedTokenResponse(deps);
  }

  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) {
    return deps.unauthorizedResponse();
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": serializeCookie(deps.cookieName, token, {
        maxAge: COOKIE_MAX_AGE_SECONDS,
        httpOnly: true,
        secure: deps.isProduction,
      }),
    },
  });
}

export async function handleDeleteSessionCookie(
  deps: SessionCookieDeps
): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": serializeCookie(deps.cookieName, "", {
        maxAge: 0,
        httpOnly: true,
        secure: deps.isProduction,
      }),
    },
  });
}
