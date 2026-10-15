import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const database = vi.hoisted(() => ({ pool: null as unknown as pg.Pool }));
vi.mock("../db", () => ({ db: { get $client() { return database.pool; } } }));
vi.mock("./communityImageStore", () => ({
  putCommunityImageObject: vi.fn().mockResolvedValue(undefined),
  getCommunityImageObject: vi.fn(async () => new ReadableStream({ start(c) { c.enqueue(new Uint8Array([1])); c.close(); } })),
  deleteCommunityImageObject: vi.fn().mockResolvedValue(undefined),
}));
import { createCommunityComment, createCommunityPost, listCommunityPosts, moderateCommunityContent, readCommunityPost, readCommunityQueue, withdrawCommunityContent } from "./community";
import { cleanupCommunityImages, readCommunityImage, removeCommunityImage, saveCommunityImage } from "./communityImages";
import { deleteCommunityImageObject } from "./communityImageStore";

const configuredUrl = process.env.COMMUNITY_TEST_DATABASE_URL;
describe("community PostgreSQL visibility and deletion", () => {
  (configuredUrl ? it : it.skip)("publishes immediately, preserves moderation privacy and cascades account deletion", async () => {
    const base = new URL(configuredUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || !base.pathname.endsWith("_test")) throw new Error("Community integration requires an isolated loopback test database.");
    const suffix = randomUUID().replace(/-/g, "");
    const name = `community_${suffix}_test`;
    const reader = `community_reader_${suffix}`;
    const admin = new pg.Client({ connectionString: base.toString() });
    const target = new URL(base); target.pathname = "/" + name;
    let created = false;
    let roleCreated = false;
    const closedClients: Promise<void>[] = [];
    try {
      await admin.connect();
      await admin.query(`CREATE DATABASE "${name}"`); created = true;
      const env: NodeJS.ProcessEnv = { ...process.env, ACCOUNT_MIGRATION_DATABASE_URL: target.toString() };
      delete env.VERCEL; delete env.VERCEL_ENV;
      const migration = spawnSync(process.execPath, ["scripts/migrate-accounts.mjs"], { env, encoding: "utf8", windowsHide: true, timeout: 60_000 });
      if (migration.status !== 0) throw new Error("Disposable community migration failed: " + migration.stderr);
      database.pool = new pg.Pool({ connectionString: target.toString(), max: 2 });
      database.pool.on("connect", client => {
        closedClients.push(new Promise<void>(resolve => client.once("end", resolve)));
      });
      const [owner, respondent, moderator] = [randomUUID(), randomUUID(), randomUUID()];
      for (const id of [owner, respondent, moderator]) await database.pool.query("INSERT INTO public.auth_users (id, name, email) VALUES ($1, 'Private test nickname', $2)", [id, id + "@example.invalid"]);

      const photo = await saveCommunityImage(owner, { bytes: Buffer.from([1]), width: 10, height: 10 });
      await expect(readCommunityImage(photo.id)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityImage(photo.id, respondent)).rejects.toMatchObject({ status: 404 });
      expect((await readCommunityImage(photo.id, owner)).byte_size).toBe(1);
      const input = { title: "Synthetic match report", body: "A synthetic test context with fuck in the raw submission.", locale: "en" as const, evidenceUrls: [], imageIds: [photo.id] };
      await expect(createCommunityPost(respondent, input)).rejects.toMatchObject({ code: "IMAGE_EXPIRED" });
      expect((await database.pool.query("SELECT count(*)::int AS n FROM public.community_posts")).rows[0].n).toBe(0);
      const post = await createCommunityPost(owner, input);
      expect(post.status).toBe("published");
      expect((await listCommunityPosts("en", 1)).posts[0].id).toBe(post.id);
      expect((await readCommunityPost(post.id)).post.status).toBe("published");
      expect((await readCommunityImage(photo.id)).width).toBe(10);
      // Older pending submissions keep their visibility and can still be reviewed.
      await database.pool.query("UPDATE public.community_posts SET status = 'pending' WHERE id = $1", [post.id]);
      await expect(createCommunityPost(owner, input)).rejects.toMatchObject({ code: "IMAGE_EXPIRED" });
      await expect(removeCommunityImage(photo.id, owner)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityImage(photo.id)).rejects.toMatchObject({ status: 404 });
      expect((await readCommunityImage(photo.id, moderator, true)).width).toBe(10);
      expect((await listCommunityPosts("en", 1)).posts).toEqual([]);
      await expect(readCommunityPost(post.id)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityPost(post.id, respondent)).rejects.toMatchObject({ status: 404 });
      expect((await readCommunityPost(post.id, owner)).post).toMatchObject({ status: "pending", isOwner: true });
      await moderateCommunityContent(moderator, "post", post.id, 0, "published", "Synthetic evidence reviewed");
      const published = (await readCommunityPost(post.id)).post;
      expect(published).toMatchObject({ status: "published", isOwner: false, filtered: true });
      expect(published.images).toEqual([photo]);
      expect((await readCommunityImage(photo.id)).width).toBe(10);
      expect(published.alias).toMatch(/^Loop-[A-F0-9]{12}$/);
      for (const secret of [owner, "Private test nickname", "@example.invalid", "fuck", "Synthetic evidence reviewed"]) expect(JSON.stringify(published)).not.toContain(secret);

      const correctionPhoto = await saveCommunityImage(respondent, { bytes: Buffer.from([1]), width: 12, height: 12 });
      const comment = await createCommunityComment(respondent, post.id, { kind: "correction", body: "The synthetic clip omits the preceding action.", evidenceUrls: [], imageIds: [correctionPhoto.id] });
      expect(comment.status).toBe("published");
      expect((await readCommunityPost(post.id)).comments[0].id).toBe(comment.id);
      expect((await readCommunityImage(correctionPhoto.id)).width).toBe(12);
      await database.pool.query("UPDATE public.community_comments SET status = 'pending' WHERE id = $1", [comment.id]);
      await expect(readCommunityImage(correctionPhoto.id, owner)).rejects.toMatchObject({ status: 404 });
      expect((await readCommunityPost(post.id)).comments).toEqual([]);
      expect((await readCommunityPost(post.id, owner)).comments).toEqual([]);
      expect((await readCommunityPost(post.id, respondent)).comments[0]).toMatchObject({ status: "pending", isOwner: true, kind: "correction" });
      expect((await readCommunityQueue("pending", 1)).comments[0]).toMatchObject({ id: comment.id, parentBody: input.body, parentStatus: "published", parentEvidenceUrls: input.evidenceUrls });
      await moderateCommunityContent(moderator, "comment", comment.id, 0, "published", "Correction reviewed");
      expect((await readCommunityPost(post.id)).post.commentCount).toBe(1);
      expect((await readCommunityPost(post.id)).comments[0].kind).toBe("correction");
      expect((await readCommunityImage(correctionPhoto.id)).width).toBe(12);
      await expect(withdrawCommunityContent("post", post.id, respondent)).rejects.toMatchObject({ status: 404 });

      await moderateCommunityContent(moderator, "post", post.id, 1, "hidden", "Review reopened");
      await expect(readCommunityImage(photo.id)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityImage(correctionPhoto.id)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityPost(post.id)).rejects.toMatchObject({ status: 404 });
      await expect(createCommunityComment(respondent, post.id, { kind: "opinion", body: "Not public", evidenceUrls: [], imageIds: [] })).rejects.toMatchObject({ status: 404 });
      await expect(moderateCommunityContent(moderator, "comment", comment.id, 1, "published", "Retry")).rejects.toMatchObject({ code: "PARENT_NOT_PUBLISHED" });
      await moderateCommunityContent(moderator, "post", post.id, 2, "published", "Review completed");
      await withdrawCommunityContent("comment", comment.id, respondent);
      await expect(readCommunityImage(correctionPhoto.id)).rejects.toMatchObject({ status: 404 });
      await expect(moderateCommunityContent(moderator, "comment", comment.id, 1, "published", "Stale approval")).rejects.toMatchObject({ code: "REVIEW_CONFLICT" });
      expect((await readCommunityPost(post.id)).comments).toEqual([]);
      await withdrawCommunityContent("post", post.id, owner);
      await expect(readCommunityImage(photo.id)).rejects.toMatchObject({ status: 404 });
      await expect(moderateCommunityContent(moderator, "post", post.id, 3, "published", "Stale approval")).rejects.toMatchObject({ code: "REVIEW_CONFLICT" });

      // Exercise the actual PostgreSQL constraints at both former length boundaries.
      const short = await createCommunityPost(owner, { title: "한", body: "글", locale: "en", evidenceUrls: ["https://youtu.be/abcdefghijk"], imageIds: [] });
      expect((await readCommunityPost(short.id)).post).toMatchObject({ title: "한", body: "글", status: "published" });
      const long = await createCommunityPost(owner, { title: "t".repeat(120), body: "글".repeat(4500), locale: "en", evidenceUrls: ["https://youtu.be/abcdefghijk"], imageIds: [] });
      await createCommunityComment(respondent, long.id, { kind: "opinion", body: "네", evidenceUrls: [], imageIds: [] });
      await createCommunityComment(respondent, long.id, { kind: "correction", body: "c".repeat(2500), evidenceUrls: [], imageIds: [] });
      expect((await readCommunityPost(long.id)).post.body).toHaveLength(4500);
      expect((await readCommunityPost(long.id)).comments).toHaveLength(2);

      const rls = await database.pool.query("SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE 'community_%' AND relkind = 'r'");
      expect(rls.rows).toHaveLength(6);
      expect(rls.rows.every(row => row.relrowsecurity)).toBe(true);
      await admin.query(`CREATE ROLE "${reader}" NOLOGIN`); roleCreated = true;
      const client = await database.pool.connect();
      try {
        await client.query(`GRANT USAGE ON SCHEMA public TO "${reader}"`);
        await client.query(`SET ROLE "${reader}"`);
        await expect(client.query("SELECT * FROM public.community_posts")).rejects.toMatchObject({ code: "42501" });
        await client.query("RESET ROLE");
        await client.query(`GRANT SELECT ON public.community_posts TO "${reader}"`);
        await client.query(`SET ROLE "${reader}"`);
        expect((await client.query("SELECT * FROM public.community_posts")).rows).toEqual([]);
      } finally { await client.query("RESET ROLE"); client.release(); }

      await database.pool.query("DELETE FROM public.auth_users WHERE id = $1", [moderator]);
      expect((await database.pool.query("SELECT actor_id FROM public.community_moderation_log")).rows.every(row => row.actor_id === null)).toBe(true);
      await database.pool.query("DELETE FROM public.auth_users WHERE id = $1", [owner]);
      for (const table of ["community_posts", "community_comments", "community_moderation_log"]) expect((await database.pool.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n).toBe(0);
      expect((await database.pool.query("SELECT user_id FROM public.community_profiles")).rows).toEqual([{ user_id: respondent }]);
      expect((await database.pool.query("SELECT count(*)::int AS n FROM public.community_images")).rows[0].n).toBe(0);
      const draft = await saveCommunityImage(respondent, { bytes: Buffer.from([1]), width: 10, height: 10 });
      await database.pool.query("UPDATE public.community_images SET created_at = now() - interval '25 hours' WHERE id = $1", [draft.id]);
      await expect(readCommunityImage(draft.id, respondent)).rejects.toMatchObject({ status: 404 });
      await database.pool.query("UPDATE public.community_image_objects SET created_at = now() - interval '25 hours'");
      vi.mocked(deleteCommunityImageObject).mockRejectedValueOnce(new Error("Temporary store failure"));
      expect(await cleanupCommunityImages()).toMatchObject({ expired: 1, deleted: 2, retry: 1 });
      expect(await cleanupCommunityImages()).toMatchObject({ deleted: 1, retry: 0 });
      expect((await database.pool.query("SELECT count(*)::int AS n FROM public.community_image_objects")).rows[0].n).toBe(0);
    } finally {
      await database.pool?.end().catch(() => undefined);
      // Pool.end can resolve before its client sockets have finished closing.
      // Do not let DROP DATABASE terminate those connections mid-shutdown.
      await Promise.all(closedClients);
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      if (roleCreated) await admin.query(`DROP ROLE "${reader}"`);
      await admin.end();
    }
  }, 90_000);
});
