import { handleJoinHouse } from "@/server/api/houses-api";
import { findHouseByNameAndJoinPassword, addHouseMember } from "@/server/house-store";
import { syncContributionMemberCountForCurrentMonth } from "@/server/contribution-settings-store";
import { getUser } from "@/server/user-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { takeRateLimit } from "@/server/rate-limit";

export const runtime = "nodejs";

const deps = {
  findHouseByNameAndJoinPassword,
  addHouseMember,
  syncContributionMemberCountForCurrentMonth,
  getUser,
  takeRateLimit,
  verifyRequest: (request: Request) => verifyRequest(request, { requireEmailVerified: false }),
  unauthorizedResponse,
};

export async function POST(request: Request) {
  return handleJoinHouse(request, deps);
}
