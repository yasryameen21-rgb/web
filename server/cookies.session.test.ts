import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("session cookie options", () => {
  it("uses SameSite=None only for secure requests", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      headers: {},
    } as any);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("falls back to SameSite=Lax on non-secure local requests", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      headers: {},
    } as any);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });
});
