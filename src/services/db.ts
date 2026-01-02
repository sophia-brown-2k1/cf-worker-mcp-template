
import type { Env } from "../types/env";

export async function now(env: Env) {
  if (!env.DB) throw new Error("Chưa cấu hình D1 (env.DB)");
  // Truy vấn đơn giản để kiểm tra kết nối
  return await env.DB.prepare("select datetime('now') as now").first();
}
