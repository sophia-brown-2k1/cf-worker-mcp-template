
/**
 * Tiện ích trả JSON với CORS mặc định.
 */
export function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function text(body: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers ?? {});
  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(body, { ...init, headers });
}
