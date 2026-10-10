import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { ESLint } from "eslint";
import nextVitals from "eslint-config-next/core-web-vitals";

const require = createRequire(import.meta.url);
const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = pluginRequire("./utils/get-root-dirs.js");
let fixtureRoot;
let pattern;

describe("Next lint directory glob compatibility", () => {
  beforeAll(() => {
    fixtureRoot = mkdtempSync(join(tmpdir(), "brawl-next-lint-"));
    for (const app of ["web", "admin"]) {
      const pages = join(fixtureRoot, "packages", app, "pages");
      mkdirSync(pages, { recursive: true });
      writeFileSync(join(pages, "about.js"), "export default function About() { return null; }");
    }
    writeFileSync(join(fixtureRoot, "packages", "not-a-directory.txt"), "fixture");
    pattern = `${fixtureRoot.replace(/\\/g, "/")}/packages/*`;
  });
  afterAll(() => {
    if (!fixtureRoot) return;
    // Only remove the exact temporary directory created by this test.
    if (dirname(resolve(fixtureRoot)) !== resolve(tmpdir()) || !basename(fixtureRoot).startsWith("brawl-next-lint-")) {
      throw new Error("Refusing unexpected lint fixture cleanup path");
    }
    rmSync(fixtureRoot, { recursive: true, force: true });
  });

  it("preserves default roots and string/array/brace globs, excluding files", () => {
    expect(getRootDirs({ cwd: process.cwd(), settings: {} })).toEqual([process.cwd()]);
    const expected = ["admin", "web"].map((app) => resolve(fixtureRoot, "packages", app));
    for (const rootDir of [pattern, [pattern], pattern.replace("*", "{web,admin}"), pattern.replace(/\//g, "\\")]) {
      expect(getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir } } }).map((dir) => resolve(dir)).sort()).toEqual(expected);
    }
    // A literal root must not expand into all its child directories.
    expect(getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: `${fixtureRoot.replace(/\\/g, "/")}/packages/web` } } }).map((dir) => resolve(dir))).toEqual([expected[1]]);
  });

  it("still rejects HTML navigation to a discovered Next page", async () => {
    const lint = new ESLint({ overrideConfigFile: true, overrideConfig: [
      ...nextVitals, { settings: { next: { rootDir: [pattern] } } },
    ] });
    const [invalid] = await lint.lintText('export default function Page() { return <a href="/about">About</a>; }', {
      filePath: "src/components/LintCompatibilityFixture.jsx",
    });
    expect(invalid.messages).toContainEqual(expect.objectContaining({
      ruleId: "@next/next/no-html-link-for-pages", severity: 2,
    }));
    const [valid] = await lint.lintText('import Link from "next/link"; export default function Page() { return <Link href="/about">About</Link>; }', {
      filePath: "src/components/LintCompatibilityFixture.jsx",
    });
    expect(valid.errorCount).toBe(0);
    expect(valid.messages).toEqual([]);
  });

  it("keeps the other Next rules active", async () => {
    const lint = new ESLint({ overrideConfigFile: true, overrideConfig: nextVitals });
    const [invalid] = await lint.lintText('"use client"; export default async function Client() { return <div />; }', {
      filePath: "src/components/LintCompatibilityFixture.jsx",
    });
    expect(invalid.messages).toContainEqual(expect.objectContaining({ ruleId: "@next/next/no-async-client-component" }));
  });

  it("rejects unsupported future plugin calls instead of silently reducing lint coverage", () => {
    const glob = pluginRequire("fast-glob");
    expect(() => glob.globSync(pattern, { onlyFiles: true })).toThrow("Unsupported Next lint glob operation");
  });
});
