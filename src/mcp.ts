import type { Env } from "./types/env";
import { toolHandlers, toolsList } from "./mcp-tools/registry";

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

type JsonRpcError = {
  code: number;
  message: string;
  data?: unknown;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
};

type ToolsCallParams = {
  name?: string;
  arguments?: Record<string, unknown>;
};

const SERVER_NAME = "cf-worker-mcp-template";
const SERVER_VERSION = "0.1.0";
const PROTOCOL_VERSION = "2024-11-05";

function jsonRpcResult(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: JsonRpcId,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { jsonrpc?: unknown; method?: unknown };
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

async function responseToToolContent(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text();
  const isJson = contentType.includes("application/json");
  return {
    content: [
      {
        type: "text",
        text: isJson ? bodyText : bodyText,
      },
    ],
    isError: !response.ok,
  };
}

async function handleToolsCall(
  params: ToolsCallParams,
  env: Env
): Promise<unknown> {
  const name = params.name;
  const rawArgs = params.arguments;
  const args =
    rawArgs && typeof rawArgs === "object"
      ? (rawArgs as Record<string, unknown>)
      : {};

  if (!name) throw new Error("Unknown tool: ");
  const handler = toolHandlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);

  const response = await handler(args, env);
  return responseToToolContent(response);
}

function buildSseResponse(payload: JsonRpcResponse): Response {
  const data = JSON.stringify(payload);
  const body = `event: message\ndata: ${data}\n\n`;
  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

function buildJsonResponse(payload: JsonRpcResponse): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    const payload = jsonRpcError(null, -32700, "Parse error", String(error));
    return buildJsonResponse(payload);
  }

  if (!isJsonRpcRequest(body)) {
    const payload = jsonRpcError(null, -32600, "Invalid Request");
    return buildJsonResponse(payload);
  }

  const id: JsonRpcId = body.id ?? null;
  const method = body.method;
  const params = body.params;

  let payload: JsonRpcResponse;
  try {
    if (method === "initialize") {
      payload = jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        capabilities: { tools: {} },
      });
    } else if (method === "tools/list") {
      payload = jsonRpcResult(id, { tools: toolsList });
    } else if (method === "tools/call") {
      if (typeof params !== "object" || params === null) {
        payload = jsonRpcError(id, -32602, "Invalid params");
      } else {
        const result = await handleToolsCall(params as ToolsCallParams, env);
        payload = jsonRpcResult(id, result);
      }
    } else if (method === "ping") {
      payload = jsonRpcResult(id, { ok: true });
    } else {
      payload = jsonRpcError(id, -32601, "Method not found");
    }
  } catch (error) {
    payload = jsonRpcError(id, -32000, "Server error", String(error));
  }

  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/event-stream")) {
    return buildSseResponse(payload);
  }
  return buildJsonResponse(payload);
}
