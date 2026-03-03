import type { ContributionSettings } from "@/types";

export function isDataArrayResponse<T = unknown>(
  value: unknown
): value is { data: T[] } {
  if (!value || typeof value !== "object") return false;
  return Array.isArray(Reflect.get(value, "data"));
}

export function isDataObjectResponse<T extends object = Record<string, unknown>>(
  value: unknown
): value is { data: T } {
  if (!value || typeof value !== "object") return false;
  const data = Reflect.get(value, "data");
  return typeof data === "object" && data !== null;
}

export function isApiErrorBody(value: unknown): value is { error?: string } {
  if (!value || typeof value !== "object") return false;
  const error = Reflect.get(value, "error");
  return error === undefined || typeof error === "string";
}

export function isContributionSettingsResponse(
  value: unknown
): value is { data: ContributionSettings } {
  if (!isDataObjectResponse(value)) return false;
  return (
    typeof Reflect.get(value.data, "monthlyAmountPerPerson") === "number" &&
    typeof Reflect.get(value.data, "memberCount") === "number"
  );
}
