import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  apiRequest,
  clearApiSession,
  fetchCurrentUser,
  formatRelativeArabicDate,
  getApiSession,
  setApiSession,
  type BackendComment,
  type BackendConversation,
  type BackendGroup,
  type BackendLiveStream,
  type BackendMarketplaceItem,
  type BackendMessage,
  type BackendNotification,
  type BackendPost,
  type BackendStory,
  type BackendUser,
} from "./_core/yamenshatApi";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getTemporaryRecoveryPassword, saveTemporaryRecoveryPassword } from "./db";
import { storagePut } from "./storage";

const createUserInput = z.object({
  firstName: z.string().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().min(1, "اسم العائلة مطلوب"),
  dateOfBirth: z.date().optional(),
  contactMethod: z.enum(["phone", "email"]),
  contact: z.string().min(1, "رقم الجوال أو البريد الإلكتروني مطلوب"),
  password: z.string().min(8, "كلمة المرور لازم تكون 8 أحرف على الأقل"),
  verificationCode: z.string().min(4, "رمز التحقق مطلوب"),
});

const loginInput = z.object({
  identifier: z.string().min(1, "البريد الإلكتروني أو رقم الجوال مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

const sendOtpInput = z.object({
  contactMethod: z.enum(["phone", "email"]),
  contact: z.string().min(1, "جهة الاتصال مطلوبة"),
});

const forgotPasswordInput = z.object({
  contactMethod: z.enum(["phone", "email"]),
  contact: z.string().min(1, "جهة الاتصال مطلوبة"),
});

const forgotPasswordVerifyInput = z.object({
  contactMethod: z.enum(["phone", "email"]),
  contact: z.string().min(1, "جهة الاتصال مطلوبة"),
  verificationCode: z.string().min(4, "رمز التحقق مطلوب"),
});

const createPostInput = z.object({
  content: z.string().min(1, "محتوى المنشور مطلوب"),
  postType: z.enum(["text", "image", "video", "document"]).default("text"),
  mediaUrl: z.string().url().optional().nullable(),
});

const createMarketplaceInput = z.object({
  title: z.string().min(1, "اسم المنتج مطلوب"),
  description: z.string().min(1, "وصف المنتج مطلوب"),
  price: z.number().int().nonnegative(),
  currency: z.string().min(1).default("EGP"),
  category: z.string().min(1).default("other"),
  location: z.string().optional().nullable(),
  imageUrls: z.array(z.string().url()).default([]),
});

const reactToPostInput = z.object({
  postId: z.string(),
  reactionType: z.string().default("like"),
  currentlyLiked: z.boolean().default(false),
});

const addCommentInput = z.object({
  postId: z.string(),
  content: z.string().min(1, "اكتب تعليقاً أولاً"),
});

const postCommentsInput = z.object({
  postId: z.string(),
});

const conversationCreateInput = z.object({
  participantIds: z.array(z.string()).min(1, "اختر مشاركاً واحداً على الأقل"),
  name: z.string().optional(),
  isGroupChat: z.boolean().default(false),
});

const listMessagesInput = z.object({
  conversationId: z.string(),
});

const sendMessageInput = z.object({
  conversationId: z.string(),
  content: z.string().min(1, "اكتب الرسالة أولاً"),
  messageType: z.string().default("text"),
  mediaUrl: z.string().url().optional().nullable(),
  replyToMessageId: z.string().optional().nullable(),
});

const storyCreateInput = z.object({
  mediaUrl: z.string().url("حط رابط وسائط صالح"),
  mediaType: z.enum(["image", "video"]).default("image"),
});

const mediaUploadInput = z.object({
  folder: z.string().min(1).default("stories"),
  fileName: z.string().min(1, "اسم الملف مطلوب"),
  contentType: z.string().min(1, "نوع الملف مطلوب"),
  dataBase64: z.string().min(1, "محتوى الملف مطلوب"),
});

const viewStoryInput = z.object({
  storyId: z.string(),
});

const liveStartInput = z.object({
  title: z.string().min(1, "عنوان البث مطلوب"),
  conversationId: z.string().optional().nullable(),
});

const liveEndInput = z.object({
  streamId: z.string(),
});

const markNotificationInput = z.object({
  notificationId: z.string(),
});

const friendInput = z.object({
  friendId: z.string(),
});

const groupMembershipInput = z.object({
  groupId: z.string(),
  joined: z.boolean().default(false),
});

function normalizeIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const looksLikeEmail = trimmed.includes("@");

  if (looksLikeEmail) {
    return {
      loginEmail: trimmed.toLowerCase(),
      contact: trimmed.toLowerCase(),
      contactMethod: "email" as const,
    };
  }

  const normalizedPhone = trimmed.replace(/\D/g, "");
  return {
    loginEmail: `${normalizedPhone}@familyhub.local`,
    contact: normalizedPhone,
    contactMethod: "phone" as const,
  };
}

function normalizeContactValue(contactMethod: "phone" | "email", contact: string) {
  return contactMethod === "email"
    ? contact.trim().toLowerCase()
    : contact.trim().replace(/\D/g, "");
}

function generateTemporaryPassword(contact: string) {
  const seed = contact.replace(/\W/g, "").slice(-4) || "USER";
  const randomChunk = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TEMP-${seed}-${randomChunk}`;
}

function buildSafeBio(user?: BackendUser | null) {
  return user?.bio?.trim() || "عضو في يامن شات";
}

function buildUserDirectory(users: BackendUser[], currentUserId?: string | null) {
  return users
    .filter(user => user.id !== currentUserId)
    .slice(0, 30)
    .map(user => ({
      id: user.id,
      name: user.name,
      bio: buildSafeBio(user),
      email: null,
      phoneNumber: null,
      following: false,
    }));
}

function buildPostCards(
  posts: BackendPost[],
  users: BackendUser[],
  currentUserId?: string | null,
  currentProfile?: { user_id: string; display_name: string; contact?: string | null } | null
) {
  const userMap = new Map(users.map(user => [user.id, user]));

  return posts.map(post => {
    const author = userMap.get(post.user_id);
    const likeCount = Object.values(post.reactions ?? {}).reduce(
      (count, reactionUsers) => count + reactionUsers.length,
      0
    );
    const liked = Boolean(
      currentUserId && Object.values(post.reactions ?? {}).some(reactionUsers => reactionUsers.includes(currentUserId))
    );

    const isCurrentProfileAuthor = currentProfile?.user_id === post.user_id;
    const fallbackAuthor = isCurrentProfileAuthor ? currentProfile.display_name : "مستخدم";
    const fallbackHandle = isCurrentProfileAuthor && currentProfile.contact?.includes("@")
      ? `@${currentProfile.contact.split("@")[0]}`
      : `@${post.user_id.slice(0, 8)}`;

    return {
      id: post.id,
      author: author?.name ?? fallbackAuthor,
      authorId: post.user_id,
      handle: "معلومات التواصل مخفية",
      text: post.content,
      time: formatRelativeArabicDate(post.created_at),
      likes: likeCount,
      comments: post.comments_count ?? 0,
      shares: post.shares_count ?? 0,
      liked,
      category: post.group_id ? "منشور مجموعة" : "من الـ API",
      mediaUrl: post.media_url ?? null,
    };
  });
}

function buildMarketplaceCards(
  items: BackendMarketplaceItem[],
  users: BackendUser[] = [],
  currentUserId?: string | null
) {
  const userMap = new Map(users.map(user => [user.id, user]));

  return items.map(item => {
    const seller = userMap.get(item.seller_id);

    return {
      id: item.id,
      sellerId: item.seller_id,
      sellerName: seller?.name ?? "البائع",
      sellerBio: buildSafeBio(seller),
      canChat: item.seller_id !== currentUserId,
      isMine: item.seller_id === currentUserId,
      name: item.title,
      price: `${item.price} ${item.currency}`,
      store: item.category || "السوق",
      city: item.location || "غير محدد",
      posted: formatRelativeArabicDate(item.created_at),
      description: item.description,
      imageUrls: item.image_urls ?? [],
    };
  });
}

function buildGroupCards(groups: BackendGroup[], joinedIds = new Set<string>()) {
  return groups.slice(0, 12).map(group => ({
    id: group.id,
    name: group.name,
    description: group.description || "مجموعة مجتمعية داخل يامن شات",
    members: `${group.members_count ?? 0} عضو`,
    joined: joinedIds.has(group.id),
  }));
}

function buildNotificationCards(notifications: BackendNotification[]) {
  return notifications.map(item => ({
    id: item.id,
    title: item.title,
    description: item.message,
    type: item.notification_type,
    isRead: item.is_read,
    time: formatRelativeArabicDate(item.created_at),
  }));
}

function buildConversationCards(conversations: BackendConversation[]) {
  return conversations.map((conversation, index) => ({
    id: conversation.id,
    name: conversation.name || `محادثة ${index + 1}`,
    unread: conversation.unread_count,
    isMuted: conversation.is_muted,
    isPinned: conversation.is_pinned,
    time: formatRelativeArabicDate(conversation.last_message_time ?? conversation.created_at),
  }));
}

function buildMessageCards(messages: BackendMessage[], users: BackendUser[], currentUserId?: string | null) {
  const userMap = new Map(users.map(user => [user.id, user.name]));
  return [...messages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(message => ({
      id: message.id,
      text: message.content,
      mine: message.sender_id === currentUserId,
      senderId: message.sender_id,
      senderName: userMap.get(message.sender_id) ?? "مستخدم",
      time: formatRelativeArabicDate(message.created_at),
      messageType: message.message_type,
    }));
}

function buildCommentCards(comments: BackendComment[], users: BackendUser[], currentUserId?: string | null) {
  const userMap = new Map(users.map(user => [user.id, user.name]));
  return [...comments]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      authorId: comment.user_id,
      author: comment.user_name ?? userMap.get(comment.user_id) ?? "مستخدم",
      text: comment.content,
      mine: comment.user_id === currentUserId,
      time: formatRelativeArabicDate(comment.created_at),
    }));
}

function buildStoryCards(stories: BackendStory[], users: BackendUser[]) {
  const userMap = new Map(users.map(user => [user.id, user.name]));
  return stories.map(story => ({
    id: story.id,
    userId: story.user_id,
    creator: userMap.get(story.user_id) ?? "مستخدم",
    title: story.media_type === "video" ? "ستوري فيديو" : "ستوري صورة",
    mediaType: story.media_type,
    mediaUrl: story.media_url,
    views: story.view_count,
    time: formatRelativeArabicDate(story.created_at),
  }));
}

function buildLiveCards(streams: BackendLiveStream[], users: BackendUser[], currentUserId?: string | null) {
  const userMap = new Map(users.map(user => [user.id, user.name]));
  return streams.map(stream => ({
    id: stream.id,
    title: stream.title || "بث مباشر بدون عنوان",
    host: userMap.get(stream.host_id) ?? `المضيف ${stream.host_id.slice(0, 6)}`,
    hostId: stream.host_id,
    viewers: stream.viewer_count,
    status: stream.status,
    startedAt: formatRelativeArabicDate(stream.started_at),
    canEnd: stream.host_id === currentUserId && stream.status !== "ended",
  }));
}

async function requireApiAuth(accessToken: string | null) {
  if (!accessToken) {
    throw new Error("سجّل الدخول أو أنشئ حساب أولاً علشان تستخدم الميزة دي");
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    sendOtp: publicProcedure.input(sendOtpInput).mutation(async ({ input }) => {
      const payload =
        input.contactMethod === "email"
          ? { email: input.contact.trim().toLowerCase() }
          : { phone_number: input.contact.trim().replace(/\D/g, "") };

      return apiRequest<{ success: boolean; message: string }>("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }),
    forgotPasswordSendCode: publicProcedure.input(forgotPasswordInput).mutation(async ({ input }) => {
      const normalizedContact = normalizeContactValue(input.contactMethod, input.contact);
      const payload =
        input.contactMethod === "email"
          ? { email: normalizedContact }
          : { phone_number: normalizedContact };

      await apiRequest<{ success: boolean; message: string }>("/api/auth/send-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const temporaryPassword = generateTemporaryPassword(normalizedContact);
      await saveTemporaryRecoveryPassword({
        contactMethod: input.contactMethod,
        contact: normalizedContact,
        temporaryPassword,
      });

      return {
        success: true,
        message: "تم إرسال رمز التحقق وحفظ كلمة المرور المؤقتة",
      } as const;
    }),
    forgotPasswordVerify: publicProcedure.input(forgotPasswordVerifyInput).mutation(async ({ input }) => {
      if (input.verificationCode.trim().length < 4) {
        throw new Error("رمز التحقق غير صالح");
      }

      const normalizedContact = normalizeContactValue(input.contactMethod, input.contact);
      const temporaryPassword = await getTemporaryRecoveryPassword(input.contactMethod, normalizedContact);

      if (!temporaryPassword) {
        throw new Error("لا توجد كلمة مرور مؤقتة محفوظة لهذا الحساب");
      }

      return {
        success: true,
        temporaryPassword,
      } as const;
    }),
    login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
      const normalized = normalizeIdentifier(input.identifier);

      const tokenResponse = await apiRequest<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: normalized.loginEmail,
          password: input.password,
        }),
      });

      const currentUser = await fetchCurrentUser(tokenResponse.access_token);
      const authResponse = {
        ...tokenResponse,
        user_id: currentUser.id,
        display_name: currentUser.name,
        email: currentUser.email,
        phone_number: currentUser.phone_number ?? null,
        profile: {
          id: `profile_${currentUser.id}`,
          user_id: currentUser.id,
          first_name: currentUser.name.split(" ")[0] ?? currentUser.name,
          last_name: currentUser.name.split(" ").slice(1).join(" ") || currentUser.name.split(" ")[0] || currentUser.name,
          display_name: currentUser.name,
          date_of_birth: null,
          contact_method: normalized.contactMethod,
          contact: normalized.contact,
          created_at: currentUser.created_at,
        },
      };

      setApiSession(ctx.req, ctx.res, authResponse);
      return { success: true, user: currentUser };
    }),
    me: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      if (!session.accessToken) {
        return null;
      }

      try {
        return await fetchCurrentUser(session.accessToken);
      } catch {
        if (!session.profile) {
          return null;
        }

        return {
          id: session.profile.user_id,
          name: session.profile.display_name,
          email:
            session.profile.contact_method === "email"
              ? session.profile.contact
              : `${session.profile.user_id}@familyhub.local`,
          phone_number:
            session.profile.contact_method === "phone" ? session.profile.contact : null,
          bio: null,
          role: "user",
          is_verified: session.profile.contact_method === "phone",
          is_banned: false,
          dark_mode_enabled: false,
          primary_color: "#2196F3",
          created_at: session.profile.created_at,
          updated_at: session.profile.created_at,
          last_login: session.profile.created_at,
          profile_image_url: null,
          cover_image_url: null,
        };
      }
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearApiSession(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),

  users: router({
    create: publicProcedure.input(createUserInput).mutation(async ({ input, ctx }) => {
      const response = await apiRequest<{
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        user_id: string;
        display_name: string;
        email?: string | null;
        phone_number?: string | null;
        profile: {
          id: string;
          user_id: string;
          first_name: string;
          last_name: string;
          display_name: string;
          date_of_birth?: string | null;
          contact_method: "phone" | "email";
          contact: string;
          created_at: string;
        };
      }>("/api/auth/register-profile", {
        method: "POST",
        body: JSON.stringify({
          first_name: input.firstName,
          last_name: input.lastName,
          date_of_birth: input.dateOfBirth?.toISOString(),
          contact_method: input.contactMethod,
          contact: input.contact,
          password: input.password,
          verification_code: input.verificationCode,
        }),
      });

      setApiSession(ctx.req, ctx.res, response);

      return {
        success: true,
        message: "تم إنشاء الحساب بنجاح",
        userId: response.user_id,
        displayName: response.display_name,
        profile: response.profile,
      };
    }),
    directory: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      const users = await apiRequest<BackendUser[]>("/api/users?limit=30", { method: "GET" });
      return buildUserDirectory(users, session.profile?.user_id);
    }),
    friendsList: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const currentUser = await fetchCurrentUser(session.accessToken!);
      const friends = await apiRequest<BackendUser[]>(`/api/users/${currentUser.id}/friends`, { method: "GET" });
      return friends.map(friend => ({
        id: friend.id,
        name: friend.name,
        bio: buildSafeBio(friend),
      }));
    }),
    addFriend: publicProcedure.input(friendInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      await apiRequest<{ success: boolean; message: string }>(`/api/users/friends/${input.friendId}`, {
        method: "POST",
        accessToken: session.accessToken,
      });
      return { success: true };
    }),
    removeFriend: publicProcedure.input(friendInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      await apiRequest<{ success: boolean; message: string }>(`/api/users/friends/${input.friendId}`, {
        method: "DELETE",
        accessToken: session.accessToken,
      });
      return { success: true };
    }),
  }),

  feed: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      const [posts, users] = await Promise.all([
        apiRequest<BackendPost[]>("/api/posts?limit=20", { method: "GET" }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);

      return buildPostCards(posts, users, session.profile?.user_id, session.profile);
    }),
    create: publicProcedure.input(createPostInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);

      const created = await apiRequest<BackendPost>("/api/posts", {
        method: "POST",
        accessToken: session.accessToken,
        body: JSON.stringify({
          content: input.content,
          post_type: input.postType,
          media_url: input.mediaUrl,
        }),
      });

      let currentUser: BackendUser | null = null;
      try {
        currentUser = await fetchCurrentUser(session.accessToken!);
      } catch {
        currentUser = null;
      }

      return buildPostCards(
        [created],
        currentUser ? [currentUser] : [],
        session.profile?.user_id,
        session.profile
      )[0];
    }),
    react: publicProcedure.input(reactToPostInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);

      await apiRequest<{ success: boolean; message: string }>(`/api/posts/${input.postId}/reactions/${input.reactionType}`, {
        method: input.currentlyLiked ? "DELETE" : "POST",
        accessToken: session.accessToken,
      });

      return { success: true };
    }),
    comment: publicProcedure.input(addCommentInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);

      await apiRequest(`/api/posts/${input.postId}/comments`, {
        method: "POST",
        accessToken: session.accessToken,
        body: JSON.stringify({ content: input.content }),
      });

      return { success: true };
    }),
    comments: publicProcedure.input(postCommentsInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      const [comments, users] = await Promise.all([
        apiRequest<BackendComment[]>(`/api/posts/${input.postId}/comments`, { method: "GET" }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);

      return buildCommentCards(comments, users, session.profile?.user_id);
    }),
  }),

  market: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      const [items, users] = await Promise.all([
        apiRequest<BackendMarketplaceItem[]>("/api/marketplace?limit=12", {
          method: "GET",
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildMarketplaceCards(items, users, session.profile?.user_id);
    }),
    create: publicProcedure.input(createMarketplaceInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);

      const [created, users] = await Promise.all([
        apiRequest<BackendMarketplaceItem>("/api/marketplace", {
          method: "POST",
          accessToken: session.accessToken,
          body: JSON.stringify({
            title: input.title,
            description: input.description,
            price: input.price,
            currency: input.currency,
            category: input.category,
            location: input.location,
            image_urls: input.imageUrls,
          }),
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);

      return buildMarketplaceCards([created], users, session.profile?.user_id)[0];
    }),
  }),

  groups: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      const groups = await apiRequest<BackendGroup[]>("/api/groups?limit=12", { method: "GET" });

      if (!session.accessToken) {
        return buildGroupCards(groups);
      }

      const currentUser = await fetchCurrentUser(session.accessToken);
      const joinedGroups = await apiRequest<BackendGroup[]>("/api/sync/all-data/", {
        method: "GET",
        accessToken: session.accessToken,
      }).then((snapshot: any) => (Array.isArray(snapshot.groups) ? snapshot.groups : []));

      return buildGroupCards(
        groups,
        new Set(
          joinedGroups
            .map((group: BackendGroup | Record<string, unknown>) => {
              const groupRecord = group as BackendGroup & { groupId?: string };
              return groupRecord.id || groupRecord.groupId;
            })
            .filter((groupId: string | undefined): groupId is string => Boolean(groupId))
        )
      );
    }),
    toggleMembership: publicProcedure.input(groupMembershipInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);

      await apiRequest<{ success: boolean; message: string }>(`/api/groups/${input.groupId}/${input.joined ? "leave" : "join"}`, {
        method: "POST",
        accessToken: session.accessToken,
      });

      return { success: true };
    }),
  }),

  notifications: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      if (!session.accessToken) {
        return [] as Array<ReturnType<typeof buildNotificationCards>[number]>;
      }

      const notifications = await apiRequest<BackendNotification[]>("/api/notifications?limit=20", {
        method: "GET",
        accessToken: session.accessToken,
      });
      return buildNotificationCards(notifications);
    }),
    markRead: publicProcedure.input(markNotificationInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      await apiRequest(`/api/notifications/${input.notificationId}/read`, {
        method: "PUT",
        accessToken: session.accessToken,
      });
      return { success: true };
    }),
    markAllRead: publicProcedure.mutation(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      await apiRequest("/api/notifications/read-all", {
        method: "PUT",
        accessToken: session.accessToken,
      });
      return { success: true };
    }),
  }),

  chat: router({
    conversations: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const conversations = await apiRequest<BackendConversation[]>("/api/conversations?limit=50", {
        method: "GET",
        accessToken: session.accessToken,
      });
      return buildConversationCards(conversations);
    }),
    createConversation: publicProcedure.input(conversationCreateInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const conversation = await apiRequest<BackendConversation>("/api/conversations", {
        method: "POST",
        accessToken: session.accessToken,
        body: JSON.stringify({
          name: input.name,
          is_group_chat: input.isGroupChat,
          participant_ids: input.participantIds,
        }),
      });
      return buildConversationCards([conversation])[0];
    }),
    messages: publicProcedure.input(listMessagesInput).query(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const [messages, users] = await Promise.all([
        apiRequest<BackendMessage[]>(`/api/conversations/${input.conversationId}/messages?limit=100`, {
          method: "GET",
          accessToken: session.accessToken,
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildMessageCards(messages, users, session.profile?.user_id);
    }),
    sendMessage: publicProcedure.input(sendMessageInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const [message, users] = await Promise.all([
        apiRequest<BackendMessage>(`/api/messages/send?conversation_id=${encodeURIComponent(input.conversationId)}`, {
          method: "POST",
          accessToken: session.accessToken,
          body: JSON.stringify({
            content: input.content,
            message_type: input.messageType,
            media_url: input.mediaUrl,
            reply_to_message_id: input.replyToMessageId,
          }),
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildMessageCards([message], users, session.profile?.user_id)[0];
    }),
  }),

  stories: router({
    list: publicProcedure.query(async () => {
      const [stories, users] = await Promise.all([
        apiRequest<BackendStory[]>("/api/stories?limit=20", { method: "GET" }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildStoryCards(stories, users);
    }),
    create: publicProcedure.input(storyCreateInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const [story, users] = await Promise.all([
        apiRequest<BackendStory>("/api/stories", {
          method: "POST",
          accessToken: session.accessToken,
          body: JSON.stringify({ media_url: input.mediaUrl, media_type: input.mediaType }),
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildStoryCards([story], users)[0];
    }),
    view: publicProcedure.input(viewStoryInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      await apiRequest(`/api/stories/${input.storyId}/view`, {
        method: "PUT",
        accessToken: session.accessToken,
      });
      return { success: true };
    }),
  }),

  media: router({
    upload: publicProcedure.input(mediaUploadInput).mutation(async ({ input }) => {
      const normalizedFolder = input.folder.trim().replace(/^\/+|\/+$/g, "") || "stories";
      const sanitizedFileName = input.fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
      const rawBase64 = input.dataBase64.includes(",")
        ? input.dataBase64.split(",").pop() ?? input.dataBase64
        : input.dataBase64;
      const buffer = Buffer.from(rawBase64, "base64");
      const uploaded = await storagePut(
        `${normalizedFolder}/${Date.now()}-${sanitizedFileName}`,
        buffer,
        input.contentType
      );

      return {
        success: true,
        url: uploaded.url,
        key: uploaded.key,
      };
    }),
  }),

  live: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const session = getApiSession(ctx.req);
      const [streams, users] = await Promise.all([
        apiRequest<BackendLiveStream[]>("/api/live?limit=12", { method: "GET" }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildLiveCards(streams, users, session.profile?.user_id);
    }),
    start: publicProcedure.input(liveStartInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const [stream, users] = await Promise.all([
        apiRequest<BackendLiveStream>("/api/live/start", {
          method: "POST",
          accessToken: session.accessToken,
          body: JSON.stringify({ title: input.title, conversation_id: input.conversationId }),
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildLiveCards([stream], users, session.profile?.user_id)[0];
    }),
    end: publicProcedure.input(liveEndInput).mutation(async ({ input, ctx }) => {
      const session = getApiSession(ctx.req);
      await requireApiAuth(session.accessToken);
      const [stream, users] = await Promise.all([
        apiRequest<BackendLiveStream>(`/api/live/${input.streamId}/end`, {
          method: "POST",
          accessToken: session.accessToken,
        }),
        apiRequest<BackendUser[]>("/api/users?limit=50", { method: "GET" }),
      ]);
      return buildLiveCards([stream], users, session.profile?.user_id)[0];
    }),
  }),
});

export type AppRouter = typeof appRouter;
