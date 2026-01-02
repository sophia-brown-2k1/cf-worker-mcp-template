
export class Counter {
  state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const storage = this.state.storage;
    if (url.pathname.endsWith("/incr")) {
      const current = (await storage.get<number>("count")) ?? 0;
      const next = current + 1;
      await storage.put("count", next);
      return new Response(String(next), { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    const current = (await storage.get<number>("count")) ?? 0;
    return new Response(String(current), { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}
