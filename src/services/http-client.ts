export type HttpRequestInput = {
  url: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: string;
  json?: Record<string, unknown>;
};

export type HttpRequestResult = {
  request: {
    url: string;
    method: string;
  };
  response: {
    status: number;
    ok: boolean;
    headers: Record<string, string>;
    body: string;
  };
};

type ParseResult =
  | { ok: true; value: HttpRequestInput }
  | { ok: false; error: string; status: number };

type PerformResult =
  | { ok: true; data: HttpRequestResult }
  | { ok: false; error: string; status: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringMap(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(value)) {
    if (typeof val === "string") out[key] = val;
  }
  return out;
}

function parseInput(input: Record<string, unknown>): ParseResult {
  const url = typeof input.url === "string" ? input.url.trim() : "";
  if (!url) return { ok: false, error: "Invalid url", status: 400 };

  const methodRaw = typeof input.method === "string" ? input.method.trim() : "";
  const method = methodRaw ? methodRaw.toUpperCase() : "GET";
  const headers = stringMap(input.headers);
  const query = stringMap(input.query);

  const body =
    typeof input.body === "string" && input.body.length > 0
      ? input.body
      : undefined;

  const json = isRecord(input.json)
    ? (input.json as Record<string, unknown>)
    : undefined;

  if (body && json) {
    return { ok: false, error: "Provide either body or json", status: 400 };
  }

  return { ok: true, value: { url, method, headers, query, body, json } };
}

export async function performHttpRequest(
  input: Record<string, unknown>
): Promise<PerformResult> {
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;

  let url: URL;
  try {
    url = new URL(parsed.value.url);
  } catch {
    return { ok: false, error: "Invalid url", status: 400 };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      error: "Only http/https URLs are supported",
      status: 400,
    };
  }

  for (const [key, value] of Object.entries(parsed.value.query)) {
    url.searchParams.set(key, value);
  }

  const headers = new Headers(parsed.value.headers);
  let body: string | undefined;

  if (parsed.value.json) {
    body = JSON.stringify(parsed.value.json);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }
  } else if (parsed.value.body) {
    body = parsed.value.body;
  }

  if (parsed.value.method === "GET" || parsed.value.method === "HEAD") {
    body = undefined;
  }

  const response = await fetch(url.toString(), {
    method: parsed.value.method,
    headers,
    body,
  });

  const responseBody = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    ok: true,
    data: {
      request: { url: url.toString(), method: parsed.value.method },
      response: {
        status: response.status,
        ok: response.ok,
        headers: responseHeaders,
        body: responseBody,
      },
    },
  };
}
