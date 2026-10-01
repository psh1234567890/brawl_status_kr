import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, open, rename, rm, stat, writeFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

const MAGIC = Buffer.from("BSKR-AES256GCM-v1\n");

function readKey(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error("ACCOUNT_BACKUP_ENCRYPTION_KEY must be a 32-byte hex key.");
  }
  return Buffer.from(value, "hex");
}

function contextText(context) {
  if (!context || !["backup", "manifest"].includes(context.kind) ||
      !["staging", "production", "test"].includes(context.target) ||
      !/^[a-z0-9-]{1,64}$/.test(context.projectRef)) {
    throw new Error("Invalid account artifact context.");
  }
  return JSON.stringify({ kind: context.kind, target: context.target, projectRef: context.projectRef });
}

export async function encryptAccountArtifact(source, destination, secret, context) {
  const key = readKey(secret);
  const metadata = Buffer.from(contextText(context));
  const length = Buffer.alloc(4);
  length.writeUInt32BE(metadata.length);
  const nonce = randomBytes(12);
  const header = Buffer.concat([MAGIC, length, metadata, nonce]);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(header);
  const partial = destination + "." + randomUUID() + ".partial";
  let reserved = false;
  try {
    await writeFile(partial, header, { flag: "wx", mode: 0o600 });
    await pipeline(createReadStream(source), cipher, createWriteStream(partial, { flags: "a", mode: 0o600 }));
    await appendFile(partial, cipher.getAuthTag());
    // Unique archive names are required. Never replace an existing backup.
    const handle = await open(destination, "wx", 0o600);
    reserved = true;
    await handle.close();
    await rename(partial, destination);
    reserved = false;
  } catch (error) {
    await rm(partial, { force: true });
    if (reserved) await rm(destination, { force: true });
    throw error;
  }
}

export async function decryptAccountArtifact(source, destination, secret, expectedContext) {
  const key = readKey(secret);
  const expected = contextText(expectedContext);
  const size = (await stat(source)).size;
  const file = await open(source, "r");
  let header;
  let tag;
  try {
    const prefix = Buffer.alloc(MAGIC.length + 4);
    if ((await file.read(prefix, 0, prefix.length, 0)).bytesRead !== prefix.length ||
        !prefix.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Invalid account artifact header.");
    const metadataLength = prefix.readUInt32BE(MAGIC.length);
    if (metadataLength < 1 || metadataLength > 1024 || size < prefix.length + metadataLength + 12 + 16) {
      throw new Error("Invalid account artifact length.");
    }
    header = Buffer.alloc(prefix.length + metadataLength + 12);
    if ((await file.read(header, 0, header.length, 0)).bytesRead !== header.length) throw new Error("Truncated account artifact.");
    const metadata = header.subarray(prefix.length, prefix.length + metadataLength).toString("utf8");
    if (metadata !== expected) throw new Error("Account artifact environment or kind mismatch.");
    tag = Buffer.alloc(16);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(-12));
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  const partial = destination + "." + randomUUID() + ".partial";
  let reserved = false;
  try {
    if (size === header.length + 16) {
      await writeFile(partial, decipher.final(), { flag: "wx", mode: 0o600 });
    } else {
      await pipeline(createReadStream(source, { start: header.length, end: size - 17 }), decipher, createWriteStream(partial, { flags: "wx", mode: 0o600 }));
    }
    const handle = await open(destination, "wx", 0o600);
    reserved = true;
    await handle.close();
    await rename(partial, destination);
    reserved = false;
  } catch (error) {
    await rm(partial, { force: true });
    if (reserved) await rm(destination, { force: true });
    // Do not report ciphertext, credentials or unauthenticated plaintext.
    throw new Error("Account artifact decryption failed.", { cause: error });
  }
}
