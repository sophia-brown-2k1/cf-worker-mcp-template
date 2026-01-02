
import { json } from "../utils/response";
import type { Env } from "../types/env";

export async function handleHello(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "bạn";
  return json({
    message: `${env.GREETING}, ${name}!`,
    time: new Date().toISOString(),
    path: url.pathname,
  });
}
