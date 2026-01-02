
import type { Env } from "../types/env";

export async function putHello(env: Env, content: string) {
  if (!env.BUCKET) throw new Error("Chưa cấu hình R2 (env.BUCKET)");
  await env.BUCKET.put("hello.txt", content);
}

export async function getHello(env: Env) {
  if (!env.BUCKET) throw new Error("Chưa cấu hình R2 (env.BUCKET)");
  const obj = await env.BUCKET.get("hello.txt");
  if (!obj) return null;
  return await obj.text();
}
