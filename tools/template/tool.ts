/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";

export const __TOOL_DEF_NAME__: ToolDefinition = {
  name: "__TOOL_NAME__",
  description: "__TOOL_DESCRIPTION__",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

export const __TOOL_HANDLER_NAME__: ToolHandler = async (
  _args: Record<string, unknown>,
  _env: Env
) => {
  return new Response("Not implemented", { status: 501 });
};
