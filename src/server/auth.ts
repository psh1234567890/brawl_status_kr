import "server-only";

import { randomInt } from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import type { Locale } from "../i18n/config";
import { db } from "../db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "../db/schema";
import { consumeBetterAuthRateLimit } from "./accountRateLimit";
import {
  hasAccountDeletionManifestSecret,
  parseAccountBackupRetentionPolicy,
  parseAccountEligibilityRules,
  parseAccountEligibilityTexts,
  type AccountBackupRetentionPolicy,
  type AccountEligibilityRules,
} from "./accountPolicy";

export type AccountsMode = "off" | "pilot" | "on";

export type AccountPolicyVersions = {
  terms: string;
  privacy: string;
  eligibility: string;
};

const nicknameAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateDefaultNickname() {
  let suffix = "";
  for (let index = 0; index < 6; index += 1) {
    suffix += nicknameAlphabet[randomInt(nicknameAlphabet.length)];
  }
  return "BS-" + suffix;
}

export function getAccountsMode(): AccountsMode {
  const mode = process.env.ACCOUNTS_MODE;
  if (mode === "pilot" || mode === "on") return mode;
  return "off";
}

export function getAccountPolicyVersions(): AccountPolicyVersions | null {
  const terms = process.env.ACCOUNT_TERMS_VERSION?.trim();
  const privacy = process.env.ACCOUNT_PRIVACY_NOTICE_VERSION?.trim();
  const eligibility = process.env.ACCOUNT_ELIGIBILITY_POLICY_VERSION?.trim();
  if (!terms || !privacy || !eligibility) return null;
  if ([terms, privacy, eligibility].some((value) => !/^[a-zA-Z0-9._-]{1,64}$/.test(value))) {
    return null;
  }
  return { terms, privacy, eligibility };
}

export function getAccountEligibilityPolicyTexts(): Record<Locale, string> | null {
  return parseAccountEligibilityTexts(process.env.ACCOUNT_ELIGIBILITY_POLICY_TEXTS_JSON);
}

export function getAccountEligibilityRules(): AccountEligibilityRules | null {
  return parseAccountEligibilityRules(process.env.ACCOUNT_ELIGIBILITY_RULES_JSON);
}

export function getAccountBackupRetentionPolicy(): AccountBackupRetentionPolicy | null {
  return parseAccountBackupRetentionPolicy();
}

export function getAccountBackupRetentionPolicyVersion() {
  return getAccountBackupRetentionPolicy()?.version ?? null;
}

function areAccountPoliciesReady() {
  return Boolean(
    getAccountPolicyVersions() &&
    getAccountEligibilityPolicyTexts() &&
    getAccountEligibilityRules() &&
    getAccountBackupRetentionPolicy() &&
    hasAccountDeletionManifestSecret(),
  );
}

export function areAccountsEnabled() {
  return getAccountsMode() !== "off" && areAccountPoliciesReady();
}

export function isAccountSyncEnabled() {
  return areAccountsEnabled() && process.env.ACCOUNT_SYNC_ENABLED === "1";
}

export function isAccountDeletionOnlyEnabled() {
  return getAccountsMode() === "off" && process.env.ACCOUNT_DELETION_ONLY === "1";
}

export function isPilotGoogleSubjectAllowed(subject: string) {
  if (getAccountsMode() === "on") return true;
  if (getAccountsMode() !== "pilot") return false;
  const allowlist = (process.env.GOOGLE_PILOT_SUBJECT_ALLOWLIST ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  return allowlist.includes(subject);
}

export function isDeletionGoogleSubjectAllowed(subject: string) {
  const mode = getAccountsMode();
  if (mode === "on") return true;
  const allowlist = (process.env.GOOGLE_PILOT_SUBJECT_ALLOWLIST ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);
  if (mode === "pilot") return allowlist.includes(subject);
  // Emergency deletion-only rollback is for already-existing identities from
  // any rollout stage. Do not let a stale pilot allowlist strand later users.
  return isAccountDeletionOnlyEnabled();
}

function requireAuthConfiguration() {
  const baseURLValue = process.env.BETTER_AUTH_URL?.trim();
  const secret = process.env.BETTER_AUTH_SECRET;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!baseURLValue || !secret || secret.length < 32 || !clientId || !clientSecret) {
    throw new Error("Account authentication is not configured.");
  }

  let baseURL: URL;
  try {
    baseURL = new URL(baseURLValue);
  } catch {
    throw new Error("BETTER_AUTH_URL must be an absolute URL.");
  }
  if (baseURL.pathname !== "/" || baseURL.search || baseURL.hash) {
    throw new Error("BETTER_AUTH_URL must contain only an origin.");
  }
  if (
    baseURL.protocol !== "https:" &&
    !(baseURL.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(baseURL.hostname))
  ) {
    throw new Error("BETTER_AUTH_URL must use HTTPS except on loopback development hosts.");
  }

  const origins = new Set<string>([baseURL.origin]);
  for (const rawOrigin of (process.env.ACCOUNT_TRUSTED_ORIGINS ?? "").split(",")) {
    const value = rawOrigin.trim();
    if (!value) continue;
    if (value.includes("*")) {
      throw new Error("Wildcard OAuth trusted origins are not allowed.");
    }
    let origin: URL;
    try {
      origin = new URL(value);
    } catch {
      throw new Error("ACCOUNT_TRUSTED_ORIGINS contains an invalid origin.");
    }
    if (origin.origin !== value.replace(/\/$/, "") || origin.pathname !== "/" || origin.search || origin.hash) {
      throw new Error("ACCOUNT_TRUSTED_ORIGINS entries must be exact origins.");
    }
    if (
      origin.protocol !== "https:" &&
      !(origin.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))
    ) {
      throw new Error("Trusted origins must use HTTPS except on loopback development hosts.");
    }
    origins.add(origin.origin);
  }

  return { baseURL, secret, clientId, clientSecret, origins: [...origins] };
}

function stripOAuthTokens<T extends Record<string, unknown>>(data: T) {
  return {
    ...data,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
  };
}

function createAuthInstance(deletionOnly = false) {
  const config = requireAuthConfiguration();
  const secureCookies = config.baseURL.protocol === "https:";

  return betterAuth({
    appName: "Brawl Status KR",
    baseURL: config.baseURL.origin,
    secret: config.secret,
    // Keep OAuth codes, state, provider responses, and account data out of logs.
    logger: { disabled: true },
    trustedOrigins: config.origins,
    database: drizzleAdapter(db, {
      provider: "pg",
      transaction: true,
      schema: {
        user: authUsers,
        account: authAccounts,
        session: authSessions,
        verification: authVerifications,
      },
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        scope: ["openid", "email", "profile"],
        includeGrantedScopes: false,
        prompt: "select_account",
        ...(deletionOnly ? { disableSignUp: true } : {}),
        overrideUserInfoOnSignIn: true,
        mapProfileToUser: (profile) => ({
          name: generateDefaultNickname(),
          emailVerified: profile.email_verified === true,
        }),
      },
    },
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    account: {
      updateAccountOnSignIn: false,
      storeStateStrategy: "database",
      storeAccountCookie: false,
      accountLinking: {
        enabled: false,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
      },
    },
    session: {
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 0,
      disableSessionRefresh: true,
      freshAge: 5 * 60,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 120,
      customStorage: { consume: consumeBetterAuthRateLimit },
      customRules: {
        "/sign-in/social": { window: 10 * 60, max: 10 },
        "/callback/google": { window: 10 * 60, max: 30 },
      },
    },
    advanced: {
      database: {
        generateId: "uuid",
        validateSchema: false,
      },
      useSecureCookies: secureCookies,
      disableCSRFCheck: false,
      disableOriginCheck: false,
      defaultCookieAttributes: {
        httpOnly: true,
        secure: secureCookies,
        sameSite: "lax",
        path: "/",
      },
      ipAddress: process.env.VERCEL === "1"
        ? { ipAddressHeaders: ["x-vercel-forwarded-for"] }
        : { disableIpTracking: true },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              name: generateDefaultNickname(),
              image: null,
              emailVerified: user.emailVerified === true,
            },
          }),
        },
        update: {
          before: async (user, context) => {
            if (!context?.path?.includes("/callback/google")) return false;
            if (typeof user.email !== "string" || user.emailVerified !== true) return false;
            const current = await db.$client.query<{
              id: string;
              name: string;
              email: string;
            }>(
              "SELECT id, name, email FROM public.auth_users WHERE id = $1",
              [user.id],
            );
            const existingUser = current.rows[0];
            if (!existingUser) return false;
            const email = user.email.toLowerCase();
            const collision = await db.$client.query(
              "SELECT id FROM public.auth_users WHERE email = $1 AND id <> $2 LIMIT 1",
              [email, existingUser.id],
            );
            // Preserve the existing Google identity/session when a verified
            // email now belongs to another user. Never merge or move accounts.
            if (collision.rowCount) return false;
            return {
              data: {
                name: existingUser.name,
                image: null,
                email,
                emailVerified: true,
              },
            };
          },
        },
      },
      account: {
        create: {
          before: async (account) => {
            if (account.providerId !== "google") return false;
            if (!isPilotGoogleSubjectAllowed(account.accountId)) return false;
            return { data: stripOAuthTokens(account) };
          },
        },
        update: {
          before: async (account) => ({
            data: stripOAuthTokens(account),
          }),
        },
      },
      session: {
        create: {
          before: async (session) => ({
            data: { ...session, ipAddress: null, userAgent: null },
          }),
        },
      },
    },
  });
}

type AuthInstance = ReturnType<typeof createAuthInstance>;
let authInstance: AuthInstance | undefined;
let deletionAuthInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!authInstance) authInstance = createAuthInstance();
  return authInstance;
}

export function getDeletionAuth(): AuthInstance {
  if (!deletionAuthInstance) deletionAuthInstance = createAuthInstance(true);
  return deletionAuthInstance;
}
