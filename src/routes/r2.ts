
import { json, text } from "../utils/response";
import type { Env } from "../types/env";
import { putHello, getHello } from "../services/storage";

export async function handleR2(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method === "POST") {
      const body = await request.text();
      await putHello(env, body || "Hello R2!");
      return text("Đã lưu hello.txt vào R2");
    }

    const content = await getHello(env);
    if (content === null) return json({ error: "Chưa có hello.txt" }, { status: 404 });
    return json({ content });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
