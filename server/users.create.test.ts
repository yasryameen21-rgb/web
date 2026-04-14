import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("users.create", () => {
  it("should create a user with valid input", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      firstName: "محمد",
      lastName: "أحمد",
      dateOfBirth: new Date("1990-01-01"),
      contactMethod: "phone",
      contact: "966501234567",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("message");
  });

  it("should fail with empty firstName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.create({
        firstName: "",
        lastName: "أحمد",
        dateOfBirth: new Date("1990-01-01"),
        contactMethod: "phone",
        contact: "966501234567",
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should fail with empty lastName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.create({
        firstName: "محمد",
        lastName: "",
        dateOfBirth: new Date("1990-01-01"),
        contactMethod: "phone",
        contact: "966501234567",
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should fail with empty contact", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.users.create({
        firstName: "محمد",
        lastName: "أحمد",
        dateOfBirth: new Date("1990-01-01"),
        contactMethod: "phone",
        contact: "",
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should accept email as contact method", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      firstName: "فاطمة",
      lastName: "علي",
      dateOfBirth: new Date("1995-05-15"),
      contactMethod: "email",
      contact: "fatima@example.com",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");
  });

  it("should work without dateOfBirth", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create({
      firstName: "سارة",
      lastName: "محمد",
      contactMethod: "phone",
      contact: "966551234567",
    });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");
  });
});
