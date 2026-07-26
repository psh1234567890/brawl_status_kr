import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrawlifyBrawlers } from "./brawlify";

describe("Brawl catalog API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the static Brawl API endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ list: [{ id: 1, name: "Shelly" }] }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getBrawlifyBrawlers();

    expect(result.list).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brawlapi.com/v1/brawlers",
      expect.objectContaining({ next: { revalidate: 86_400 } }),
    );
  });

  it("falls back when the primary endpoint returns an error page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("<html>blocked</html>", { status: 403 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [{ id: 1, name: "Shelly" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBrawlifyBrawlers()).resolves.toMatchObject({
      list: [{ id: 1, name: "Shelly" }],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://brawlapi-v1.pages.dev/v1/brawlers",
      expect.any(Object),
    );
  });
});
