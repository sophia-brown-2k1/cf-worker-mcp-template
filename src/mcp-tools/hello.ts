import type { Env } from "../types/env";
import type { ToolDefinition, ToolHandler } from "./registry";
import { handleHello } from "../routes/hello";

export const helloToolDef: ToolDefinition = {
  name: "hello",
  description: "Return greeting and time. Optional query param: name.",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
    },
    required: [],
    additionalProperties: false,
  },
};

export const handleHelloTool: ToolHandler = async (args, env) => {
  const url = new URL("https://mcp.local/hello");
  if (typeof args.name === "string") {
    url.searchParams.set("name", args.name);
  }
  const request = new Request(url.toString(), { method: "GET" });
  return handleHello(request, env);
};
