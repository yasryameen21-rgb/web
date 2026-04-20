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

describe("social app data coverage", () => {
  it("lets /app bootstrap public sections without auth crashes", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/posts")) {
        return { ok: true, headers: { get: () => "application/json" }, json: async () => [] } as Response;
      }

      if (url.includes("/api/users?limit=50")) {
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

      if (url.includes("/api/users?limit=30")) {
        return { ok: true, headers: { get: () => "application/json" }, json: async () => [] } as Response;
      }

      if (url.includes("/api/marketplace")) {
        return { ok: true, headers: { get: () => "application/json" }, json: async () => [] } as Response;
      }

      if (url.includes("/api/stories")) {
        return { ok: true, headers: { get: () => "application/json" }, json: async () => [] } as Response;
      }

      if (url.includes("/api/live")) {
        return { ok: true, headers: { get: () => "application/json" }, json: async () => [] } as Response;
      }

      throw new Error(`Unexpected URL ${url}`);
    });

    const caller = appRouter.createCaller(createContext());
    const [me, feed, market, stories, live, notifications] = await Promise.all([
      caller.auth.me(),
      caller.feed.list(),
      caller.market.list(),
      caller.stories.list(),
      caller.live.list(),
      caller.notifications.list(),
    ]);

    expect(me).toBeNull();
    expect(feed).toEqual([]);
    expect(market).toEqual([]);
    expect(stories).toEqual([]);
    expect(live).toEqual([]);
    expect(notifications).toEqual([]);
  });

  it("loads notifications and chat data through the same backend session", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/conversations?limit=50")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "conv-1",
              name: "دردشة الأسرة",
              is_group_chat: false,
              is_muted: false,
              is_pinned: true,
              unread_count: 2,
              created_at: new Date().toISOString(),
              last_message_time: new Date().toISOString(),
            },
          ],
        } as Response;
      }

      if (url.includes("/api/conversations/conv-1/messages?limit=100")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "msg-1",
              conversation_id: "conv-1",
              sender_id: "user-1",
              content: "أهلاً",
              message_type: "text",
              is_read: true,
              is_encrypted: false,
              encryption_v: "1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as Response;
      }

      if (url.includes("/api/notifications?limit=20")) {
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => [
            {
              id: "notif-1",
              user_id: "user-1",
              title: "إشعار جديد",
              message: "تم استلام رسالة جديدة",
              notification_type: "chat",
              is_read: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        } as Response;
      }

      if (url.includes("/api/users?limit=50")) {
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

      throw new Error(`Unexpected URL ${url}`);
    });

    const cookieHeader = [
      "yamenshat_api_access_token=token-123",
      `${encodeURIComponent("yamenshat_api_profile")}=${encodeURIComponent(JSON.stringify({
        id: "profile-1",
        user_id: "user-1",
        first_name: "يامن",
        last_name: "شات",
        display_name: "يامن شات",
        contact_method: "email",
        contact: "yamen@example.com",
        created_at: new Date().toISOString(),
      }))}`,
    ].join("; ");

    const caller = appRouter.createCaller(createContext(cookieHeader));
    const [notifications, conversations, messages] = await Promise.all([
      caller.notifications.list(),
      caller.chat.conversations(),
      caller.chat.messages({ conversationId: "conv-1" }),
    ]);

    expect(notifications[0]).toMatchObject({
      id: "notif-1",
      title: "إشعار جديد",
      isRead: false,
      type: "chat",
    });
    expect(conversations[0]).toMatchObject({
      id: "conv-1",
      name: "دردشة الأسرة",
      unread: 2,
    });
    expect(messages[0]).toMatchObject({
      id: "msg-1",
      text: "أهلاً",
      mine: true,
      senderName: "يامن",
    });
  });
});
