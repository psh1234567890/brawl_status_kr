import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchBrawlaceSkinInventory,
  parseBrawlaceSkinMarkdown,
  parseBrawlaceSkinTable,
} from "./brawlaceSkins";
import {
  groupSkinsByBrawler,
  normalizeSkinLookupKey,
} from "../utils/playerSkinInventory";

describe("brawlace skin parser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("extracts owned skin rows from the Brawlace table fragment", () => {
    const html = `
      <div class="table-responsive">
        <table id="skinsTable">
          <tbody>
            <tr>
              <td><img src="/x.png" alt="SQUEAK"> SQUEAK</td>
              <td>POTATO SQUEAK</td>
            </tr>
            <tr>
              <td><img src="/x.png" alt="LARRY &amp; LAWRIE"> LARRY &amp; LAWRIE</td>
              <td>GLITCH L&amp;L</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    expect(parseBrawlaceSkinTable(html)).toEqual([
      {
        brawlerName: "LARRY & LAWRIE",
        name: "GLITCH L&L",
        source: "brawlace",
      },
      {
        brawlerName: "SQUEAK",
        name: "POTATO SQUEAK",
        source: "brawlace",
      },
    ]);
  });

  it("groups brawlers with symbols under stable lookup keys", () => {
    const grouped = groupSkinsByBrawler([
      {
        brawlerName: "LARRY & LAWRIE",
        name: "GLITCH L&L",
        source: "brawlace",
      },
    ]);

    expect(normalizeSkinLookupKey("Larry & Lawrie")).toBe("LARRYANDLAWRIE");
    expect(grouped.LARRYANDLAWRIE).toHaveLength(1);
  });

  it("extracts owned skin rows from the Brawlace reader markdown table", () => {
    const markdown = `
      | BRAWLERS | SKINS |
      | --- | --- |
      | ![Image 1: OTIS](https://brawlace.com/otis.png) OTIS | PHARAOTIS |
      | ![Image 2: LARRY & LAWRIE](https://brawlace.com/ll.png) LARRY &amp; LAWRIE | GLITCH LARRY &amp; LAWRIE |
    `;

    expect(parseBrawlaceSkinMarkdown(markdown)).toEqual([
      {
        brawlerName: "LARRY & LAWRIE",
        name: "GLITCH LARRY & LAWRIE",
        source: "brawlace",
      },
      {
        brawlerName: "OTIS",
        name: "PHARAOTIS",
        source: "brawlace",
      },
    ]);
  });

  it("keeps the Brawlace network lookup disabled by default", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBrawlaceSkinInventory("#2PYLQ")).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not use Jina Reader by default when direct lookup fails", async () => {
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "true");
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("blocked", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBrawlaceSkinInventory("#2PYLQ")).rejects.toMatchObject({
      status: 403,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the opted-in Jina Reader fallback when direct lookup fails", async () => {
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "true");
    vi.stubEnv("BRAWLACE_JINA_READER_ENABLED", "true");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("blocked", { status: 403 }))
      .mockResolvedValueOnce(
        new Response("| BRAWLERS | SKINS |\n| --- | --- |\n| OTIS | PHARAOTIS |", {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchBrawlaceSkinInventory("#2PYLQ")).resolves.toMatchObject({
      tag: "2PYLQ",
      skins: [{ brawlerName: "OTIS", name: "PHARAOTIS", source: "brawlace" }],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://r.jina.ai/https://brawlace.com/players/%232PYLQ/skins",
      expect.any(Object),
    );
  });

  it("sends an optional Jina API key only to the opted-in reader request", async () => {
    vi.stubEnv("BRAWLACE_SKIN_LOOKUP_ENABLED", "true");
    vi.stubEnv("BRAWLACE_JINA_READER_ENABLED", "true");
    vi.stubEnv("JINA_READER_API_KEY", "jina_test_key");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("blocked", { status: 403 }))
      .mockResolvedValueOnce(
        new Response("| BRAWLERS | SKINS |\n| --- | --- |\n| OTIS | PHARAOTIS |", {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchBrawlaceSkinInventory("#2PYLQ");

    const directInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const readerInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(directInit.headers).not.toHaveProperty("authorization");
    expect(readerInit.headers).toMatchObject({ authorization: "Bearer jina_test_key" });
  });
});
