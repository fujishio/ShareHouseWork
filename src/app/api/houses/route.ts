import {
  handleCreateHouse,
  handleGetHouses,
} from "@/server/api/houses-api";
import { createHouse, listHouses } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";

export const runtime = "nodejs";

const getDeps = {
  listHouses,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  createHouse,
  verifyRequest: (request: Request) => verifyRequest(request, { requireEmailVerified: false }),
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetHouses(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateHouse(request, createDeps);
}
