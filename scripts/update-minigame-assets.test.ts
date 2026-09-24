import { describe, expect, it } from "vitest";
import { formatModelManifest, parseModelTree } from "./update-minigame-assets.mjs";

const commitSha = "a".repeat(40);
const blobSha = "b".repeat(40);

describe("Brawlify model manifest generator", () => {
  it("selects exact model PNG paths, validates them, and sorts by ID", () => {
    const assets = parseModelTree({ truncated: false, tree: [
      { path: "brawlers/model/20.png", type: "blob", sha: blobSha },
      { path: "brawlers/model/3.png", type: "blob", sha: blobSha },
      { path: "brawlers/model/3.png", type: "tree", sha: blobSha },
      { path: "brawlers/model/4.webp", type: "blob", sha: blobSha },
    ] }, commitSha);
    expect(assets.map((asset) => asset.brawlerId)).toEqual([3, 20]);
  });

  it("rejects truncated, malformed, duplicate, and empty source trees", () => {
    expect(() => parseModelTree({ truncated: true, tree: [] }, commitSha)).toThrow();
    expect(() => parseModelTree({ truncated: false, tree: [{ path: "brawlers/model/0.png", type: "blob", sha: blobSha }] }, commitSha)).toThrow();
    expect(() => parseModelTree({ truncated: false, tree: [
      { path: "brawlers/model/3.png", type: "blob", sha: blobSha },
      { path: "brawlers/model/3.png", type: "blob", sha: blobSha },
    ] }, commitSha)).toThrow();
    expect(() => parseModelTree({ truncated: false, tree: [] }, commitSha)).toThrow();
  });

  it("formats stable source provenance and validates output entries", () => {
    const content = formatModelManifest(commitSha, [{ brawlerId: 3, path: "brawlers/model/3.png", blobSha }]);
    expect(content).toContain(commitSha);
    expect(content).toContain("npm run minigames:assets:update");
    expect(content).toBe(formatModelManifest(commitSha, [{ brawlerId: 3, path: "brawlers/model/3.png", blobSha }]));
    expect(() => formatModelManifest(commitSha, [{ brawlerId: 3, path: "other.png", blobSha }])).toThrow();
    expect(formatModelManifest(commitSha, [{ brawlerId: 3, path: "brawlers/model/003.png", blobSha }])).toContain('"path": "brawlers/model/003.png"');
  });
});
