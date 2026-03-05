import { z } from "zod";
import {
  zIsoDateString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  ApiErrorResponse,
  AuditLogRecord,
  BalanceAdjustmentRecord,
  CreateBalanceAdjustmentInput,
} from "../../types/index.ts";
import { logAppAuditEvent } from "./audit-log-service.ts";

type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetBalanceAdjustmentsDeps = {
  readBalanceAdjustments: (
    houseId: string,
    month?: string
  ) => Promise<BalanceAdjustmentRecord[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateBalanceAdjustmentDeps = {
  appendBalanceAdjustment: (
    input: CreateBalanceAdjustmentInput
  ) => Promise<BalanceAdjustmentRecord>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  now: () => string;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

const createBalanceAdjustmentSchema = z.object({
  amount: z.number().finite().refine((value) => value !== 0, {
    message: "amount must not be zero",
  }),
  reason: zNonEmptyTrimmedString,
  adjustedAt: zIsoDateString,
});

const monthParamSchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetBalanceAdjustments(
  request: Request,
  deps: GetBalanceAdjustmentsDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  const { searchParams } = new URL(request.url);
  const monthRaw = searchParams.get("month") ?? undefined;
  const parsedMonth = monthParamSchema.safeParse(monthRaw);
  if (!parsedMonth.success) {
    return errorResponse("month must be in YYYY-MM format", 400, "VALIDATION_ERROR");
  }
  const month = parsedMonth.data;

  const adjustments = await deps.readBalanceAdjustments(houseId, month);
  return Response.json({ data: adjustments });
}

export async function handleCreateBalanceAdjustment(
  request: Request,
  deps: CreateBalanceAdjustmentDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const houseId = await deps.resolveActorHouseId(actor.uid);
  if (!houseId) return errorResponse("No house found for user", 403, "NO_HOUSE");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400, "INVALID_JSON");
  }

  const parsed = createBalanceAdjustmentSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "amount") {
      return errorResponse(
        "amount must be a non-zero number",
        400,
        "VALIDATION_ERROR",
        parsed.error.issues
      );
    }
    if (firstIssue?.path[0] === "reason") {
      return errorResponse("reason is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    if (firstIssue?.path[0] === "adjustedAt") {
      return errorResponse(
        "Invalid adjustedAt date",
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

  const input: CreateBalanceAdjustmentInput = {
    houseId,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    adjustedBy: actor.name,
    adjustedAt: parsed.data.adjustedAt,
  };

  const created = await deps.appendBalanceAdjustment(input);

  await logAppAuditEvent(deps, {
    houseId,
    action: "balance_adjustment_created",
    actor: actor.name,
    details: {
      adjustmentId: created.id,
      amount: created.amount,
      reason: created.reason,
      adjustedAt: created.adjustedAt,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}
