import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  ExpenseRecord,
  GetMonthlyExportQuery,
  ShoppingItem,
  TaskCompletionRecord,
} from "../../types/index.ts";
import {
  errorResponse,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

const monthQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "month must be in YYYY-MM format")
    .optional(),
});

export type GetMonthlyExportCsvDeps = {
  readTaskCompletions: (houseId: string) => Promise<TaskCompletionRecord[]>;
  readExpenses: (houseId: string, month?: string) => Promise<ExpenseRecord[]>;
  readShoppingItems: (houseId: string) => Promise<ShoppingItem[]>;
  buildMonthlyOperationsCsv: (input: {
    month: string;
    taskCompletions: TaskCompletionRecord[];
    expenses: ExpenseRecord[];
    shoppingItems: ShoppingItem[];
  }) => string;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export async function handleGetMonthlyExportCsv(
  request: Request,
  deps: GetMonthlyExportCsvDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const parsedQuery = monthQuerySchema.safeParse({
    month: searchParams.get("month") ?? undefined,
  });
  if (!parsedQuery.success) {
    return validationError(
      "Invalid month query. Use YYYY-MM format.",
      parsedQuery.error.issues
    );
  }
  const query: GetMonthlyExportQuery = parsedQuery.data;
  const month = query.month ?? new Date().toISOString().slice(0, 7);

  let csv: string;
  try {
    const [taskCompletions, expenses, shoppingItems] = await Promise.all([
      deps.readTaskCompletions(context.houseId),
      deps.readExpenses(context.houseId, month),
      deps.readShoppingItems(context.houseId),
    ]);
    csv = deps.buildMonthlyOperationsCsv({ month, taskCompletions, expenses, shoppingItems });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to build monthly csv";
    return errorResponse(message, 400, "EXPORT_CSV_FAILED", { cause: message });
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
