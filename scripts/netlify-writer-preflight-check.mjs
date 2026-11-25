import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveWriterPreflight, verifyWriterConnection } from "./netlify-writer-preflight.mjs";

const env = {
  NETLIFY: "true", CONTEXT: "production", BRANCH: "main",
  BRAWLOOP_NETLIFY_RELEASE_APPROVED: "1", BRAWLOOP_NETLIFY_PRODUCTION: "1",
  NEXT_PUBLIC_BRAWLOOP_STAGING: "0",
  DATABASE_URL: "postgresql://brawl_netlify_writer.vzsxfanekkaoiwnpscih:fixture@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=verify-full",
  DATABASE_SSL_CA: "-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----",
};
test("requires approved main context and explicit verified TLS configuration", () => {
  const result = resolveWriterPreflight(env);
  assert.equal(result.ssl.rejectUnauthorized, true);
  assert.equal(new URL(result.connectionString).search, "");
  for (const key of ["NETLIFY","CONTEXT","BRANCH","BRAWLOOP_NETLIFY_RELEASE_APPROVED","BRAWLOOP_NETLIFY_PRODUCTION","NEXT_PUBLIC_BRAWLOOP_STAGING","DATABASE_URL","DATABASE_SSL_CA"]) {
    assert.throws(() => resolveWriterPreflight({...env,[key]:undefined}));
  }
  for (const url of [env.DATABASE_URL.replace("brawl_netlify_writer","postgres"),env.DATABASE_URL.replace("verify-full","no-verify"),env.DATABASE_URL+"&ssl=false",env.DATABASE_URL.replace("5432","6543")]) {
    assert.throws(() => resolveWriterPreflight({...env,DATABASE_URL:url}));
  }
});
const good={role:"brawl_netlify_writer",session_role:"brawl_netlify_writer",db:"postgres",read_only:"on",restricted:true,can_read:true,can_truncate:false};
test("read-only identity test and cleanup; rejects wrong identity or insecure TLS", async () => {
  const statements=[];
  const makeClient=(row,authorized=true)=>class {
    connection={stream:{encrypted:true,authorized}};
    async connect(){}
    async query(sql){statements.push(sql);return {rows:[row]};}
    async end(){statements.push("END");}
  };
  await verifyWriterConnection(env,makeClient(good));
  assert.equal(statements[0],"BEGIN READ ONLY");
  assert.deepEqual(statements.slice(-2),["ROLLBACK","END"]);
  await assert.rejects(verifyWriterConnection(env,makeClient({...good,role:"postgres"})));
  assert.deepEqual(statements.slice(-2),["ROLLBACK","END"]);
  await assert.rejects(verifyWriterConnection(env,makeClient(good,false)));
  assert.equal(statements.at(-1),"END");
});
