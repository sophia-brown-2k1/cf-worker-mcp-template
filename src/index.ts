import type { Env } from "./types/env";
import { isPreflight, preflightResponse } from "./utils/cors";
import { json, text } from "./utils/response";
import { handleHello } from "./routes/hello";
import { handleApi } from "./routes/api";
import { handleKV } from "./routes/kv";
import { handleD1 } from "./routes/d1";
import { handleR2 } from "./routes/r2";
import { handleRequest } from "./routes/request";
import { handleCounter } from "./routes/counter";
import { Counter } from "./do/Counter";
import { handleMcp } from "./mcp";
import { handleOpenAI } from "./routes/openai";

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    if (isPreflight(request)) return preflightResponse();

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/" || path === "") {
      return json({
        message: "Cloudflare Workers skeleton",
        routes: [
          "/hello",
          "/api",
          "/request (POST)",
          "/kv (GET|POST?key=...)",
          "/d1",
          "/r2 (GET|POST)",
          "/counter",
          "/counter/incr",
          "/v1/models (GET)",
          "/v1/embeddings (POST)",
        ],
      });
    }

    if (path.startsWith("/hello")) return handleHello(request, env);
    if (path.startsWith("/api")) return handleApi(request, env);
    if (path.startsWith("/mcp")) return handleMcp(request, env);
    if (path.startsWith("/v1") || path.startsWith("/openai/v1")) {
      return handleOpenAI(request, env);
    }
    if (path.startsWith("/request")) return handleRequest(request, env);
    if (path.startsWith("/kv")) return handleKV(request, env);
    if (path.startsWith("/d1")) return handleD1(request, env);
    if (path.startsWith("/r2")) return handleR2(request, env);
    if (path.startsWith("/counter")) return handleCounter(request, env);

    return text("Not Found", { status: 404 });
  },

  // Ví dụ scheduled (bật trong wrangler.toml)
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext) {
    // Thực hiện job định kỳ tại đây
    console.log("Cron job chạy lúc:", new Date().toISOString());
  },

  // Khai báo lớp Durable Object để bundler biết (nếu dùng)
  // (wrangler.toml cần bật [durable_objects] bindings)
  Counter,
};
