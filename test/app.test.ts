import { describe, expect, it } from "bun:test";
import app from "../src";

describe("App test", () => {
  it("Should return 404 Response", async () => {
    const req = new Request("http://localhost/api/404");
    const res = await app.fetch(req);
    expect(res.status).toBe(404);
  });
});
