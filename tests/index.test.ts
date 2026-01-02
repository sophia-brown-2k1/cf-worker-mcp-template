import { describe, it, expect } from "vitest";
import { json } from "../src/utils/response";
import { handleMcp } from "../src/mcp";

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

describe("response.json", () => {
  it("trả về content-type application/json", async () => {
    const resp = json({ ok: true });
    expect(resp.headers.get("content-type")).toContain("application/json");
    const body = await resp.text();
    expect(JSON.parse(body)).toEqual({ ok: true });
  });
});

describe("mcp", () => {
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
});
