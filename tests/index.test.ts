import { describe, it, expect, vi, afterEach } from "vitest";
import { json } from "../src/utils/response";
import { handleMcp } from "../src/mcp";
import { handleRequest } from "../src/routes/request";
import { handleOpenAI } from "../src/routes/openai";

type MockKv = {
  get: (key: string) => Promise<string | null>;
  put: (
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ) => Promise<void>;
};

function createMockKv() {
  const store = new Map<string, string>();
  return {
    store,
    kv: {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async put(key: string, value: string) {
        store.set(key, value);
      },
    } satisfies MockKv,
  };
}

function buildMcpRequest(body: unknown) {
  return new Request("https://example.test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function decodeEmbeddingBase64ToFloat32(value: string): number[] {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const view = new DataView(bytes.buffer);
  const numbers: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    numbers.push(view.getFloat32(i, true));
  }

  return numbers;
}

describe("response.json", () => {
  it("trả về content-type application/json", async () => {
    const resp = json({ ok: true });
    expect(resp.headers.get("content-type")).toContain("application/json");
    const body = await resp.text();
    expect(JSON.parse(body)).toEqual({ ok: true });
  });
});

describe("mcp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tools/call api echoes query and method", async () => {
    const env = { GREETING: "Xin chao" } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "api-1",
      method: "tools/call",
      params: {
        name: "api",
        arguments: { method: "POST", query: { q: "test" } },
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const body = JSON.parse(payload.result.content[0].text) as {
      ok: boolean;
      query: Record<string, string>;
      method: string;
      greeting: string;
    };
    expect(body.ok).toBe(true);
    expect(body.method).toBe("POST");
    expect(body.query.q).toBe("test");
    expect(body.greeting).toBe("Xin chao");
  });

  it("tools/call ping returns pong message", async () => {
    const env = { GREETING: "Xin chao" } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "ping-1",
      method: "tools/call",
      params: {
        name: "ping",
        arguments: {},
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    expect(payload.result.content[0].text).toContain("Ping successful!");
  });

  it("tools/call set-kv stores values", async () => {
    const { kv, store } = createMockKv();
    const env = { GREETING: "Xin chao", KV: kv } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "set-kv-1",
      method: "tools/call",
      params: {
        name: "set-kv",
        arguments: { key: "alpha", value: "one" },
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const body = JSON.parse(payload.result.content[0].text) as {
      ok: boolean;
      key: string;
    };
    expect(body.ok).toBe(true);
    expect(body.key).toBe("alpha");
    expect(store.get("alpha")).toBe("one");
  });

  it("tools/call get-kv returns stored values", async () => {
    const { kv } = createMockKv();
    await kv.put("beta", "two");
    const env = { GREETING: "Xin chao", KV: kv } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "get-kv-1",
      method: "tools/call",
      params: {
        name: "get-kv",
        arguments: { key: "beta" },
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const body = JSON.parse(payload.result.content[0].text) as {
      key: string;
      value: string | null;
    };
    expect(body.key).toBe("beta");
    expect(body.value).toBe("two");
  });

  it("tools/list returns tool definitions", async () => {
    const env = { GREETING: "Xin chao" } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { tools: Array<unknown> };
    };
    expect(payload.result.tools).toBeDefined();
    expect(payload.result.tools.length).toBeGreaterThan(0);
  });

  it("tools/call hello returns content", async () => {
    const env = { GREETING: "Xin chao" } as never;
    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "hello-1",
      method: "tools/call",
      params: {
        name: "hello",
        arguments: { name: "Kilo" },
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    expect(payload.result.content[0].type).toBe("text");
    expect(payload.result.content[0].text).toContain("Kilo");
  });

  it("tools/call http-request performs outbound request", async () => {
    const env = { GREETING: "Xin chao" } as never;
    const fetchMock = vi.fn(async () => {
      return new Response("ok", {
        status: 200,
        headers: { "x-test": "1" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = buildMcpRequest({
      jsonrpc: "2.0",
      id: "http-1",
      method: "tools/call",
      params: {
        name: "http-request",
        arguments: {
          url: "https://example.test/echo",
          method: "POST",
          headers: { "x-req": "1" },
          query: { q: "v" },
          body: "hello",
        },
      },
    });

    const response = await handleMcp(request, env);
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = (await response.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    const body = JSON.parse(payload.result.content[0].text) as {
      request: { url: string; method: string };
      response: {
        status: number;
        ok: boolean;
        headers: Record<string, string>;
        body: string;
      };
    };
    expect(body.request.method).toBe("POST");
    expect(body.request.url).toContain("q=v");
    expect(body.response.status).toBe(200);
    expect(body.response.ok).toBe(true);
    expect(body.response.headers["x-test"]).toBe("1");
    expect(body.response.body).toBe("ok");
  });
});

describe("request route", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST /request performs outbound request", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response("pong", {
        status: 201,
        headers: { "content-type": "text/plain" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("https://example.test/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: "https://example.test/ping",
        method: "GET",
      }),
    });

    const response = await handleRequest(request, {} as never);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      request: { url: string; method: string };
      response: {
        status: number;
        ok: boolean;
        headers: Record<string, string>;
        body: string;
      };
    };
    expect(body.request.method).toBe("GET");
    expect(body.response.status).toBe(201);
    expect(body.response.body).toBe("pong");
  });

  it("POST /request rejects invalid payload", async () => {
    const request = new Request("https://example.test/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(null),
    });

    const response = await handleRequest(request, {} as never);
    expect(response.status).toBe(400);
  });
});

describe("openai-compatible embeddings route", () => {
  it("POST /v1/embeddings returns OpenAI shape", async () => {
    const aiRunMock = vi.fn(async () => ({
      shape: [1, 3],
      data: [[0.11, 0.22, 0.33]],
    }));

    const request = new Request("https://example.test/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "xin chao",
      }),
    });

    const response = await handleOpenAI(
      request,
      { GREETING: "Xin chao", AI: { run: aiRunMock } } as never
    );

    expect(response.status).toBe(200);
    expect(aiRunMock).toHaveBeenCalledWith("@cf/google/embeddinggemma-300m", {
      text: "xin chao",
    });

    const payload = (await response.json()) as {
      object: string;
      model: string;
      data: Array<{ object: string; index: number; embedding: number[] }>;
    };

    expect(payload.object).toBe("list");
    expect(payload.model).toBe("text-embedding-3-small");
    expect(payload.data[0].object).toBe("embedding");
    expect(payload.data[0].index).toBe(0);
    expect(payload.data[0].embedding).toEqual([0.11, 0.22, 0.33]);
  });

  it("POST /v1/embeddings supports encoding_format=base64", async () => {
    const aiRunMock = vi.fn(async () => ({
      shape: [1, 3],
      data: [[0.25, -1.5, 3.75]],
    }));

    const request = new Request("https://example.test/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "xin chao",
        encoding_format: "base64",
      }),
    });

    const response = await handleOpenAI(
      request,
      { GREETING: "Xin chao", AI: { run: aiRunMock } } as never
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: Array<{ embedding: string }>;
    };

    expect(typeof payload.data[0].embedding).toBe("string");
    const decoded = decodeEmbeddingBase64ToFloat32(payload.data[0].embedding);
    expect(decoded.length).toBe(3);
    expect(decoded[0]).toBeCloseTo(0.25, 5);
    expect(decoded[1]).toBeCloseTo(-1.5, 5);
    expect(decoded[2]).toBeCloseTo(3.75, 5);
  });

  it("rejects unsupported encoding_format", async () => {
    const request = new Request("https://example.test/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "xin chao",
        encoding_format: "int8",
      }),
    });

    const response = await handleOpenAI(
      request,
      {
        GREETING: "Xin chao",
        AI: {
          run: async () => ({ shape: [1, 1], data: [[1]] }),
        },
      } as never
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as {
      error: { param: string; message: string };
    };
    expect(payload.error.param).toBe("encoding_format");
    expect(payload.error.message).toContain("float");
    expect(payload.error.message).toContain("base64");
  });

  it("rejects missing API key when OPENAI_API_KEY is set", async () => {
    const request = new Request("https://example.test/v1/embeddings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: "xin chao",
      }),
    });

    const response = await handleOpenAI(
      request,
      {
        GREETING: "Xin chao",
        OPENAI_API_KEY: "secret-key",
        AI: {
          run: async () => ({ shape: [1, 1], data: [[1]] }),
        },
      } as never
    );

    expect(response.status).toBe(401);
    const payload = (await response.json()) as {
      error: { message: string; code: string };
    };
    expect(payload.error.code).toBe("invalid_api_key");
  });
});
