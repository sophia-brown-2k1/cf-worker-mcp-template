
import type { Env } from "../types/env";

export async function handleCounter(request: Request, env: Env): Promise<Response> {
  if (!env.COUNTER) return new Response("Chưa cấu hình Durable Objects", { status: 500 });
  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "global";
  const id = env.COUNTER.idFromName(name);
  const stub = env.COUNTER.get(id);
  return stub.fetch(url.origin + "/do" + url.pathname.replace("/counter", ""));
}
