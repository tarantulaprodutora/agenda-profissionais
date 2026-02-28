import { describe, expect, it } from "vitest";
import { calcDurations } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── calcDurations ────────────────────────────────────────────────────────────

describe("calcDurations", () => {
  it("calculates a fully normal block (10:00–19:00)", () => {
    const result = calcDurations("10:00", "19:00");
    expect(result.durationTotalMin).toBe(540);
    expect(result.durationNormalMin).toBe(540);
    expect(result.durationOvertimeMin).toBe(0);
  });

  it("calculates a fully overtime block in morning window (07:00–10:00)", () => {
    const result = calcDurations("07:00", "10:00");
    expect(result.durationTotalMin).toBe(180);
    expect(result.durationNormalMin).toBe(0);
    expect(result.durationOvertimeMin).toBe(180);
  });

  it("calculates a fully overtime block in evening window (19:00–23:00)", () => {
    const result = calcDurations("19:00", "23:00");
    expect(result.durationTotalMin).toBe(240);
    expect(result.durationNormalMin).toBe(0);
    expect(result.durationOvertimeMin).toBe(240);
  });

  it("splits a block crossing morning overtime and normal hours (08:00–12:00)", () => {
    const result = calcDurations("08:00", "12:00");
    // 08:00–10:00 = 120 min overtime, 10:00–12:00 = 120 min normal
    expect(result.durationTotalMin).toBe(240);
    expect(result.durationNormalMin).toBe(120);
    expect(result.durationOvertimeMin).toBe(120);
  });

  it("splits a block crossing normal and evening overtime (17:00–21:00)", () => {
    const result = calcDurations("17:00", "21:00");
    // 17:00–19:00 = 120 min normal, 19:00–21:00 = 120 min overtime
    expect(result.durationTotalMin).toBe(240);
    expect(result.durationNormalMin).toBe(120);
    expect(result.durationOvertimeMin).toBe(120);
  });

  it("handles a 30-minute block entirely in normal hours", () => {
    const result = calcDurations("14:00", "14:30");
    expect(result.durationTotalMin).toBe(30);
    expect(result.durationNormalMin).toBe(30);
    expect(result.durationOvertimeMin).toBe(0);
  });

  it("handles a full-day block (07:00–23:00)", () => {
    const result = calcDurations("07:00", "23:00");
    // Overtime: 07:00–10:00 (180) + 19:00–23:00 (240) = 420
    // Normal: 10:00–19:00 = 540
    expect(result.durationTotalMin).toBe(960);
    expect(result.durationNormalMin).toBe(540);
    expect(result.durationOvertimeMin).toBe(420);
  });
});

// ─── auth.logout ─────────────────────────────────────────────────────────────

import { COOKIE_NAME } from "../shared/const";

type CookieCall = { name: string; options: Record<string, unknown> };
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ─── blocks.calcDurations procedure ──────────────────────────────────────────

describe("blocks.calcDurations procedure", () => {
  it("returns correct durations via tRPC", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blocks.calcDurations({ startTime: "10:00", endTime: "18:00" });
    expect(result.durationTotalMin).toBe(480);
    expect(result.durationNormalMin).toBe(480);
    expect(result.durationOvertimeMin).toBe(0);
  });

  it("returns overtime for evening block", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.blocks.calcDurations({ startTime: "18:00", endTime: "22:00" });
    expect(result.durationTotalMin).toBe(240);
    expect(result.durationNormalMin).toBe(60); // 18:00–19:00
    expect(result.durationOvertimeMin).toBe(180); // 19:00–22:00
  });
});
