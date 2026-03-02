import { handleDeleteExpense } from "@/server/api/expenses-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { cancelExpense, readExpenses } from "@/server/expense-store";

const deps = {
  appendAuditLog,
  cancelExpense,
  readExpenses,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleDeleteExpense(request, context, deps);
}
