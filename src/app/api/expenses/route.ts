import {
  handleCreateExpense,
  handleGetExpenses,
} from "@/server/api/expenses-api";
import { appendAuditLog } from "@/server/audit-log-store";
import { verifyRequest, unauthorizedResponse } from "@/server/auth";
import { appendExpense, readExpenses } from "@/server/expense-store";

const getDeps = {
  readExpenses,
  verifyRequest,
  unauthorizedResponse,
};

const createDeps = {
  appendExpense,
  appendAuditLog,
  verifyRequest,
  unauthorizedResponse,
  now: () => new Date().toISOString(),
};

export async function GET(request: Request) {
  return handleGetExpenses(request, getDeps);
}

export async function POST(request: Request) {
  return handleCreateExpense(request, createDeps);
}
