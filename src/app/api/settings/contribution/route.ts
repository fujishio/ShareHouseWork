import {
  handleGetContributionSettings,
  handleUpdateContributionSettings,
} from "@/server/api/contribution-settings-api";
import {
  readContributionSettings,
  writeContributionSettings,
} from "@/server/contribution-settings-store";
import { getHouse } from "@/server/house-store";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
export const runtime = "nodejs";

const getDeps = {
  readContributionSettings,
  getHouse,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

const updateDeps = {
  writeContributionSettings,
  getHouse,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetContributionSettings(request, getDeps);
}

export async function POST(request: Request) {
  return handleUpdateContributionSettings(request, updateDeps);
}
