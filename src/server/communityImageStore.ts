import { getStore } from "@netlify/blobs";
import { del, get, put } from "@vercel/blob";
import { CommunityError } from "../utils/community";

function getNetlifyImageStore(timeoutMs: number, deadline?: AbortSignal) {
  return getStore({
    name: "community-images",
    consistency: "strong",
    fetch: (input, options) => {
      const timeout = AbortSignal.timeout(timeoutMs);
      const signals = [timeout];
      if (options?.signal) signals.push(options.signal);
      if (deadline) signals.push(deadline);
      const signal = AbortSignal.any(signals);
      return fetch(input, { ...options, signal });
    },
  });
}

/**
 * A Netlify production cutover must not create photos that the existing
 * Vercel rollback deployment cannot read. The optional mirror is explicitly
 * configured and never falls back to an ambient Vercel token.
 */
function rollbackMirrorToken(): string | null {
  const mode = process.env.COMMUNITY_IMAGE_ROLLBACK_MIRROR;
  if (mode && mode !== "vercel") throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
  // Netlify documents SITE_ID as a read-only variable available to Functions.
  // Build-time NETLIFY / CONTEXT from netlify.toml are NOT reliable at runtime.
  // Fail closed for every deployed Netlify site, including Deploy Previews.
  if (!mode && (process.env.SITE_ID || process.env.BRAWLOOP_NETLIFY_PRODUCTION === "1")) {
    throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
  }
  if (!mode) return null;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token?.trim()) throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
  return token;
}

// A disposable filesystem adapter for the existing CI browser suite only.
// Neither a deployed preview nor production can activate this adapter.
function isTestStorage() {
  if (process.env.COMMUNITY_IMAGE_TEST_STORAGE !== "1") return false;
  let database: URL;
  try { database = new URL(process.env.DATABASE_URL ?? ""); } catch { throw new Error("Invalid image test database"); }
  if (process.env.CI !== "1" || process.env.VERCEL || process.env.VERCEL_ENV ||
    process.env.NETLIFY || process.env.SITE_ID ||
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
  if (process.env.COMMUNITY_IMAGE_STORAGE === "netlify") {
    const token = rollbackMirrorToken();
    const { modified } = await getNetlifyImageStore(20_000).set(
      pathname,
      new Uint8Array(bytes).buffer,
      { onlyIfNew: true },
    );
    if (!modified) throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
    if (token) {
      try {
        await put(pathname, bytes, {
          access: "private",
          contentType: "image/webp",
          addRandomSuffix: false,
          abortSignal: AbortSignal.timeout(20_000),
          token,
        });
      } catch {
        // Best effort: the DB object inventory remains for scheduled cleanup.
        await getNetlifyImageStore(15_000).delete(pathname).catch(() => undefined);
        throw new CommunityError(503, "IMAGE_UPLOAD_UNAVAILABLE");
      }
    }
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
  if (process.env.COMMUNITY_IMAGE_STORAGE === "netlify") {
    return getNetlifyImageStore(15_000).get(pathname, { type: "stream" });
  }
  const file = await get(pathname, { access: "private", abortSignal: AbortSignal.timeout(15_000) });
  return file?.statusCode === 200 ? file.stream : null;
}
export async function deleteCommunityImageObject(pathname: string, deadline?: AbortSignal) {
  if (isTestStorage()) {
    const { rm } = await import("node:fs/promises");
    await rm(await testPath(pathname), { force: true });
    return;
  }
  if (process.env.COMMUNITY_IMAGE_STORAGE === "netlify") {
    const token = rollbackMirrorToken();
    await getNetlifyImageStore(15_000, deadline).delete(pathname);
    // Retries are safe after a partial deletion; the inventory is removed only
    // after both stores have acknowledged the cleanup.
    if (token) {
      const timeout = AbortSignal.timeout(15_000);
      await del(pathname, {
        token,
        abortSignal: deadline ? AbortSignal.any([timeout, deadline]) : timeout,
      });
    }
    return;
  }
  const timeout = AbortSignal.timeout(15_000);
  await del(pathname, { abortSignal: deadline ? AbortSignal.any([timeout, deadline]) : timeout });
}
