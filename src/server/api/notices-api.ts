import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  ApiErrorResponse,
  AuditLogRecord,
  CreateNoticeInput,
  Notice,
} from "../../types/index.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";

type Params = { params: Promise<{ id: string }> };
type AuthenticatedUser = {
  uid: string;
  name: string;
  email: string;
};

export type GetNoticesDeps = {
  readNotices: () => Promise<Notice[]>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateNoticeDeps = {
  appendNotice: (input: CreateNoticeInput) => Promise<Notice>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteNoticeDeps = {
  deleteNotice: (noticeId: string, deletedBy: string, deletedAt: string) => Promise<Notice | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const createNoticeSchema = z.object({
  title: zNonEmptyTrimmedString,
  body: zTrimmedString.default(""),
  isImportant: z.boolean().optional().default(false),
});

function errorResponse(
  error: string,
  status: number,
  code: string,
  details?: unknown
) {
  return Response.json({ error, code, details } satisfies ApiErrorResponse, { status });
}

export async function handleGetNotices(request: Request, deps: GetNoticesDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const notices = await deps.readNotices();
  const active = notices.filter((notice) => !notice.deletedAt);
  return Response.json({ data: active });
}

export async function handleCreateNotice(request: Request, deps: CreateNoticeDeps) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON",
      400,
      "INVALID_JSON",
      "Request body must be valid JSON."
    );
  }

  const parsed = createNoticeSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "title") {
      return errorResponse("title is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    return errorResponse("Invalid body", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const input: CreateNoticeInput = {
    title: parsed.data.title,
    body: parsed.data.body,
    postedBy: actor.name,
    postedAt: deps.now(),
    isImportant: parsed.data.isImportant,
  };

  const created = await deps.appendNotice(input);

  await logAppAuditEvent(deps, {
    action: "notice_created",
    actor: actor.name,
    details: { noticeId: created.id, title: created.title, isImportant: created.isImportant },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleDeleteNotice(
  request: Request,
  { params }: Params,
  deps: DeleteNoticeDeps
) {
  const actor = await deps.verifyRequest(request).catch(() => null);
  if (!actor) return deps.unauthorizedResponse();

  const { id } = await params;
  const deletedAt = deps.now();
  const updated = await deps.deleteNotice(id, actor.name, deletedAt);

  if (!updated) {
    return errorResponse("Not found", 404, "NOTICE_NOT_FOUND", { noticeId: id });
  }

  await logAppAuditEvent(deps, {
    action: "notice_deleted",
    actor: actor.name,
    details: { noticeId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}
