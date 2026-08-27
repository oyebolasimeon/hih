/** Skip global mutation toasts (loader still runs). */
export const MUTATION_SILENT_HEADER = "X-Mutation-Silent";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isMutatingMethod(method: string): boolean {
  return MUTATING_METHODS.has(method.toUpperCase());
}

export function isSameOriginApiRequest(input: RequestInfo | URL): boolean {
  const raw =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (raw.startsWith("/api/")) return true;

  try {
    const parsed = new URL(raw, window.location.origin);
    return (
      parsed.origin === window.location.origin &&
      parsed.pathname.startsWith("/api/")
    );
  } catch {
    return false;
  }
}

export function isSilentMutation(
  input?: RequestInfo | URL,
  init?: RequestInit
): boolean {
  if (input instanceof Request) {
    if (input.headers.get(MUTATION_SILENT_HEADER) === "1") return true;
  }
  if (!init?.headers) return false;
  const headers = init.headers;
  if (headers instanceof Headers) {
    return headers.get(MUTATION_SILENT_HEADER) === "1";
  }
  if (Array.isArray(headers)) {
    return headers.some(
      ([key, value]) =>
        key.toLowerCase() === MUTATION_SILENT_HEADER.toLowerCase() &&
        value === "1"
    );
  }
  const record = headers as Record<string, string>;
  return (
    record[MUTATION_SILENT_HEADER] === "1" ||
    record["x-mutation-silent"] === "1"
  );
}

export function mutationSilentHeaders(
  extra?: HeadersInit
): Record<string, string> {
  return {
    ...(extra as Record<string, string> | undefined),
    [MUTATION_SILENT_HEADER]: "1",
  };
}

export function resolveRequestMethod(
  input: RequestInfo | URL,
  init?: RequestInit
): string {
  if (init?.method) return init.method.toUpperCase();
  if (input instanceof Request) return input.method.toUpperCase();
  return "GET";
}

export async function readJsonBody(res: Response): Promise<unknown> {
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export function messageFromResponse(
  data: unknown,
  ok: boolean,
  status: number
): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message.trim();
    }
    if (!ok && typeof record.error === "string" && record.error.trim()) {
      return record.error.trim();
    }
  }
  if (ok) return "Saved successfully.";
  if (status === 401) return "You are not signed in.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That resource was not found.";
  if (status >= 500) return "Something went wrong on the server.";
  return "Request failed. Please try again.";
}
