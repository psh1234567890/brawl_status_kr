import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const battleLogs = pgTable(
  "battle_logs",
  {
    id: serial("id").primaryKey(),
    playerTag: text("player_tag").notNull(),
    battleTime: text("battle_time").notNull(),
    battleTimestamp: timestamp("battle_timestamp", { withTimezone: true }),
    battleFingerprint: text("battle_fingerprint"),
    playerTeamIndex: integer("player_team_index"),
    metaPerspectiveOnly: boolean("meta_perspective_only").notNull().default(false),
    mode: text("mode").notNull(),
    map: text("map").notNull(),
    brawlerId: integer("brawler_id"),
    brawlerName: text("brawler_name").notNull(),
    result: text("result"),
    rank: integer("rank"),
    trophyChange: integer("trophy_change"),
    battleDetail: text("battle_detail").notNull(),
    battleDetailJson: jsonb("battle_detail_json"),
  },
  (table) => [
    unique("battle_logs_player_time_unique").on(table.playerTag, table.battleTime),
    unique("battle_logs_player_fingerprint_unique").on(
      table.playerTag,
      table.battleFingerprint,
    ),
    index("battle_logs_player_tag_idx").on(table.playerTag),
    index("battle_logs_battle_fingerprint_idx").on(table.battleFingerprint),
    index("battle_logs_battle_detail_json_gin_idx").using("gin", table.battleDetailJson),
    index("battle_logs_map_brawler_idx").on(table.map, table.brawlerName),
    index("battle_logs_battle_timestamp_idx").on(table.battleTimestamp),
    index("battle_logs_meta_perspective_timestamp_idx").on(
      table.metaPerspectiveOnly,
      table.battleTimestamp,
    ),
  ],
);

export const battleTeamParticipants = pgTable(
  "battle_team_participants",
  {
    id: serial("id").primaryKey(),
    battleFingerprint: text("battle_fingerprint").notNull(),
    battleTimestamp: timestamp("battle_timestamp", { withTimezone: true }),
    mode: text("mode").notNull(),
    map: text("map").notNull(),
    teamIndex: integer("team_index").notNull(),
    playerTag: text("player_tag").notNull(),
    brawlerId: integer("brawler_id"),
    brawlerName: text("brawler_name").notNull(),
    result: text("result").notNull(),
  },
  (table) => [
    uniqueIndex("battle_team_participants_battle_team_player_unique").on(
      table.battleFingerprint,
      table.teamIndex,
      table.playerTag,
    ),
    index("battle_team_participants_timestamp_idx").on(table.battleTimestamp),
    index("battle_team_participants_map_timestamp_idx").on(
      table.map,
      table.battleTimestamp,
    ),
    index("battle_team_participants_brawler_timestamp_idx").on(
      table.brawlerName,
      table.battleTimestamp,
    ),
    index("battle_team_participants_fingerprint_idx").on(table.battleFingerprint),
  ],
);

export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    defaultPlayerTag: text("default_player_tag"),
    profileRevision: integer("profile_revision").notNull().default(1),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
      mode: "date",
    }),
    termsVersion: text("terms_version"),
    privacyNoticeVersion: text("privacy_notice_version"),
    eligibilityPolicyVersion: text("eligibility_policy_version"),
  },
  (table) => [
    unique("auth_users_email_unique").on(table.email),
    check(
      "auth_users_name_valid",
      sql.raw(
        "char_length(btrim(name)) BETWEEN 1 AND 32 AND octet_length(name) <= 128 AND name = btrim(name) AND name !~ '[[:cntrl:]]'",
      ),
    ),
    check("auth_users_profile_revision_positive", sql.raw("profile_revision >= 1")),
    check(
      "auth_users_default_player_tag_valid",
      sql.raw(
        "default_player_tag IS NULL OR default_player_tag ~ '^[0289PYLQGRJCUV]{3,15}$'",
      ),
    ),
    check(
      "auth_users_onboarding_policy_versions",
      sql.raw(
        "onboarding_completed_at IS NULL OR (terms_version IS NOT NULL AND privacy_notice_version IS NOT NULL AND eligibility_policy_version IS NOT NULL)",
      ),
    ),
  ],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    providerId: text("provider_id").notNull(),
    accountId: text("account_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "auth_accounts_user_id_auth_users_id_fk",
      columns: [table.userId],
      foreignColumns: [authUsers.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    unique("auth_accounts_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
    unique("auth_accounts_user_provider_unique").on(
      table.userId,
      table.providerId,
    ),
    index("auth_accounts_user_id_idx").on(table.userId),
    check("auth_accounts_google_only", sql.raw("provider_id = 'google'")),
    check(
      "auth_accounts_token_fields_empty",
      sql.raw(
        "access_token IS NULL AND refresh_token IS NULL AND id_token IS NULL AND access_token_expires_at IS NULL AND refresh_token_expires_at IS NULL AND scope IS NULL AND password IS NULL",
      ),
    ),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "auth_sessions_user_id_auth_users_id_fk",
      columns: [table.userId],
      foreignColumns: [authUsers.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    unique("auth_sessions_token_unique").on(table.token),
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
    check("auth_sessions_expiry_after_creation", sql.raw("expires_at > created_at")),
    check(
      "auth_sessions_request_metadata_empty",
      sql.raw("ip_address IS NULL AND user_agent IS NULL"),
    ),
  ],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_verifications_identifier_idx").on(table.identifier),
    index("auth_verifications_expires_at_idx").on(table.expiresAt),
  ],
);

export const minigamePersonalBests = pgTable(
  "minigame_personal_bests",
  {
    userId: uuid("user_id").notNull(),
    gameId: text("game_id").notNull(),
    mode: text("mode").notNull(),
    rulesetVersion: smallint("ruleset_version").notNull().default(1),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    source: text("source").notNull(),
    clientRecordedAt: timestamp("client_recorded_at", {
      withTimezone: true,
      mode: "date",
    }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "minigame_personal_bests_pk",
      columns: [table.userId, table.gameId, table.mode, table.rulesetVersion],
    }),
    foreignKey({
      name: "minigame_personal_bests_user_id_auth_users_id_fk",
      columns: [table.userId],
      foreignColumns: [authUsers.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    check(
      "minigame_personal_bests_slot_valid",
      sql.raw(
        "(game_id = 'brawler-quiz' AND mode IN ('3m', '5m', '10m', 'practice')) OR (game_id = 'silhouette-quiz' AND mode = 'base') OR (game_id = 'map-quiz' AND mode = 'standard') OR (game_id = 'ability-quiz' AND mode IN ('mixed', 'gadget', 'star-power'))",
      ),
    ),
    check(
      "minigame_personal_bests_score_valid",
      sql.raw("score >= 0 AND score <= total AND total BETWEEN 1 AND 10000"),
    ),
    check(
      "minigame_personal_bests_fixed_total",
      sql.raw("game_id = 'brawler-quiz' OR total = 10"),
    ),
    check("minigame_personal_bests_ruleset_positive", sql.raw("ruleset_version > 0")),
    check("minigame_personal_bests_ruleset_v1", sql.raw("ruleset_version = 1")),
    check(
      "minigame_personal_bests_source_valid",
      sql.raw("source IN ('legacy_import', 'client_play')"),
    ),
    check("minigame_personal_bests_revision_positive", sql.raw("revision > 0")),
  ],
);

export const accountSyncReceipts = pgTable(
  "account_sync_receipts",
  {
    userId: uuid("user_id").notNull(),
    operationId: uuid("operation_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "account_sync_receipts_pk",
      columns: [table.userId, table.operationId],
    }),
    foreignKey({
      name: "account_sync_receipts_user_id_auth_users_id_fk",
      columns: [table.userId],
      foreignColumns: [authUsers.id],
    })
      .onDelete("cascade")
      .onUpdate("no action"),
    index("account_sync_receipts_expires_at_idx").on(table.expiresAt),
    check(
      "account_sync_receipts_payload_hash_valid",
      sql.raw("payload_hash ~ '^[0-9a-f]{64}$'"),
    ),
    check("account_sync_receipts_expiry_after_creation", sql.raw("expires_at > created_at")),
  ],
);

export const accountRateLimits = pgTable(
  "account_rate_limits",
  {
    scope: text("scope").notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
    requestCount: integer("request_count").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "account_rate_limits_pk",
      columns: [table.scope, table.subjectHash, table.windowStart],
    }),
    index("account_rate_limits_expires_at_idx").on(table.expiresAt),
    check("account_rate_limits_count_positive", sql.raw("request_count >= 1")),
  ],
);

export const accountDeletionTombstones = pgTable(
  "account_deletion_tombstones",
  {
    userId: uuid("user_id").primaryKey(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [index("account_deletion_tombstones_expires_at_idx").on(table.expiresAt)],
);

export const accountSchemaMigrations = pgTable(
  "account_schema_migrations",
  {
    version: text("version").primaryKey(),
    checksum: text("checksum").notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  () => [
    check("account_schema_migrations_checksum_valid", sql.raw("checksum ~ '^[0-9a-f]{64}$'")),
  ],
);
