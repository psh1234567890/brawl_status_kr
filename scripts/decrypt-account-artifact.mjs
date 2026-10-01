import { spawnSync } from "node:child_process";
import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { decryptAccountArtifact } from "./account-artifact.mjs";

async function main() {
  const [source, destination, kind] = process.argv.slice(2);
  if (!source || !destination || !path.isAbsolute(source) || !path.isAbsolute(destination)) {
    throw new Error("Use absolute source/destination paths and a backup/manifest kind.");
  }
  const directory = path.dirname(destination);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const resolved = await realpath(directory);
  const relative = path.relative(await realpath(process.cwd()), resolved);
  if (!relative || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Decrypted account data must stay outside the repository.");
  }
  if (process.platform === "win32") {
    const user = process.env.USERDOMAIN && process.env.USERNAME ? process.env.USERDOMAIN + "\\" + process.env.USERNAME : process.env.USERNAME;
    if (!user) throw new Error("Unable to restrict restore folder permissions.");
    const result = spawnSync("icacls", [resolved, "/inheritance:r", "/grant:r", user + ":(OI)(CI)F"], { encoding: "utf8", windowsHide: true });
    if (result.status !== 0) throw new Error("Unable to restrict restore folder permissions.");
  }
  await decryptAccountArtifact(source, path.join(resolved, path.basename(destination)), process.env.ACCOUNT_BACKUP_ENCRYPTION_KEY, {
    target: process.env.ACCOUNT_SNAPSHOT_TARGET,
    projectRef: process.env.ACCOUNT_SNAPSHOT_PROJECT_REF,
    kind,
  });
  console.log("Account artifact authenticated and decrypted into the private restore folder.");
}

main().catch(() => {
  console.error("Account artifact decryption failed. Verify key, environment, artifact kind and private output path.");
  process.exitCode = 1;
});
