import { z } from "zod";
import type { ApiErrorResponse } from "@/types";
import {
  normalizeIsoDateString,
  normalizeIsoDateTimeString,
  normalizeYearMonthString,
} from "./date-normalization.ts";

export const zTrimmedString = z.string().transform((value) => value.trim());

export const zNonEmptyTrimmedString = zTrimmedString.pipe(
  z.string().min(1, "Required")
);

export const zIsoDateString = z.string().transform((value, context) => {
  const normalized = normalizeIsoDateString(value);
  if (!normalized) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date. Use YYYY-MM-DD.",
    });
    return z.NEVER;
  }
  return normalized;
});

export const zIsoDateTimeString = z.string().transform((value, context) => {
  const normalized = normalizeIsoDateTimeString(value);
  if (!normalized) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid datetime. Use ISO8601 with timezone.",
    });
    return z.NEVER;
  }
  return normalized;
});

export const zYearMonthString = z.string().transform((value, context) => {
  const normalized = normalizeYearMonthString(value);
  if (!normalized) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid month. Use YYYY-MM.",
    });
    return z.NEVER;
  }
  return normalized;
});

export function createApiError(
  error: string,
  code: string,
  details?: unknown
): ApiErrorResponse {
  return { error, code, details };
}
