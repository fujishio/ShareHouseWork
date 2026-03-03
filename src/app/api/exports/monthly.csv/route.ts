import { readTaskCompletions } from "@/server/task-completions-store";
import { readExpenses } from "@/server/expense-store";
import { readShoppingItems } from "@/server/shopping-store";
import { buildMonthlyOperationsCsv } from "@/server/monthly-export";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { NextResponse } from "next/server";
import type { ApiErrorResponse } from "@/types";
import { z } from "zod";
import { createApiError } from "@/shared/lib/api-validation";

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

  const { searchParams } = new URL(request.url);
  const parsedQuery = monthQuerySchema.safeParse({
    month: searchParams.get("month") ?? undefined,
  });
  if (!parsedQuery.success) {
    return NextResponse.json(
      createApiError(
        "Invalid month query. Use YYYY-MM format.",
        "VALIDATION_ERROR",
        parsedQuery.error.issues
      ),
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
  }
  const month = parsedQuery.data.month ?? new Date().toISOString().slice(0, 7);

  let csv: string;
  try {
    const [taskCompletions, expenses, shoppingItems] = await Promise.all([
      readTaskCompletions(),
      readExpenses(),
      readShoppingItems(),
    ]);
    csv = buildMonthlyOperationsCsv({ month, taskCompletions, expenses, shoppingItems });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to build monthly csv";
    return NextResponse.json(
      createApiError(message, "EXPORT_CSV_FAILED", { cause: message }),
      { status: 400 }
    ) as NextResponse<ApiErrorResponse>;
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
