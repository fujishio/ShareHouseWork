import { EXPENSE_CATEGORIES } from "../../domain/expenses/expense-categories.ts";
import {
  normalizePurchasedAt,
} from "../../domain/expenses/expense-api-validation.ts";
import {
  zIsoDateString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  ApiErrorResponse,
  AuditLogRecord,
  CreateExpenseInput,
  ExpenseRecord,
} from "../../types/index.ts";
import { z } from "zod";

type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetExpensesDeps = {
  readExpenses: () => Promise<ExpenseRecord[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateExpenseDeps = {
  appendExpense: (input: CreateExpenseInput) => Promise<ExpenseRecord>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
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
  readExpenses: () => Promise<ExpenseRecord[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const createExpenseSchema = z.object({
  title: zNonEmptyTrimmedString,
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
  cancelReason: zNonEmptyTrimmedString,
});

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetExpenses(request: Request, deps: GetExpensesDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const expenses = await deps.readExpenses();
  return Response.json({ data: expenses });
}

export async function handleCreateExpense(
  request: Request,
  deps: CreateExpenseDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = createExpenseSchema.safeParse(body);
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

  const input: CreateExpenseInput = {
    title: parsed.data.title,
    amount: parsed.data.amount,
    category: parsed.data.category,
    purchasedBy: actor.name,
    purchasedAt: parsed.data.purchasedAt,
  };

  const created = await deps.appendExpense(input);

  await deps.appendAuditLog({
    action: "expense_created",
    actor: actor.name,
    source: "app",
    createdAt: deps.now(),
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
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = deleteExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("cancelReason is required", 400, "VALIDATION_ERROR", parsed.error.issues);
  }
  const cancelReason = parsed.data.cancelReason;

  const canceledAt = deps.now();
  const existing = (await deps.readExpenses()).find((expense) => expense.id === id);
  if (!existing) {
    return errorResponse("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  const updated = await deps.cancelExpense(
    id,
    {
      canceledBy: actor.name,
      cancelReason,
    },
    canceledAt
  );

  if (!updated) {
    return errorResponse("Expense not found", 404, "EXPENSE_NOT_FOUND");
  }

  if (!existing.canceledAt && updated.canceledAt) {
    await deps.appendAuditLog({
      action: "expense_canceled",
      actor: actor.name,
      source: "app",
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
