import test from "node:test";
import assert from "node:assert/strict";
import { handleGetHouses, handleJoinHouse } from "./houses-api.ts";
import { createVerifyRequest, defaultActor, unauthorizedResponse } from "./test-helpers.ts";
import type { House, Member } from "../../types/index.ts";

function buildDeps(options?: {
  actor?: typeof defaultActor | null;
  houses?: House[];
  user?: Member | null;
  rateLimited?: boolean;
}) {
  const actor = options?.actor === undefined ? defaultActor : options.actor;
  const houses = options?.houses ?? [];
  const user = options?.user === undefined
    ? {
        id: defaultActor.uid,
        name: defaultActor.name,
        color: "blue",
        email: defaultActor.email,
      }
    : options.user;
  const rateLimited = options?.rateLimited ?? false;

  let syncCalls = 0;

  return {
    getDeps: {
      listHouses: async () => houses,
      verifyRequest: createVerifyRequest(actor),
      unauthorizedResponse,
    },
    joinDeps: {
      findHouseByNameAndJoinPassword: async (name: string, password: string) => {
        if (password.length < 8) return null;
        return (
          houses.find((house) => house.name === name) ?? {
            id: "h1",
            name,
            description: "",
            ownerUid: "owner-1",
            memberUids: [defaultActor.uid],
            hostUids: ["owner-1"],
            createdAt: "2026-03-01T00:00:00.000Z",
          }
        );
      },
      addHouseMember: async (houseId: string, userUid: string) => ({
        id: houseId,
        name: "シェアハウスA",
        description: "",
        ownerUid: "owner-1",
        memberUids: ["owner-1", userUid],
        hostUids: ["owner-1"],
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
      syncContributionMemberCountForCurrentMonth: async () => {
        syncCalls += 1;
      },
      getUser: async () => user,
      takeRateLimit: () =>
        rateLimited
          ? { allowed: false, remaining: 0, resetAt: Date.now() + 10_000 }
          : { allowed: true, remaining: 9, resetAt: Date.now() + 60_000 },
      verifyRequest: createVerifyRequest(actor),
      unauthorizedResponse,
    },
    getSyncCalls: () => syncCalls,
  };
}

test("GET houses: 未認証は401", async () => {
  const { getDeps } = buildDeps({ actor: null });
  const response = await handleGetHouses(new Request("http://localhost/api/houses"), getDeps);

  assert.equal(response.status, 401);
});

test("GET houses: 正常系", async () => {
  const houses: House[] = [
    {
      id: "h1",
      name: "シェアハウスA",
      description: "",
      ownerUid: "owner-1",
      memberUids: ["owner-1", "u1"],
      hostUids: ["owner-1"],
      createdAt: "2026-03-01T00:00:00.000Z",
    },
  ];
  const { getDeps } = buildDeps({ houses });
  const response = await handleGetHouses(new Request("http://localhost/api/houses"), getDeps);

  assert.equal(response.status, 200);
  const body = (await response.json()) as { data: House[] };
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0]?.id, "h1");
});

test("POST join house: レート制限は429", async () => {
  const { joinDeps, getSyncCalls } = buildDeps({ rateLimited: true });
  const response = await handleJoinHouse(
    new Request("http://localhost/api/houses/join", {
      method: "POST",
      body: JSON.stringify({
        houseName: "シェアハウスA",
        joinPassword: "secret123",
      }),
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.1" },
    }),
    joinDeps
  );

  assert.equal(response.status, 429);
  const body = (await response.json()) as {
    error?: string;
    code?: string;
    details?: { retryAfterSeconds?: number };
  };
  assert.equal(body.code, "RATE_LIMITED");
  assert.equal(body.error, "Too many join attempts. Please retry later.");
  assert.ok((body.details?.retryAfterSeconds ?? 0) >= 1);
  assert.equal(getSyncCalls(), 0);
});

test("POST join house: 未認証は401", async () => {
  const { joinDeps } = buildDeps({ actor: null });
  const response = await handleJoinHouse(
    new Request("http://localhost/api/houses/join", {
      method: "POST",
      body: JSON.stringify({
        houseName: "シェアハウスA",
        joinPassword: "secret123",
      }),
      headers: { "content-type": "application/json" },
    }),
    joinDeps
  );

  assert.equal(response.status, 401);
});

test("POST join house: 不正ボディは400", async () => {
  const { joinDeps } = buildDeps();
  const response = await handleJoinHouse(
    new Request("http://localhost/api/houses/join", {
      method: "POST",
      body: JSON.stringify({ houseName: "", joinPassword: "short" }),
      headers: { "content-type": "application/json" },
    }),
    joinDeps
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.error, "Invalid body");
  assert.equal(body.code, "VALIDATION_ERROR");
});

test("POST join house: ユーザー不在は404", async () => {
  const { joinDeps } = buildDeps({ user: null });
  const response = await handleJoinHouse(
    new Request("http://localhost/api/houses/join", {
      method: "POST",
      body: JSON.stringify({
        houseName: "シェアハウスA",
        joinPassword: "secret123",
      }),
      headers: { "content-type": "application/json" },
    }),
    joinDeps
  );

  assert.equal(response.status, 404);
  const body = (await response.json()) as { error?: string; code?: string };
  assert.equal(body.code, "USER_NOT_FOUND");
});
