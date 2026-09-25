import { describe, expect, it } from "vitest";
import { createKeyedSingleFlight, createRequestSequence } from "./accountConcurrency";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("account request concurrency", () => {
  it("lets account B flush while account A is still in flight", async () => {
    const flights = createKeyedSingleFlight<string, string>();
    const a = deferred<string>();
    const b = deferred<string>();
    const aTask = flights.run("A", () => a.promise);
    const bTask = flights.run("B", () => b.promise);

    b.resolve("B done");
    await expect(bTask).resolves.toBe("B done");
    a.resolve("A done");
    await expect(aTask).resolves.toBe("A done");
  });

  it("deduplicates work only within the same account", async () => {
    const flights = createKeyedSingleFlight<string, string>();
    const a = deferred<string>();
    let starts = 0;
    const firstA = flights.run("A", () => { starts += 1; return a.promise; });
    const secondA = flights.run("A", async () => { starts += 1; return "duplicate"; });
    const b = flights.run("B", async () => { starts += 1; return "B"; });

    await expect(b).resolves.toBe("B");
    expect(starts).toBe(2);
    a.resolve("A");
    await expect(Promise.all([firstA, secondA])).resolves.toEqual(["A", "A"]);
  });

  it("prevents a pre-sign-out account response from replacing the guest snapshot", () => {
    const requests = createRequestSequence();
    const visible: string[] = [];
    const oldAccountRequest = requests.begin();

    requests.invalidate();
    const guestRequest = requests.begin();
    if (requests.isCurrent(guestRequest)) visible.push("guest");
    if (requests.isCurrent(oldAccountRequest)) visible.push("account A");

    expect(visible).toEqual(["guest"]);
  });
});
