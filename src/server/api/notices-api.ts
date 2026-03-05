import {
  zNonEmptyTrimmedString,
  zTrimmedString,
} from "../../shared/lib/api-validation.ts";
import type {
  AuditLogRecord,
  CreateNoticeInput,
  Notice,
} from "../../types/index.ts";
import { z } from "zod";
import { logAppAuditEvent } from "./audit-log-service.ts";
import {
  errorResponse,
  readJsonBody,
  resolveHouseScopedContext,
  type AuthenticatedUser,
} from "./route-handler-utils.ts";

type Params = { params: Promise<{ id: string }> };

export type GetNoticesDeps = {
  readNotices: (houseId: string) => Promise<Notice[]>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
};

export type CreateNoticeDeps = {
  appendNotice: (input: CreateNoticeInput) => Promise<Notice>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

export type DeleteNoticeDeps = {
  deleteNotice: (noticeId: string, deletedBy: string, deletedAt: string) => Promise<Notice | null>;
  appendAuditLog: (record: Omit<AuditLogRecord, "id">) => Promise<AuditLogRecord>;
  resolveActorHouseId: (uid: string) => Promise<string | null>;
  verifyRequest: (request: Request) => Promise<AuthenticatedUser>;
  unauthorizedResponse: (message?: string) => Response;
  now: () => string;
};

const createNoticeSchema = z.object({
  title: zNonEmptyTrimmedString.pipe(z.string().max(120)),
  body: zTrimmedString.pipe(z.string().max(2000)).default(""),
  isImportant: z.boolean().optional().default(false),
});

export async function handleGetNotices(request: Request, deps: GetNoticesDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const notices = await deps.readNotices(context.houseId);
  const active = notices.filter((notice) => !notice.deletedAt);
  return Response.json({ data: active });
}

export async function handleCreateNotice(request: Request, deps: CreateNoticeDeps) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;
  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = createNoticeSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.path[0] === "title") {
      return errorResponse("title is required", 400, "VALIDATION_ERROR", parsed.error.issues);
    }
    return errorResponse("Invalid body", 400, "VALIDATION_ERROR", parsed.error.issues);
  }

  const input: CreateNoticeInput = {
    houseId: context.houseId,
    title: parsed.data.title,
    body: parsed.data.body,
    postedBy: context.actor.name,
    postedAt: deps.now(),
    isImportant: parsed.data.isImportant,
  };

  const created = await deps.appendNotice(input);

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "notice_created",
    actor: context.actor.name,
    details: { noticeId: created.id, title: created.title, isImportant: created.isImportant },
  });

  return Response.json({ data: created }, { status: 201 });
}

export async function handleDeleteNotice(
  request: Request,
  { params }: Params,
  deps: DeleteNoticeDeps
) {
  const context = await resolveHouseScopedContext(request, deps);
  if (context instanceof Response) return context;

  const { id } = await params;
  const deletedAt = deps.now();
  const updated = await deps.deleteNotice(id, context.actor.name, deletedAt);

  if (!updated) {
    return errorResponse("Notice not found", 404, "NOTICE_NOT_FOUND", { noticeId: id });
  }

  await logAppAuditEvent(deps, {
    houseId: context.houseId,
    action: "notice_deleted",
    actor: context.actor.name,
    details: { noticeId: id, title: updated.title },
  });

  return Response.json({ data: updated });
}
