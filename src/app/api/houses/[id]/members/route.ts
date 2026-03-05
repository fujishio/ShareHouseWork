import { handleAddHouseMember } from "@/server/api/houses-api";
import { addHouseMember, getHouse } from "@/server/house-store";
import { syncContributionMemberCountForCurrentMonth } from "@/server/contribution-settings-store";
import { getUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

const deps = {
  getHouse,
  addHouseMember,
  syncContributionMemberCountForCurrentMonth,
  getUser,
  verifyRequest,
  unauthorizedResponse,
};

export async function POST(request: Request, { params }: Params) {
  return handleAddHouseMember(request, { params }, deps);
}
