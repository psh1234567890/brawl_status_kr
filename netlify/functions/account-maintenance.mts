import { runAccountMaintenance } from "../../src/server/accountMaintenance";
import { canRunNetlifyAccountMaintenance } from "../../src/server/netlifyMaintenanceGate";

export const config = { schedule: "17 4 * * *" };

export default async function scheduledAccountMaintenance() {
  if (!canRunNetlifyAccountMaintenance()) return;

  try {
    const result = await runAccountMaintenance(AbortSignal.timeout(18_000));
    console.info(JSON.stringify({ event: "account_maintenance_finished", ...result }));
  } catch {
    console.error(JSON.stringify({ event: "account_maintenance_failed" }));
    throw new Error("Account maintenance failed");
  }
}
