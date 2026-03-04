import {
  handleCreateShoppingItem,
  handleGetShoppingItems,
} from "@/server/api/shopping-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { appendShoppingItem, readShoppingItems } from "@/server/shopping-store";

const getDeps = {
  readShoppingItems,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendShoppingItem,
  appendAuditLog,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetShoppingItems(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateShoppingItem(request, createDeps);
}
