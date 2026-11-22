import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const destination = resolve(root, ".netlify/cdn-assets");
const [mode] = process.argv.slice(2);
const fontsOnly = mode === "--fonts-only";
const netlifyBuild = mode === "--netlify-build";

if (process.argv.length > 3 || (mode && !fontsOnly && !netlifyBuild)) {
  throw new Error("Expected --fonts-only, --netlify-build, or no option.");
}
if (netlifyBuild && !process.env.BRAWLOOP_ASSET_ORIGIN?.trim()) process.exit(0);

if (!fontsOnly) {
  const chunks = resolve(root, ".next/static");
  await mkdir(resolve(destination, "_next"), { recursive: true });
  await cp(chunks, resolve(destination, "_next/static"), {
    recursive: true,
    filter: file => !file.endsWith(".map"),
  });
}

// Font URLs in the generated stylesheet resolve relative to its CDN origin.
await mkdir(resolve(destination, "fonts"), { recursive: true });
await cp(resolve(root, "public/fonts/brand"), resolve(destination, "fonts/brand"), { recursive: true });
await writeFile(resolve(destination, "_headers"), `/*
  Access-Control-Allow-Origin: *
  X-Content-Type-Options: nosniff
  X-Robots-Tag: noindex
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/fonts/brand/*
  Cache-Control: public, max-age=86400
`);
