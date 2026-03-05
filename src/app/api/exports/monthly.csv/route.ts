import { readTaskCompletions } from "@/server/task-completions-store";
import { readExpenses } from "@/server/expense-store";
import { readShoppingItems } from "@/server/shopping-store";
import { buildMonthlyOperationsCsv } from "@/server/monthly-export";
import { verifyRequest, unauthorizedResponse, resolveActorHouseId } from "@/server/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { errorJson } from "@/shared/lib/api-response";

export const runtime = "nodejs";

const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
    .optional(),
});

export async function GET(request: Request) {
  const actor = await verifyRequest(request).catch(() => null);
  if (!actor) return unauthorizedResponse();

  const houseId = await resolveActorHouseId(actor.uid);
  if (!houseId) return errorJson("No house found for user", "NO_HOUSE", 403);

  const { searchParams } = new URL(request.url);
  const parsedQuery = monthQuerySchema.safeParse({
    month: searchParams.get("month") ?? undefined,
  });
  if (!parsedQuery.success) {
    return errorJson(
      "Invalid month query. Use YYYY-MM format.",
      "VALIDATION_ERROR",
      400,
      parsedQuery.error.issues
    );
  }
  const month = parsedQuery.data.month ?? new Date().toISOString().slice(0, 7);

  let csv: string;
  try {
    const [taskCompletions, expenses, shoppingItems] = await Promise.all([
      readTaskCompletions(houseId),
      readExpenses(houseId, month),
      readShoppingItems(houseId),
    ]);
    csv = buildMonthlyOperationsCsv({ month, taskCompletions, expenses, shoppingItems });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to build monthly csv";
    return errorJson(message, "EXPORT_CSV_FAILED", 400, { cause: message });
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="operations-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
