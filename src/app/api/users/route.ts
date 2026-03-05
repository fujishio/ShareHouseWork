import { handleGetUsers, handleUpsertUser } from "@/server/api/users-api";
import { listUsers, upsertUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { getHouse } from "@/server/house-store";

export const runtime = "nodejs";

const getDeps = {
  listUsers,
  getHouse,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const upsertDeps = {
  upsertUser,
  verifyRequest: (request: Request) => verifyRequest(request, { requireEmailVerified: false }),
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetUsers(request, getDeps);
}

export async function POST(request: Request) {
  return handleUpsertUser(request, upsertDeps);
}
