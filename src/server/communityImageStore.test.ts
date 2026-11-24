import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityError } from "../utils/community";

const mocks = vi.hoisted(() => ({
  getStore: vi.fn(),
  storeSet: vi.fn(),
  storeGet: vi.fn(),
  storeDelete: vi.fn(),
  vercelPut: vi.fn(),
  vercelGet: vi.fn(),
  vercelDel: vi.fn(),
}));

vi.mock("@netlify/blobs", () => ({ getStore: mocks.getStore }));
vi.mock("@vercel/blob", () => ({
  put: mocks.vercelPut,
  get: mocks.vercelGet,
  del: mocks.vercelDel,
}));

import {
  deleteCommunityImageObject,
  getCommunityImageObject,
  putCommunityImageObject,
} from "./communityImageStore";

const pathname = "community/00000000-0000-4000-8000-000000000001.webp";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.stubEnv("COMMUNITY_IMAGE_TEST_STORAGE", "0");
  vi.stubEnv("COMMUNITY_IMAGE_STORAGE", "netlify");
  vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "");
  vi.stubEnv("BRAWLOOP_NETLIFY_PRODUCTION", "0");
  vi.stubEnv("NEXT_PUBLIC_BRAWLOOP_STAGING", "1");
  vi.stubEnv("COMMUNITY_IMAGE_NETLIFY_ONLY_APPROVED", "0");
  vi.stubEnv("BLOB_STORE_ID", undefined);
  vi.stubEnv("BLOB_READ_WRITE_TOKEN", undefined);
  vi.stubEnv("NETLIFY", undefined);
  vi.stubEnv("CONTEXT", undefined);
  vi.stubEnv("SITE_ID", undefined);
  mocks.getStore.mockReturnValue({
    set: mocks.storeSet,
    get: mocks.storeGet,
    delete: mocks.storeDelete,
  });
  mocks.storeSet.mockResolvedValue({ modified: true });
  mocks.storeDelete.mockResolvedValue(undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("Netlify community image store", () => {
  it("writes only to the Netlify store and prevents overwriting existing objects", async () => {
    const bytes = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x01]);
    await putCommunityImageObject(pathname, bytes);
    expect(mocks.getStore).toHaveBeenCalledWith(expect.objectContaining({
      name: "community-images",
      consistency: "strong",
      fetch: expect.any(Function),
    }));
    expect(mocks.storeSet).toHaveBeenCalledWith(
      pathname,
      expect.any(ArrayBuffer),
      { onlyIfNew: true },
    );
    const stored = mocks.storeSet.mock.calls[0][1] as ArrayBuffer;
    expect(Buffer.from(stored)).toEqual(bytes);
    expect(mocks.vercelPut).not.toHaveBeenCalled();
  });

  it("fails closed when Netlify refuses to replace an existing object", async () => {
    mocks.storeSet.mockResolvedValue({ modified: false });
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
  });

  it("writes both Netlify and rollback Vercel blobs before reporting success", async () => {
    const bytes = Buffer.from([10, 20, 30]);
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "vercel");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "ci-only-vercel-blob-token");
    mocks.vercelPut.mockResolvedValue({ pathname });
    await putCommunityImageObject(pathname, bytes);
    expect(mocks.storeSet).toHaveBeenCalledTimes(1);
    expect(mocks.vercelPut).toHaveBeenCalledWith(pathname, bytes, expect.objectContaining({
      access: "private",
      addRandomSuffix: false,
      token: "ci-only-vercel-blob-token",
      contentType: "image/webp",
    }));
    expect(mocks.storeDelete).not.toHaveBeenCalled();
  });

  it("refuses uploads before touching Netlify when the mirror token is absent", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "vercel");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
    expect(mocks.storeSet).not.toHaveBeenCalled();
    expect(mocks.vercelPut).not.toHaveBeenCalled();
  });

  it("does not leave a successful Netlify upload visible if rollback mirroring fails", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "vercel");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "ci-only-vercel-blob-token");
    mocks.vercelPut.mockRejectedValue(new Error("Synthetic remote token error: never return it"));
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
    expect(mocks.storeDelete).toHaveBeenCalledWith(pathname);
  });

  it("blocks uploads on every deployed Netlify site when rollback mirroring is missing", async () => {
    vi.stubEnv("SITE_ID", "synthetic-netlify-site");
    // Build-only CONTEXT is not necessarily defined in Netlify Functions.
    vi.stubEnv("CONTEXT", undefined);
    vi.stubEnv("NETLIFY", undefined);
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
    expect(mocks.storeSet).not.toHaveBeenCalled();
    vi.stubEnv("SITE_ID", undefined);
    await putCommunityImageObject(pathname, Buffer.from([1]));
    expect(mocks.storeSet).toHaveBeenCalledTimes(1);
    vi.stubEnv("BRAWLOOP_NETLIFY_PRODUCTION", "1");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
  });

  function configureApprovedNetlifyOnly() {
    vi.stubEnv("SITE_ID", "synthetic-netlify-site");
    vi.stubEnv("BRAWLOOP_NETLIFY_PRODUCTION", "1");
    vi.stubEnv("NEXT_PUBLIC_BRAWLOOP_STAGING", "0");
    vi.stubEnv("COMMUNITY_IMAGE_NETLIFY_ONLY_APPROVED", "1");
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "netlify-only");
  }

  it("uses only Netlify for production reads, writes and deletes after explicit cutover", async () => {
    configureApprovedNetlifyOnly();
    mocks.storeGet.mockResolvedValue(null);
    await putCommunityImageObject(pathname, Buffer.from([1]));
    expect(await getCommunityImageObject(pathname)).toBeNull();
    await deleteCommunityImageObject(pathname);
    expect(mocks.storeSet).toHaveBeenCalledTimes(1);
    expect(mocks.storeGet).toHaveBeenCalledTimes(1);
    expect(mocks.storeDelete).toHaveBeenCalledTimes(1);
    expect(mocks.vercelPut).not.toHaveBeenCalled();
    expect(mocks.vercelGet).not.toHaveBeenCalled();
    expect(mocks.vercelDel).not.toHaveBeenCalled();
  });

  it.each([
    ["SITE_ID", ""],
    ["BRAWLOOP_NETLIFY_PRODUCTION", "0"],
    ["NEXT_PUBLIC_BRAWLOOP_STAGING", "1"],
    ["COMMUNITY_IMAGE_NETLIFY_ONLY_APPROVED", "0"],
    ["BLOB_READ_WRITE_TOKEN", "ci-only-stale-token"],
    ["BLOB_STORE_ID", "ci-only-stale-store"],
  ])("refuses standalone mutations with unsafe %s", async (key, value) => {
    configureApprovedNetlifyOnly();
    vi.stubEnv(key, value);
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({ status: 503 });
    await expect(deleteCommunityImageObject(pathname)).rejects.toMatchObject({ status: 503 });
    expect(mocks.storeSet).not.toHaveBeenCalled();
    expect(mocks.storeDelete).not.toHaveBeenCalled();
    expect(mocks.vercelPut).not.toHaveBeenCalled();
    expect(mocks.vercelDel).not.toHaveBeenCalled();
  });

  it("does not fall back to Vercel when deployed Netlify storage is misconfigured", async () => {
    configureApprovedNetlifyOnly();
    vi.stubEnv("COMMUNITY_IMAGE_STORAGE", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "ci-only-stale-token");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({ status: 503 });
    await expect(getCommunityImageObject(pathname)).rejects.toMatchObject({ status: 503 });
    await expect(deleteCommunityImageObject(pathname)).rejects.toMatchObject({ status: 503 });
    expect(mocks.vercelPut).not.toHaveBeenCalled();
    expect(mocks.vercelGet).not.toHaveBeenCalled();
    expect(mocks.vercelDel).not.toHaveBeenCalled();
  });

  it("rejects unknown mirror modes without writing image objects", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "unchecked-service");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
    expect(mocks.storeSet).not.toHaveBeenCalled();
  });

  it("reads existing images and handles missing objects without consulting Vercel", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.close();
      },
    });
    mocks.storeGet.mockResolvedValueOnce(stream).mockResolvedValueOnce(null);
    expect(await getCommunityImageObject(pathname)).toBe(stream);
    expect(await getCommunityImageObject(pathname)).toBeNull();
    expect(mocks.storeGet).toHaveBeenCalledWith(pathname, { type: "stream" });
    expect(mocks.vercelGet).not.toHaveBeenCalled();
  });

  it("deletes only the requested Netlify object", async () => {
    await deleteCommunityImageObject(pathname);
    expect(mocks.storeDelete).toHaveBeenCalledWith(pathname);
    expect(mocks.vercelDel).not.toHaveBeenCalled();
  });

  it("deletes Netlify and mirrored Vercel objects in rollback-safe mode", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "vercel");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "ci-only-vercel-blob-token");
    await deleteCommunityImageObject(pathname);
    expect(mocks.storeDelete).toHaveBeenCalledWith(pathname);
    expect(mocks.vercelDel).toHaveBeenCalledWith(pathname, expect.objectContaining({
      token: "ci-only-vercel-blob-token",
      abortSignal: expect.any(AbortSignal),
    }));
  });

  it("propagates mirror deletion failures so the database inventory can retry", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_ROLLBACK_MIRROR", "vercel");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "ci-only-vercel-blob-token");
    mocks.vercelDel.mockRejectedValue(new Error("Synthetic mirror delete failure"));
    await expect(deleteCommunityImageObject(pathname)).rejects.toThrow("Synthetic mirror delete failure");
    expect(mocks.storeDelete).toHaveBeenCalledWith(pathname);
  });

  it("does not allow the disposable filesystem adapter in Netlify deployments", async () => {
    vi.stubEnv("CI", "1");
    vi.stubEnv("NETLIFY", "true");
    vi.stubEnv("VERCEL", undefined);
    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("COMMUNITY_IMAGE_TEST_STORAGE", "1");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/disposable_test");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toThrow(
      "Image test storage requires an undeployed, isolated CI database",
    );
    expect(mocks.getStore).not.toHaveBeenCalled();
  });

  it("prevents the disposable filesystem adapter on Netlify Functions even without build-only flags", async () => {
    vi.stubEnv("CI", "1");
    vi.stubEnv("SITE_ID", "synthetic-netlify-site");
    vi.stubEnv("COMMUNITY_IMAGE_TEST_STORAGE", "1");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/disposable_test");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toThrow(
      "Image test storage requires an undeployed, isolated CI database",
    );
    expect(mocks.getStore).not.toHaveBeenCalled();
  });

  it("fails closed without Vercel credentials when Netlify storage is not selected", async () => {
    vi.stubEnv("COMMUNITY_IMAGE_STORAGE", "");
    vi.stubEnv("BLOB_STORE_ID", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    await expect(putCommunityImageObject(pathname, Buffer.from([1]))).rejects.toMatchObject({
      status: 503,
      code: "IMAGE_UPLOAD_UNAVAILABLE",
    } satisfies Partial<CommunityError>);
    expect(mocks.getStore).not.toHaveBeenCalled();
    expect(mocks.vercelPut).not.toHaveBeenCalled();
  });
});
