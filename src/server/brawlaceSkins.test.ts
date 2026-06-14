import { describe, expect, it } from "vitest";
import {
  groupSkinsByBrawler,
  normalizeLookupKey,
  parseBrawlaceSkinMarkdown,
  parseBrawlaceSkinTable,
} from "./brawlaceSkins";

describe("brawlace skin parser", () => {
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

    expect(normalizeLookupKey("Larry & Lawrie")).toBe("LARRYANDLAWRIE");
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
});
