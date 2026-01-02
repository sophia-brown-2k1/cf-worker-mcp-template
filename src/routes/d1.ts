
import { json } from "../utils/response";
import type { Env } from "../types/env";
import { now } from "../services/db";

export async function handleD1(_request: Request, env: Env): Promise<Response> {
  try {
    const row = await now(env);
    return json({ now: row?.now });
  } catch (err: any) {
    return json({ error: err.message }, { status: 500 });
  }
}
