import { accountErrorResponse, accountJson, enforceAccountRateLimit } from "../../../../server/accountHttp";
import { getAuthenticatedAccount, readSafeAccount, requireOnboardedAccount } from "../../../../server/account";
import { readDashboardPlayer, readMyRankings } from "../../../../server/accountDashboard";
import { areAccountsEnabled } from "../../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!areAccountsEnabled()) return accountJson({ error: "ACCOUNTS_DISABLED" }, 404);
  try {
    const account = await getAuthenticatedAccount(request);
    await requireOnboardedAccount(account.userId);
    const limited = await enforceAccountRateLimit([
      { scope: "minigame-read-user", subject: account.userId, windowSeconds: 60, maxRequests: 120 },
    ]);
    if (limited) return limited;
    const profile = await readSafeAccount(account.userId);
    // A failing Brawl API should not hide a healthy account's rankings.
    const [player, rankings] = await Promise.all([
      readDashboardPlayer(profile.defaultPlayerTag).catch(() => null),
      readMyRankings(account.userId),
    ]);
    return accountJson({
      defaultPlayerTag: profile.defaultPlayerTag,
      player,
      rankings,
    });
  } catch (error) {
    return accountErrorResponse(error);
  }
}
