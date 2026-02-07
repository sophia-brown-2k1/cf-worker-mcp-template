import { json } from "../utils/response";
import type { Env } from "../types/env";
import { performHttpRequest } from "../services/http-client";

export async function handleRequest(
  request: Request,
  _env: Env
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    return json(
      { error: "Invalid JSON", detail: String(error) },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await performHttpRequest(body as Record<string, unknown>);
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status });
  }

  return json(result.data);
}
