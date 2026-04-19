import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function validCreatePayload(overrides: Partial<{
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  contactMethod: "phone" | "email";
  contact: string;
  password: string;
  verificationCode: string;
}> = {}) {
  return {
    firstName: "محمد",
    lastName: "أحمد",
    dateOfBirth: new Date("1990-01-01"),
    contactMethod: "phone" as const,
    contact: "966501234567",
    password: "Passw0rd!",
    verificationCode: "123456",
    ...overrides,
  };
}

describe("users.create", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "bearer",
        expires_in: 3600,
        user_id: "user-1",
        display_name: "محمد أحمد",
        profile: {
          id: "profile-1",
          user_id: "user-1",
          first_name: "محمد",
          last_name: "أحمد",
          display_name: "محمد أحمد",
          contact_method: "phone",
          contact: "966501234567",
          created_at: new Date().toISOString(),
        },
      }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a user with valid input", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create(validCreatePayload());

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId", "user-1");
    expect(result).toHaveProperty("message");
    expect((ctx.res as unknown as { cookie: ReturnType<typeof vi.fn> }).cookie).toHaveBeenCalled();
  });

  it("should fail with empty firstName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create(validCreatePayload({ firstName: "" }))
    ).rejects.toBeDefined();
  });

  it("should fail with empty lastName", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create(validCreatePayload({ lastName: "" }))
    ).rejects.toBeDefined();
  });

  it("should fail with empty contact", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.create(validCreatePayload({ contact: "" }))
    ).rejects.toBeDefined();
  });

  it("should accept email as contact method", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.users.create(
      validCreatePayload({
        firstName: "فاطمة",
        lastName: "علي",
        dateOfBirth: new Date("1995-05-15"),
        contactMethod: "email",
        contact: "fatima@example.com",
      })
    );

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");
  });

  it("should work without dateOfBirth", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const payload = validCreatePayload({
      firstName: "سارة",
      lastName: "محمد",
      contact: "966551234567",
    });
    delete payload.dateOfBirth;

    const result = await caller.users.create(payload);

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("userId");
  });
});
