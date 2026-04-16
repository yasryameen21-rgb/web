import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(cookieHeader?: string): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("web api-first integration", () => {
  it("maps feed and marketplace responses from backend API", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/posts")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "post-1",
              user_id: "user-1",
              content: "أول منشور من الـ API",
              post_type: "text",
              is_hidden: false,
              shares_count: 2,
              reactions: { like: ["user-1"] },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              comments_count: 3,
            },
          ],
        } as Response;
      }

      if (url.includes("/api/users")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "user-1",
              name: "يامن",
              email: "yamen@example.com",
              role: "user",
              is_verified: true,
              is_banned: false,
              dark_mode_enabled: false,
              primary_color: "#2196F3",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as Response;
      }

      if (url.includes("/api/marketplace")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "item-1",
              seller_id: "user-1",
              title: "سماعة",
              description: "سماعة لاسلكية",
              price: 750,
              currency: "EGP",
              category: "electronics",
              status: "available",
              location: "القاهرة",
              image_urls: [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as Response;
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const caller = appRouter.createCaller(createContext());
    const [feed, market] = await Promise.all([caller.feed.list(), caller.market.list()]);

    expect(feed[0]).toMatchObject({
      id: "post-1",
      author: "يامن",
      text: "أول منشور من الـ API",
      likes: 1,
      comments: 3,
    });
    expect(market[0]).toMatchObject({
      id: "item-1",
      name: "سماعة",
      city: "القاهرة",
      price: "750 EGP",
    });
  });

  it("creates a post using stored backend token", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        id: "post-2",
        user_id: "user-2",
        content: "منشور جديد",
        post_type: "text",
        is_hidden: false,
        shares_count: 0,
        reactions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        comments_count: 0,
      }),
    } as Response);

    const cookieHeader = [
      "yamenshat_api_access_token=token-123",
      encodeURIComponent("yamenshat_api_profile") + "=" + encodeURIComponent(JSON.stringify({
        id: "profile-2",
        user_id: "user-2",
        first_name: "يامن",
        last_name: "شات",
        display_name: "يامن شات",
        contact_method: "email",
        contact: "yamen@example.com",
        created_at: new Date().toISOString(),
      })),
    ].join("; ");

    const caller = appRouter.createCaller(createContext(cookieHeader));
    const created = await caller.feed.create({ content: "منشور جديد", postType: "text" });

    expect(created).toMatchObject({
      id: "post-2",
      author: "يامن شات",
      text: "منشور جديد",
      likes: 0,
    });
    expect(global.fetch).toHaveBeenCalled();
  });
});
