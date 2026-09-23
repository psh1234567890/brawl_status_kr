import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrawlifyBrawlers } from "./brawlify";

describe("Brawl catalog API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  it("starts the mirror when the primary endpoint is slow", async () => {
    vi.useFakeTimers();
    let resolvePrimary!: (response: Response) => void;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolvePrimary = resolve;
          }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ list: [{ id: 2, name: "Colt" }] }), {
          headers: { "content-type": "application/json" },
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const pending = getBrawlifyBrawlers();
    await vi.advanceTimersByTimeAsync(1_500);

    await expect(pending).resolves.toMatchObject({
      list: [{ id: 2, name: "Colt" }],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://brawlapi-v1.pages.dev/v1/brawlers",
      expect.any(Object),
    );

    resolvePrimary(
      new Response(JSON.stringify({ list: [{ id: 1, name: "Shelly" }] }), {
        status: 200,
      }),
    );
  });
});
