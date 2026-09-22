// Thin client-side fetch helpers. All return parsed JSON or throw an Error
// carrying the server's message (which is written to be shown as-is).

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      data?.error ||
        (res.status === 429
          ? "too many tries — wait a moment"
          : res.status >= 500
            ? "something went wrong on our side — try again"
            : `request failed (${res.status})`),
      res.status
    );
  }
  return data;
}

function send(method: string, url: string, body?: unknown, init?: RequestInit) {
  return fetch(url, {
    method,
    credentials: "same-origin",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  }).then(jsonOrThrow);
}

export const api = {
  get: (url: string) => fetch(url, { credentials: "same-origin" }).then(jsonOrThrow),
  post: (url: string, body?: unknown) => send("POST", url, body),
  patch: (url: string, body?: unknown, init?: RequestInit) => send("PATCH", url, body, init),
  del: (url: string, body?: unknown) => send("DELETE", url, body),
};
