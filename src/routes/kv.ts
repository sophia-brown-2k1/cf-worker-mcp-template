
import { json, text } from "../utils/response";
import type { Env } from "../types/env";

export async function handleKV(request: Request, env: Env): Promise<Response> {
  if (!env.KV) return json({ error: "Chưa cấu hình KV" }, { status: 500 });
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "message";

  if (request.method === "GET") {
    const value = await env.KV.get(key);
    return json({ key, value });
  }

  if (request.method === "POST") {
    const body = await request.text();
    await env.KV.put(key, body, { expirationTtl: 3600 });
    return text("Đã lưu vào KV (TTL 3600s)");
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
