import type { Env } from "./types/env";
import { handleHello } from "./routes/hello";
import { handleApi } from "./routes/api";

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

const toolsList = [
  {
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
  },
  {
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
  },
] as const;

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
  const args = params.arguments ?? {};

  if (name === "hello") {
    const url = new URL("https://mcp.local/hello");
    if (typeof args.name === "string") {
      url.searchParams.set("name", args.name);
    }
    const request = new Request(url.toString(), { method: "GET" });
    const response = await handleHello(request, env);
    return responseToToolContent(response);
  }

  if (name === "api") {
    const url = new URL("https://mcp.local/api");
    const query = args.query;
    if (query && typeof query === "object") {
      for (const [key, value] of Object.entries(query)) {
        if (typeof value === "string") url.searchParams.set(key, value);
      }
    }
    const method = typeof args.method === "string" ? args.method : "GET";
    const request = new Request(url.toString(), { method });
    const response = await handleApi(request, env);
    return responseToToolContent(response);
  }

  throw new Error(`Unknown tool: ${name ?? ""}`);
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
