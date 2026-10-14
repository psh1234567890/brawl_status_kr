import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
import { normalizeCommunityImage, readCommunityImageBody } from "./communityImages";
describe("community photo decoding and privacy", () => {
  it("rotates, bounds dimensions and strips EXIF before storing", async () => {
    const original = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#5842ce" } }).jpeg()
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: "Private test photographer" } } }).toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const normalized = await normalizeCommunityImage(original);
    const meta = await sharp(normalized.bytes).metadata();
    expect(meta).toMatchObject({ format: "webp", width: 800, height: 1600 });
    for (const key of ["exif", "xmp", "iptc", "icc", "orientation"] as const) expect(meta[key]).toBeUndefined();
    expect(normalized.bytes.toString()).not.toContain("Private test photographer");
  });
  it("accepts actual PNG/WebP but rejects disguised SVG, GIF and truncated JPEG", async () => {
    for (const format of ["png", "webp"] as const) {
      const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#ffdc62" } }).toFormat(format).toBuffer();
      expect((await normalizeCommunityImage(input)).width).toBe(2);
    }
    for (const input of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from("GIF89a"), Buffer.from([255, 216, 255, 0])]) {
      await expect(normalizeCommunityImage(input)).rejects.toMatchObject({ status: expect.any(Number) });
    }
  });
  it("bounds claimed and actual bytes, including streamed requests", async () => {
    const body = Buffer.alloc(2 * 1024 * 1024 + 1);
    await expect(readCommunityImageBody(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "image/png" }, body }))).rejects.toMatchObject({ status: 413 });
    await expect(readCommunityImageBody(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "image/jpeg", "Content-Length": String(body.length) }, body: "small" }))).rejects.toMatchObject({ status: 413 });
    await expect(readCommunityImageBody(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "image/svg+xml" }, body: "svg" }))).rejects.toMatchObject({ status: 415 });
  });
});
