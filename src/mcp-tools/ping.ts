/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";

export const PingToolDef: ToolDefinition = {
  name: "ping",
  description: "Return pong",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

export const handlePingTool: ToolHandler = async (
  _args: Record<string, unknown>,
  _env: Env
) => {
  return new Response("Ping successful!", { status: 200 });
};
