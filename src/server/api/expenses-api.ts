import { EXPENSE_CATEGORIES } from "../../domain/expenses/expense-categories.ts";
import {
  normalizePurchasedAt,
} from "../../domain/expenses/expense-api-validation.ts";
import {
  zIsoDateString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  AuditLogRecord,
  CreateExpenseRequest,
  CreateExpenseInput,
  DeleteExpenseRequest,
  ExpenseRecord,
  MonthFilterQuery,
} from "../../types/index.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

export type GetExpensesDeps = {
  readExpenses: (houseId: string, month?: string) => Promise<ExpenseRecord[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateExpenseDeps = {
  appendExpense: (input: CreateExpenseInput) => Promise<ExpenseRecord>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteExpenseDeps = {
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  cancelExpense: (
    id: string,
    input: { canceledBy: string; cancelReason: string },
    canceledAt: string
  ) => Promise<ExpenseRecord | null>;
  readExpenses: (houseId: string, month?: string) => Promise<ExpenseRecord[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const createExpenseSchema = z.object({
  title: zNonEmptyTrimmedString.pipe(z.string().max(120)),
  amount: z.number().finite().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  purchasedAt: zIsoDateString.or(
    z.string().transform((value, context) => {
      const normalized = normalizePurchasedAt(value);
      if (!normalized) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid purchasedAt date",
        });
        return z.NEVER;
      }
      return normalized;
    })
  ),
});

const deleteExpenseSchema = z.object({
  cancelReason: zNonEmptyTrimmedString.pipe(z.string().max(500)),
});

const monthParamSchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

function toCreateExpenseInput(
  body: CreateExpenseRequest,
  houseId: string,
  purchasedBy: string
): CreateExpenseInput {
  return {
    houseId,
    title: body.title,
    amount: body.amount,
    category: body.category,
    purchasedBy,
    purchasedAt: body.purchasedAt,
  };
}

export async function handleGetExpenses(request: Request, deps: GetExpensesDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const monthRaw = searchParams.get("month") ?? undefined;
  const parsedMonth = monthParamSchema.safeParse(monthRaw);
  if (!parsedMonth.success) {
    return errorResponse("month must be in YYYY-MM format", 400, "VALIDATION_ERROR");
  }
  const query: MonthFilterQuery = { month: parsedMonth.data };

  const expenses = await deps.readExpenses(context.houseId, query.month);
  return Response.json({ data: expenses });
}

export async function handleCreateExpense(
  request: Request,
  deps: CreateExpenseDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createExpenseSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "title") {
      return errorResponse("title is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    if (firstIssue?.path[0] === "amount") {
      return errorResponse(
        "amount must be a positive number",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues
      );
    }
    if (firstIssue?.path[0] === "category") {
      return errorResponse("Invalid category", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    if (firstIssue?.path[0] === "purchasedAt") {
      return errorResponse(
        "Invalid purchasedAt date",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues
      );
    }
    return errorResponse(
      "Missing or invalid fields",
      400,
      "VALIDATION_ERROR",
      parsed.error.issues
    );
  }

  const requestBody: CreateExpenseRequest = parsed.data;
  const input = toCreateExpenseInput(requestBody, context.houseId, context.actor.name);

  const created = await deps.appendExpense(input);

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "expense_created",
    actor: context.actor.name,
    actorUid: context.actor.uid,
    details: {
      expenseId: created.id,
      title: created.title,
      amount: created.amount,
      category: created.category,
      purchasedAt: created.purchasedAt,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleDeleteExpense(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  deps: DeleteExpenseDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = deleteExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("cancelReason is required", parsed.error.issues);
  }
  const requestBody: DeleteExpenseRequest = parsed.data;
  const cancelReason = requestBody.cancelReason;

  const canceledAt = deps.now();
  const existing = (await deps.readExpenses(context.houseId)).find((expense) => expense.id === id);
  if (!existing) {
    return errorResponse("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  const updated = await deps.cancelExpense(
    id,
    {
      canceledBy: context.actor.name,
      cancelReason,
    },
    canceledAt
  );

  if (!updated) {
    return errorResponse("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await logAppAuditEvent(deps, {
      houseId: context.houseId,
      action: "expense_canceled",
      actor: context.actor.name,
    actorUid: context.actor.uid,
      createdAt: canceledAt,
      details: {
        expenseId: updated.id,
        title: updated.title,
        amount: updated.amount,
        category: updated.category,
        cancelReason,
      },
    });
  }

  return Response.json({ data: updated });
}
