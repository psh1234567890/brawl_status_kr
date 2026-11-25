import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

export function resolveNetlifyBuildEnvironment(env) {
  const approved = env.BRAWLOOP_NETLIFY_RELEASE_APPROVED === "1";
  const production = env.NETLIFY === "true" && env.CONTEXT === "production" &&
    env.BRANCH === "main" && approved;
  if (approved && !production) {
    throw new Error("Netlify release approval is only valid on the main production build");
  }
  return {
    ...env,
    NEXT_PUBLIC_BRAWLOOP_STAGING: production ? "0" : "1",
    BRAWLOOP_NETLIFY_PRODUCTION: production ? "1" : "0",
    // Non-production builds remain inert even if account settings were inherited.
    ...(production ? {} : {
      ACCOUNTS_MODE: "off",
      ACCOUNT_SYNC_ENABLED: "0",
      ACCOUNT_DELETION_ONLY: "0",
      NETLIFY_ACCOUNT_MAINTENANCE: "0",
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: "",
      NEXT_PUBLIC_ADSENSE_SLOT_ID: "",
    }),
  };
}

function run(command, args, env) {
  const result = spawnSync(command, args, { env, stdio: "inherit", cwd: fileURLToPath(new URL("../", import.meta.url)) });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Netlify build step failed: " + command);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = resolveNetlifyBuildEnvironment(process.env);
  console.log("Netlify build mode: " + (env.BRAWLOOP_NETLIFY_PRODUCTION === "1" ? "approved production" : "protected staging"));
  if (env.BRAWLOOP_NETLIFY_PRODUCTION === "1") {
    run(process.execPath, ["scripts/netlify-writer-preflight.mjs"], env);
  }
  run(process.execPath, ["node_modules/next/dist/bin/next", "build"], env);
  run(process.execPath, ["scripts/prepare-static-cdn.mjs", "--netlify-build"], env);
}
