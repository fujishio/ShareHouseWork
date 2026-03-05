import {
  handleDeleteProfile,
  handlePatchProfile,
} from "@/server/api/profile-api";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { getUser, upsertUser } from "@/server/user-store";
import { deleteAccountAndAnonymize } from "@/server/account-deletion-service";

export const runtime = "nodejs";

const patchDeps = {
  getUser,
  upsertUser,
  verifyRequest,
  unauthorizedResponse,
};

const deleteDeps = {
  getUser,
  deleteAccountAndAnonymize,
  verifyRequest,
  unauthorizedResponse,
};

export async function PATCH(request: Request) {
  return handlePatchProfile(request, patchDeps);
}

export async function DELETE(request: Request) {
  return handleDeleteProfile(request, deleteDeps);
}
