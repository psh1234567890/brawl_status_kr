import { afterEach, describe, expect, it, vi } from "vitest";
import {
  logSkinSupplementalOutcome,
  observeServerOperation,
  withApiMonitoring,
} from "./observability";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("withApiMonitoring", () => {
  it("adds timing/request-id headers without logging query parameters", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = withApiMonitoring("api.player", async () => Response.json({ ok: true }), {
      slowMs: 10_000,
    });
    const response = await handler(
      new Request("https://example.test/api/player?tag=SECRET_PLAYER_TAG", {
        headers: { "x-request-id": "req-123" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req-123");
    expect(response.headers.get("server-timing")).toMatch(/^app;dur=\d+(?:\.\d+)?$/);
    expect(log).toHaveBeenCalledOnce();
    const payload = String(log.mock.calls[0]?.[0]);
    expect(payload).toContain('"route":"api.player"');
    expect(payload).not.toContain("SECRET_PLAYER_TAG");
    expect(payload).not.toContain("example.test");
  });

  it("warns for slow requests", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handler = withApiMonitoring("api.meta", async () => Response.json({ ok: true }), {
      slowMs: 0,
    });

    await handler(new Request("https://example.test/api/meta"));
    expect(warn).toHaveBeenCalledOnce();
  });

  it("logs 5xx responses as errors", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiMonitoring(
      "api.meta",
      async () => Response.json({ error: "failed" }, { status: 503 }),
      { slowMs: 10_000 },
    );

    await handler(new Request("https://example.test/api/meta"));
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0]?.[0])).toContain('"status":503');
  });

  it("does not log thrown error messages", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiMonitoring("api.player", async () => {
      throw new Error("secret upstream detail");
    });

    await expect(handler(new Request("https://example.test/api/player"))).rejects.toThrow();
    const payload = String(error.mock.calls[0]?.[0]);
    expect(payload).toContain('"errorName":"Error"');
    expect(payload).not.toContain("secret upstream detail");
  });
});

describe("observeServerOperation", () => {
  it("logs a static operation name without leaking thrown messages", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      observeServerOperation("db.meta.stats", async () => {
        throw new Error("sensitive database detail");
      }),
    ).rejects.toThrow();

    const payload = String(error.mock.calls[0]?.[0]);
    expect(payload).toContain('"operation":"db.meta.stats"');
    expect(payload).toContain('"ok":false');
    expect(payload).not.toContain("sensitive database detail");
  });
});

describe("logSkinSupplementalOutcome", () => {
  it("logs only safe error metadata, never the raw error message", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = Object.assign(new Error("SECRET_PLAYER_TAG upstream detail"), {
      status: 403,
    });

    logSkinSupplementalOutcome("unavailable", {
      durationMs: 12.34,
      error,
    });

    expect(warn).toHaveBeenCalledOnce();
    const payload = String(warn.mock.calls[0]?.[0]);
    expect(payload).toContain('"event":"skin_supplemental"');
    expect(payload).toContain('"outcome":"unavailable"');
    expect(payload).toContain('"errorName":"Error"');
    expect(payload).toContain('"status":403');
    expect(payload).not.toContain("SECRET_PLAYER_TAG");
    expect(payload).not.toContain("upstream detail");
  });
});
