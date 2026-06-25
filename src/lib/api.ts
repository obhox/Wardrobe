// Thin client-side fetch helpers. All return parsed JSON or throw.

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (url: string) => fetch(url, { credentials: "same-origin" }).then(jsonOrThrow),
  post: (url: string, body?: unknown) =>
    fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(jsonOrThrow),
  patch: (url: string, body?: unknown) =>
    fetch(url, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).then(jsonOrThrow),
  del: (url: string) =>
    fetch(url, { method: "DELETE", credentials: "same-origin" }).then(jsonOrThrow),
};
