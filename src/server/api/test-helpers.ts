import type { AuthenticatedUser } from "./route-handler-utils.ts";

export const defaultActor: AuthenticatedUser = {
  uid: "u1",
  name: "あなた",
  email: "you@example.com",
};

export function createVerifyRequest(actor?: AuthenticatedUser | null) {
  const resolvedActor = actor === undefined ? defaultActor : actor;
  return async () => {
    if (!resolvedActor) {
      throw new Error("unauthorized");
    }
    return resolvedActor;
  };
}

export function unauthorizedResponse() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

export function createResolveActorHouseId(houseId = "house-id-001") {
  return async () => houseId;
}
