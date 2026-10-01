export function artifactDeadline(manifest) {
  // Re-exporting a deletion UUID must not restart its retention clock.
  let deadline = Date.parse(manifest.exportedAt) + manifest.deletionManifestRetentionDays * 86_400_000;
  for (const entry of manifest.entries) deadline = Math.min(deadline, Date.parse(entry.expiresAt));
  if (!Number.isFinite(deadline)) throw new Error("Invalid artifact retention deadline.");
  return Math.floor(deadline / 1000);
}

export function isExpiredAccountArtifact(artifact, target, nowSeconds) {
  if (!artifact || !["staging", "production"].includes(target) ||
      !Number.isSafeInteger(artifact.id) || artifact.id < 1 || typeof artifact.name !== "string") return false;
  const match = /^account-(manifest|backup)-(staging|production)-until(\d{10})-\d+-\d+$/.exec(artifact.name);
  return Boolean(match && match[2] === target && Number(match[3]) <= nowSeconds);
}
