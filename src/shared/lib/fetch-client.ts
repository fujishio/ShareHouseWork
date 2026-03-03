import { getClientAuth } from "@/lib/firebase-client";

async function getAuthHeaders(): Promise<HeadersInit> {
  const auth = getClientAuth();
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  });
}

type JsonGuard<T> = (value: unknown) => value is T;

export async function readJsonUnknown(response: Response): Promise<unknown> {
  return response.json();
}

export async function readJson<T>(
  response: Response,
  guard?: JsonGuard<T>
): Promise<T> {
  const payload = await readJsonUnknown(response);
  if (guard && !guard(payload)) {
    throw new Error("Invalid JSON response shape");
  }
  return payload as T;
}
