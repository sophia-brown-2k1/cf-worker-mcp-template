
export function isPreflight(request: Request): boolean {
  return request.method === "OPTIONS";
}

export function preflightResponse(): Response {
  return new Response(null, {
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-max-age": "86400",
    },
  });
}
