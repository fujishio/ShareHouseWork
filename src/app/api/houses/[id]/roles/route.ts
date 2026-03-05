import { handleUpdateHouseRole } from "@/server/api/houses-api";
import { getHouse, grantHostRole, revokeHostRole } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

const deps = {
  getHouse,
  grantHostRole,
  revokeHostRole,
  verifyRequest,
  unauthorizedResponse,
};

export async function POST(request: Request, { params }: Params) {
  return handleUpdateHouseRole(request, { params }, deps);
}
