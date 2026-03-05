import { z } from "zod";
import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type { House, Member } from "../../types/index.ts";
import {
  errorResponse,
  readJsonBody,
  resolveAuthenticatedActor,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

type Params = { params: Promise<{ id: string }> };

const createHouseSchema = z.object({
  name: zNonEmptyTrimmedString.pipe(z.string().max(100)),
  description: zTrimmedString.pipe(z.string().max(500)).optional(),
  joinPassword: zTrimmedString
    .pipe(z.string().max(128).refine((value) => value.length === 0 || value.length >= 8))
    .optional(),
});

const joinHouseSchema = z.object({
  houseName: zNonEmptyTrimmedString.pipe(z.string().max(100)),
  joinPassword: zTrimmedString.pipe(z.string().min(8).max(128)),
});

const addHouseMemberSchema = z.object({
  userUid: zNonEmptyTrimmedString,
});

const rolesSchema = z.object({
  userUid: zNonEmptyTrimmedString,
  action: z.enum(["grant", "revoke"]),
});

export type GetHousesDeps = {
  listHouses: (uid: string) => Promise<House[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateHouseDeps = {
  createHouse: (input: {
    name: string;
    description?: string;
    ownerUid?: string;
    joinPassword?: string;
  }) => Promise<House>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type JoinHouseDeps = {
  findHouseByNameAndJoinPassword: (
    name: string,
    joinPassword: string
  ) => Promise<House | null>;
  addHouseMember: (houseId: string, userUid: string) => Promise<House | null>;
  syncContributionMemberCountForCurrentMonth: (
    houseId: string,
    memberCount: number
  ) => Promise<void>;
  getUser: (uid: string) => Promise<Member | null>;
  takeRateLimit: (options: {
    key: string;
    limit: number;
    windowMs: number;
  }) => { allowed: boolean; remaining: number; resetAt: number };
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type AddHouseMemberDeps = {
  getHouse: (houseId: string) => Promise<House | null>;
  addHouseMember: (houseId: string, userUid: string) => Promise<House | null>;
  syncContributionMemberCountForCurrentMonth: (
    houseId: string,
    memberCount: number
  ) => Promise<void>;
  getUser: (uid: string) => Promise<Member | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type UpdateHouseRoleDeps = {
  getHouse: (houseId: string) => Promise<House | null>;
  grantHostRole: (houseId: string, userUid: string) => Promise<House | null>;
  revokeHostRole: (houseId: string, userUid: string) => Promise<House | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handleGetHouses(request: Request, deps: GetHousesDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const houses = await deps.listHouses(actor.uid);
  return Response.json({ data: houses });
}

export async function handleCreateHouse(request: Request, deps: CreateHouseDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createHouseSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "name") {
      return validationError("name is required", parsed.error.issues);
    }
    return validationError("Invalid body", parsed.error.issues);
  }

  const created = await deps.createHouse({
    name: parsed.data.name,
    description: parsed.data.description || undefined,
    ownerUid: actor.uid,
    joinPassword: parsed.data.joinPassword || undefined,
  });
  return Response.json({ data: created }, { status: 201 });
}

export async function handleJoinHouse(request: Request, deps: JoinHouseDeps) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = joinHouseSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("Invalid body", parsed.error.issues);
  }

  const { houseName, joinPassword } = parsed.data;
  const userUid = actor.uid;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = deps.takeRateLimit({
    key: `houses:join:${ip}:${userUid}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    );
    return errorResponse(
      "Too many join attempts. Please retry later.",
      429,
      "RATE_LIMITED",
      { retryAfterSeconds }
    );
  }

  const user = await deps.getUser(userUid);
  if (!user) {
    return errorResponse("ユーザーが見つかりません", 404, "USER_NOT_FOUND", { userUid });
  }

  const house = await deps.findHouseByNameAndJoinPassword(houseName, joinPassword);
  if (!house) {
    return errorResponse(
      "ハウスが見つかりません。ハウス名か合言葉をご確認ください",
      404,
      "HOUSE_NOT_FOUND",
      { houseName }
    );
  }

  const updated = await deps.addHouseMember(house.id, userUid);
  if (!updated) {
    return errorResponse("メンバー追加に失敗しました", 500, "MEMBER_ADD_FAILED", {
      houseId: house.id,
      userUid,
    });
  }
  await deps.syncContributionMemberCountForCurrentMonth(updated.id, updated.memberUids.length);

  return Response.json({ data: updated });
}

export async function handleAddHouseMember(
  request: Request,
  { params }: Params,
  deps: AddHouseMemberDeps
) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const { id } = await params;
  const house = await deps.getHouse(id);
  if (!house) {
    return errorResponse("House not found", 404, "HOUSE_NOT_FOUND", { houseId: id });
  }
  if (!house.hostUids.includes(actor.uid)) {
    return deps.unauthorizedResponse("Host permission required");
  }

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = addHouseMemberSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("userUid is required", parsed.error.issues);
  }
  const { userUid } = parsed.data;

  const user = await deps.getUser(userUid);
  if (!user) {
    return errorResponse("User not found", 404, "USER_NOT_FOUND", { userUid });
  }

  const updated = await deps.addHouseMember(id, userUid);
  if (!updated) {
    return errorResponse("House not found", 404, "HOUSE_NOT_FOUND", { houseId: id });
  }
  await deps.syncContributionMemberCountForCurrentMonth(updated.id, updated.memberUids.length);

  return Response.json({ data: updated });
}

export async function handleUpdateHouseRole(
  request: Request,
  { params }: Params,
  deps: UpdateHouseRoleDeps
) {
  const actor = await resolveAuthenticatedActor(request, deps);
  if (actor instanceof Response) return actor;

  const { id } = await params;
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = rolesSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return validationError("Invalid body", parsed.error.issues);
  }

  const { userUid, action } = parsed.data;

  const house = await deps.getHouse(id);
  if (!house) {
    return errorResponse("ハウスが見つかりません", 404, "HOUSE_NOT_FOUND", { houseId: id });
  }

  if (!house.hostUids.includes(actor.uid)) {
    return deps.unauthorizedResponse("ホスト権限が必要です");
  }

  if (action === "grant") {
    const updated = await deps.grantHostRole(id, userUid);
    if (!updated) {
      return errorResponse("権限付与に失敗しました", 500, "GRANT_FAILED", {
        houseId: id,
        userUid,
      });
    }
    return Response.json({ data: updated });
  }

  const updated = await deps.revokeHostRole(id, userUid);
  if (!updated) {
    return errorResponse("最後のホストは削除できません", 400, "LAST_HOST", {
      houseId: id,
      userUid,
    });
  }
  return Response.json({ data: updated });
}
