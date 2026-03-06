import { z } from "zod";
import {
  zIsoDateString,
  zNonEmptyTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  AuditLogRecord,
  BalanceAdjustmentRecord,
  CreateBalanceAdjustmentRequest,
  CreateBalanceAdjustmentInput,
  MonthFilterQuery,
} from "../../types/index.ts";
import { logAppAuditEvent } from "./audit-log-service.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  validationError,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

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
  reason: zNonEmptyTrimmedString.pipe(z.string().max(500)),
  adjustedAt: zIsoDateString,
});

const monthParamSchema = z.string().regex(/^\d{4}-\d{2}$/).optional();

function toCreateBalanceAdjustmentInput(
  body: CreateBalanceAdjustmentRequest,
  houseId: string,
  adjustedBy: string
): CreateBalanceAdjustmentInput {
  return {
    houseId,
    amount: body.amount,
    reason: body.reason,
    adjustedBy,
    adjustedAt: body.adjustedAt,
  };
}

export async function handleGetBalanceAdjustments(
  request: Request,
  deps: GetBalanceAdjustmentsDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { searchParams } = new URL(request.url);
  const monthRaw = searchParams.get("month") ?? undefined;
  const parsedMonth = monthParamSchema.safeParse(monthRaw);
  if (!parsedMonth.success) {
    return errorResponse("month must be in YYYY-MM format", 400, "VALIDATION_ERROR");
  }
  const query: MonthFilterQuery = { month: parsedMonth.data };

  const adjustments = await deps.readBalanceAdjustments(context.houseId, query.month);
  return Response.json({ data: adjustments });
}

export async function handleCreateBalanceAdjustment(
  request: Request,
  deps: CreateBalanceAdjustmentDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createBalanceAdjustmentSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path[0] === "amount") {
      return validationError("amount must be a non-zero number", parsed.error.issues);
    }
    if (firstIssue?.path[0] === "reason") {
      return validationError("reason is required", parsed.error.issues);
    }
    if (firstIssue?.path[0] === "adjustedAt") {
      return validationError("Invalid adjustedAt date", parsed.error.issues);
    }
    return validationError("Missing or invalid fields", parsed.error.issues);
  }

  const requestBody: CreateBalanceAdjustmentRequest = parsed.data;
  const input = toCreateBalanceAdjustmentInput(
    requestBody,
    context.houseId,
    context.actor.name
  );

  const created = await deps.appendBalanceAdjustment(input);

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "balance_adjustment_created",
    actor: context.actor.name,
    actorUid: context.actor.uid,
    details: {
      adjustmentId: created.id,
      amount: created.amount,
      reason: created.reason,
      adjustedAt: created.adjustedAt,
    },
  });

  return Response.json({ data: created }, { status: 201 });
}
