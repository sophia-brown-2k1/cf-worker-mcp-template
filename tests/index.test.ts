
import { describe, it, expect } from "vitest";
import { json } from "../src/utils/response";

describe("response.json", () => {
  it("trả về content-type application/json", async () => {
    const resp = json({ ok: true });
    expect(resp.headers.get("content-type")).toContain("application/json");
    const body = await resp.text();
    expect(JSON.parse(body)).toEqual({ ok: true });
  });
});
