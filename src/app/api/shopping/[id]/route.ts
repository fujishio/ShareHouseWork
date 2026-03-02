import {
  handleDeleteShoppingItem,
  handlePatchShoppingItem,
} from "@/server/api/shopping-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import {
  cancelShoppingItem,
  checkShoppingItem,
  readShoppingItems,
  uncheckShoppingItem,
} from "@/server/shopping-store";

type Params = { params: Promise<{ id: string }> };

const patchDeps = {
  readShoppingItems,
  checkShoppingItem,
  uncheckShoppingItem,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

const deleteDeps = {
  readShoppingItems,
  cancelShoppingItem,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function PATCH(request: Request, context: Params) {
  return handlePatchShoppingItem(request, context, patchDeps);
}

export async function DELETE(request: Request, context: Params) {
  return handleDeleteShoppingItem(request, context, deleteDeps);
}
