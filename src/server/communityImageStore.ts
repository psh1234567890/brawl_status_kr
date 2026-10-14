import "server-only";
import { del, get, put } from "@vercel/blob";
import { CommunityError } from "../utils/community";

// A disposable filesystem adapter for the existing CI browser suite only.
// Neither a deployed preview nor production can activate this adapter.
function isTestStorage() {
  if (process.env.COMMUNITY_IMAGE_TEST_STORAGE !== "1") return false;
  let database: URL;
  try { database = new URL(process.env.DATABASE_URL ?? ""); } catch { throw new Error("Invalid image test database"); }
  if (process.env.CI !== "1" || process.env.VERCEL || process.env.VERCEL_ENV ||
    !["localhost", "127.0.0.1", "[::1]"].includes(database.hostname) || !database.pathname.endsWith("_test")) {
    throw new Error("Image test storage requires an undeployed, isolated CI database");
  }
  return true;
}
async function testPath(pathname: string) {
  if (!/^community\/[0-9a-f-]{36}\.webp$/.test(pathname)) throw new Error("Invalid image object path");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  return join(tmpdir(), "brawloop-community-image-ci", pathname.slice("community/".length));
}
export async function putCommunityImageObject(pathname: string, bytes: Buffer) {
  if (isTestStorage()) {
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { dirname } = await import("node:path");
    const path = await testPath(pathname);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
    return;
  }
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
  await put(pathname, bytes, { access: "private", contentType: "image/webp", addRandomSuffix: false, abortSignal: AbortSignal.timeout(20_000) });
}
export async function getCommunityImageObject(pathname: string): Promise<ReadableStream<Uint8Array> | null> {
  if (isTestStorage()) {
    try {
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(await testPath(pathname));
      return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } });
    } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; }
  }
  const file = await get(pathname, { access: "private", abortSignal: AbortSignal.timeout(15_000) });
  return file?.statusCode === 200 ? file.stream : null;
}
export async function deleteCommunityImageObject(pathname: string) {
  if (isTestStorage()) {
    const { rm } = await import("node:fs/promises");
    await rm(await testPath(pathname), { force: true });
    return;
  }
  await del(pathname, { abortSignal: AbortSignal.timeout(15_000) });
}
