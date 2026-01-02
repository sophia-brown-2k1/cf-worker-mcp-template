/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";

export const GetKvToolDef: ToolDefinition = {
  name: "get-kv",
  description: "Get Key Value from storage",
  inputSchema: {
    type: "object",
    properties: {
      key: { type: "string", description: "Key to fetch" },
    },
    required: ["key"],
    additionalProperties: false,
  },
};

export const handleGetKvTool: ToolHandler = async (
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
  if (!key) {
    return new Response(JSON.stringify({ error: "Invalid key" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const value = await env.KV.get(key);
  return new Response(JSON.stringify({ key, value }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
