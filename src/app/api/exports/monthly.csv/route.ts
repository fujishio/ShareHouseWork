import { handleGetMonthlyExportCsv } from "@/server/api/monthly-export-api";
import { readTaskCompletions } from "@/server/task-completions-store";
import { readExpenses } from "@/server/expense-store";
import { readShoppingItems } from "@/server/shopping-store";
import { buildMonthlyOperationsCsv } from "@/server/monthly-export";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";

export const runtime = "nodejs";

const deps = {
  readTaskCompletions,
  readExpenses,
  readShoppingItems,
  buildMonthlyOperationsCsv,
  resolveActorHouseId,
  verifyRequest,
  unauthorizedResponse,
};

export async function GET(request: Request) {
  return handleGetMonthlyExportCsv(request, deps);
}
