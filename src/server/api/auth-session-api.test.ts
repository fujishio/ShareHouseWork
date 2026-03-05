import test from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateSessionCookie,
  handleDeleteSessionCookie,
  type SessionCookieDeps,
} from "./auth-session-api.ts";
import { createVerifyRequest, defaultActor, unauthorizedResponse } from "./test-helpers.ts";

function buildDeps(options?: {
  actor?: typeof defaultActor | null;
  isProduction?: boolean;
}): SessionCookieDeps {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  return {
    verifyRequest: createVerifyRequest(actor),
    unauthorizedResponse,
    cookieName: "shw_id_token",
    isProduction: options?.isProduction ?? false,
  };
}

test("POST session cookie: 未認証は401", async () => {
  const deps = buildDeps({ actor: null });
  const response = await handleCreateSessionCookie(
    new Request("http://localhost/api/auth/session", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
    }),
    deps
  );

  assert.equal(response.status, 401);
});

test("POST session cookie: Authorizationヘッダー不足は401", async () => {
  const deps = buildDeps();
  const response = await handleCreateSessionCookie(
    new Request("http://localhost/api/auth/session", { method: "POST" }),
    deps
  );

  assert.equal(response.status, 401);
});

test("POST session cookie: 開発環境でHttpOnly/SameSiteが付与される", async () => {
  const deps = buildDeps({ isProduction: false });
  const token = "token.value";
  const response = await handleCreateSessionCookie(
    new Request("http://localhost/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
    deps
  );

  assert.equal(response.status, 204);
  const cookie = response.headers.get("Set-Cookie");
  assert.ok(cookie);
  assert.ok(cookie.includes("shw_id_token=token.value"));
  assert.ok(cookie.includes("Path=/"));
  assert.ok(cookie.includes("Max-Age=3600"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(cookie.includes("HttpOnly"));
  assert.equal(cookie.includes("Secure"), false);
});

test("POST session cookie: 本番環境でSecureが付与される", async () => {
  const deps = buildDeps({ isProduction: true });
  const response = await handleCreateSessionCookie(
    new Request("http://localhost/api/auth/session", {
      method: "POST",
      headers: { Authorization: "Bearer token" },
    }),
    deps
  );

  assert.equal(response.status, 204);
  const cookie = response.headers.get("Set-Cookie");
  assert.ok(cookie);
  assert.ok(cookie.includes("Secure"));
});

test("DELETE session cookie: Max-Age=0で削除する", async () => {
  const deps = buildDeps({ isProduction: true });
  const response = await handleDeleteSessionCookie(deps);

  assert.equal(response.status, 204);
  const cookie = response.headers.get("Set-Cookie");
  assert.ok(cookie);
  assert.ok(cookie.includes("shw_id_token="));
  assert.ok(cookie.includes("Max-Age=0"));
  assert.ok(cookie.includes("Path=/"));
  assert.ok(cookie.includes("SameSite=Lax"));
  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("Secure"));
});
