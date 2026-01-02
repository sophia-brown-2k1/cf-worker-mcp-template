/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";

export const SetKvToolDef: ToolDefinition = {
  name: "set-kv",
  description: "Set Key Value to storage",
  inputSchema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Key to store" },
      value: { type: "string", description: "Value to store" },
      expirationTtl: {
        type: "number",
        description: "Optional TTL in seconds",
      },
    },
    required: ["key", "value"],
    additionalProperties: false,
  },
};

export const handleSetKvTool: ToolHandler = async (
  args: Record<string, unknown>,
  env: Env
) => {
  if (!env.KV) {
    return new Response(JSON.stringify({ error: "KV not configured" }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const key = typeof args.key === "string" ? args.key : "";
  const value = typeof args.value === "string" ? args.value : null;

  if (!key || value === null) {
    return new Response(JSON.stringify({ error: "Invalid key or value" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const ttlRaw =
    typeof args.expirationTtl === "number" &&
    Number.isFinite(args.expirationTtl)
      ? Math.floor(args.expirationTtl)
      : undefined;

  if (ttlRaw && ttlRaw > 0) {
    await env.KV.put(key, value, { expirationTtl: ttlRaw });
  } else {
    await env.KV.put(key, value);
  }

  return new Response(
    JSON.stringify({
      ok: true,
      key,
      expirationTtl: ttlRaw && ttlRaw > 0 ? ttlRaw : null,
    }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
};
