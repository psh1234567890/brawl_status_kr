import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const database = vi.hoisted(() => ({ pool: null as unknown as pg.Pool }));
vi.mock("../db", () => ({ db: { get $client() { return database.pool; } } }));
import { createCommunityComment, createCommunityPost, listCommunityPosts, moderateCommunityContent, readCommunityPost, withdrawCommunityContent } from "./community";

const configuredUrl = process.env.COMMUNITY_TEST_DATABASE_URL;
describe("community PostgreSQL visibility and deletion", () => {
  (configuredUrl ? it : it.skip)("keeps review private, prevents stale approvals and cascades account deletion", async () => {
    const base = new URL(configuredUrl!);
    if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) || !base.pathname.endsWith("_test")) throw new Error("Community integration requires an isolated loopback test database.");
    const suffix = randomUUID().replace(/-/g, "");
    const name = `community_${suffix}_test`;
    const reader = `community_reader_${suffix}`;
    const admin = new pg.Client({ connectionString: base.toString() });
    const target = new URL(base); target.pathname = "/" + name;
    let created = false;
    let roleCreated = false;
    try {
      await admin.connect();
      await admin.query(`CREATE DATABASE "${name}"`); created = true;
      const env: NodeJS.ProcessEnv = { ...process.env, ACCOUNT_MIGRATION_DATABASE_URL: target.toString() };
      delete env.VERCEL; delete env.VERCEL_ENV;
      const migration = spawnSync(process.execPath, ["scripts/migrate-accounts.mjs"], { env, encoding: "utf8", windowsHide: true, timeout: 60_000 });
      if (migration.status !== 0) throw new Error("Disposable community migration failed: " + migration.stderr);
      database.pool = new pg.Pool({ connectionString: target.toString(), max: 2 });
      const [owner, respondent, moderator] = [randomUUID(), randomUUID(), randomUUID()];
      for (const id of [owner, respondent, moderator]) await database.pool.query("INSERT INTO public.auth_users (id, name, email) VALUES ($1, 'Private test nickname', $2)", [id, id + "@example.invalid"]);

      const input = { title: "Synthetic match report", body: "A synthetic test context with fuck in the raw submission.", locale: "en" as const, evidenceUrls: ["https://youtu.be/abcdefghijk"] };
      const post = await createCommunityPost(owner, input);
      expect((await listCommunityPosts("en", 1)).posts).toEqual([]);
      await expect(readCommunityPost(post.id)).rejects.toMatchObject({ status: 404 });
      await expect(readCommunityPost(post.id, respondent)).rejects.toMatchObject({ status: 404 });
      expect((await readCommunityPost(post.id, owner)).post).toMatchObject({ status: "pending", isOwner: true });
      await moderateCommunityContent(moderator, "post", post.id, 0, "published", "Synthetic evidence reviewed");
      const published = (await readCommunityPost(post.id)).post;
      expect(published).toMatchObject({ status: "published", isOwner: false, filtered: true });
      expect(published.alias).toMatch(/^Loop-[A-F0-9]{12}$/);
      for (const secret of [owner, "Private test nickname", "@example.invalid", "fuck", "Synthetic evidence reviewed"]) expect(JSON.stringify(published)).not.toContain(secret);

      const comment = await createCommunityComment(respondent, post.id, { kind: "correction", body: "The synthetic clip omits the preceding action.", evidenceUrls: [] });
      expect((await readCommunityPost(post.id)).comments).toEqual([]);
      expect((await readCommunityPost(post.id, owner)).comments).toEqual([]);
      expect((await readCommunityPost(post.id, respondent)).comments[0]).toMatchObject({ status: "pending", isOwner: true, kind: "correction" });
      await moderateCommunityContent(moderator, "comment", comment.id, 0, "published", "Correction reviewed");
      expect((await readCommunityPost(post.id)).post.commentCount).toBe(1);
      expect((await readCommunityPost(post.id)).comments[0].kind).toBe("correction");
      await expect(withdrawCommunityContent("post", post.id, respondent)).rejects.toMatchObject({ status: 404 });

      await moderateCommunityContent(moderator, "post", post.id, 1, "hidden", "Review reopened");
      await expect(readCommunityPost(post.id)).rejects.toMatchObject({ status: 404 });
      await expect(createCommunityComment(respondent, post.id, { kind: "opinion", body: "Not public", evidenceUrls: [] })).rejects.toMatchObject({ status: 404 });
      await expect(moderateCommunityContent(moderator, "comment", comment.id, 1, "published", "Retry")).rejects.toMatchObject({ code: "PARENT_NOT_PUBLISHED" });
      await moderateCommunityContent(moderator, "post", post.id, 2, "published", "Review completed");
      await withdrawCommunityContent("comment", comment.id, respondent);
      await expect(moderateCommunityContent(moderator, "comment", comment.id, 1, "published", "Stale approval")).rejects.toMatchObject({ code: "REVIEW_CONFLICT" });
      expect((await readCommunityPost(post.id)).comments).toEqual([]);
      await withdrawCommunityContent("post", post.id, owner);
      await expect(moderateCommunityContent(moderator, "post", post.id, 3, "published", "Stale approval")).rejects.toMatchObject({ code: "REVIEW_CONFLICT" });

      const rls = await database.pool.query("SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname LIKE 'community_%' AND relkind = 'r'");
      expect(rls.rows).toHaveLength(4);
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
    } finally {
      await database.pool?.end().catch(() => undefined);
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      if (roleCreated) await admin.query(`DROP ROLE "${reader}"`);
      await admin.end();
    }
  }, 90_000);
});
