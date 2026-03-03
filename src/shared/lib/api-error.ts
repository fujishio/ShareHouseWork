import { readJsonUnknown } from "./fetch-client";

export async function getApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await readJsonUnknown(response);
    if (typeof data === "object" && data !== null) {
      const error = Reflect.get(data, "error");
      if (typeof error === "string" && error.trim()) {
        return error;
      }
    }
  } catch {
    // ignore invalid json
  }
  return fallback;
}
