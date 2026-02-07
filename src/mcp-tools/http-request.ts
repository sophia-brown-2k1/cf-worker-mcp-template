import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";
import { json } from "../utils/response";
import { performHttpRequest } from "../services/http-client";

export const httpRequestToolDef: ToolDefinition = {
  name: "http-request",
  description:
    "Perform an outbound HTTP request with method, headers, query, and body/json.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "Target URL (http/https)" },
      method: { type: "string", description: "HTTP method (default GET)" },
      headers: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Request headers",
      },
      query: {
        type: "object",
        additionalProperties: { type: "string" },
        description: "Query params",
      },
      body: {
        type: "string",
        description: "Raw body (mutually exclusive with json)",
      },
      json: {
        type: "object",
        description: "JSON body (mutually exclusive with body)",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
};

export const handleHttpRequestTool: ToolHandler = async (
  args: Record<string, unknown>,
  _env: Env
) => {
  const result = await performHttpRequest(args);
  if (!result.ok) {
    return json({ error: result.error }, { status: result.status });
  }
  return json(result.data);
};
