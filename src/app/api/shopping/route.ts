import {
  handleCreateShoppingItem,
  handleGetShoppingItems,
} from "@/server/api/shopping-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { appendShoppingItem, readShoppingItems } from "@/server/shopping-store";

const getDeps = {
  readShoppingItems,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendShoppingItem,
  appendAuditLog,
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
