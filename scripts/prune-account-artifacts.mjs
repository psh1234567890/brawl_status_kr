import { isExpiredAccountArtifact } from "./account-artifact-retention.mjs";

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GH_TOKEN;
  const target = process.env.ACCOUNT_SNAPSHOT_TARGET;
  if (repository !== "psh1234567890/brawl_status_kr" || !token || !["staging", "production"].includes(target)) {
    throw new Error("Explicit account artifact repository, token and target are required.");
  }
  const apply = process.env.ACCOUNT_ARTIFACT_PRUNE_APPLY === "1";
  const now = Math.floor(Date.now() / 1000);
  const base = "https://api.github.com/repos/" + repository + "/actions/artifacts";
  const expired = [];
  for (let page = 1; ; page++) {
    if (page > 50) throw new Error("Artifact enumeration exceeded the safety bound.");
    const body = await request(base + "?per_page=100&page=" + page, token);
    if (!Array.isArray(body.artifacts)) throw new Error("Invalid GitHub artifact response.");
    expired.push(...body.artifacts.filter((artifact) => isExpiredAccountArtifact(artifact, target, now)));
    if (body.artifacts.length < 100) break;
  }
  if (apply) for (const artifact of expired) await request(base + "/" + artifact.id, token, "DELETE");
  console.log((apply ? "Removed" : "Would remove") + " " + expired.length + " expired encrypted account artifact(s) for " + target + ".");
}

async function request(url, token, method = "GET") {
  const response = await fetch(url, {
    method, redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  });
  if (!response.ok) throw new Error("GitHub account artifact operation failed.");
  return response.status === 204 ? null : await response.json();
}

main().catch(() => {
  console.error("Account artifact retention cleanup failed; private response details are suppressed.");
  process.exitCode = 1;
});
