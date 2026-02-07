import type { Env } from "../types/env";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolHandler = (
  args: Record<string, unknown>,
  env: Env
) => Promise<Response>;

// TOOL_IMPORTS_START
import { handleHelloTool, helloToolDef } from "./hello";
import { handleApiTool, apiToolDef } from "./api";
import { handlePingTool, PingToolDef } from "./ping";
import { handleGetKvTool, GetKvToolDef } from "./get-kv";
import { handleSetKvTool, SetKvToolDef } from "./set-kv";
import { handleHttpRequestTool, httpRequestToolDef } from "./http-request";
import { handleWeatherTool, WeatherToolDef } from "./weather";
// TOOL_IMPORTS_END

export const toolsList = [
  // TOOL_LIST_START
  helloToolDef,
  apiToolDef,
  PingToolDef,
  GetKvToolDef,
  SetKvToolDef,
  httpRequestToolDef,
  WeatherToolDef,
  // TOOL_LIST_END
] as const;

export const toolHandlers: Record<string, ToolHandler> = {
  // TOOL_REGISTER_START
  hello: handleHelloTool,
  api: handleApiTool,
  ping: handlePingTool,
  "get-kv": handleGetKvTool,
  "set-kv": handleSetKvTool,
  "http-request": handleHttpRequestTool,
  "weather": handleWeatherTool,
  // TOOL_REGISTER_END
};
