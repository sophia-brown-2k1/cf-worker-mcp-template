
import { json } from "../utils/response";
import type { Env } from "../types/env";

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  return json({
    ok: true,
    query: Object.fromEntries(url.searchParams.entries()),
    method: request.method,
    greeting: env.GREETING,
  });
}
