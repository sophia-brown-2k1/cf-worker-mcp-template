import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";
import { handleApi } from "../routes/api";

export const apiToolDef: ToolDefinition = {
  name: "api",
  description: "Echo method and query. Optional query object and method.",
  inputSchema: {
    type: "object",
    properties: {
      method: { type: "string" },
      query: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    },
    required: [],
    additionalProperties: false,
  },
};

export const handleApiTool: ToolHandler = async (args, env) => {
  const url = new URL("https://mcp.local/api");
  const query = args.query;
  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string") url.searchParams.set(key, value);
    }
  }
  const method = typeof args.method === "string" ? args.method : "GET";
  const request = new Request(url.toString(), { method });
  return handleApi(request, env);
};
