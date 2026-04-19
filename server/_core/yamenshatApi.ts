import type { Request, Response } from "express";
import cookie from "cookie";
import { ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

export const API_ACCESS_COOKIE_NAME = "yamenshat_api_access_token";
export const API_REFRESH_COOKIE_NAME = "yamenshat_api_refresh_token";
export const API_PROFILE_COOKIE_NAME = "yamenshat_api_profile";

export type OnboardingProfile = {
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

export type OnboardingAuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  display_name: string;
  email?: string | null;
  phone_number?: string | null;
  profile: OnboardingProfile;
};

export type BackendUser = {
  id: string;
  name: string;
  email: string;
  phone_number?: string | null;
  bio?: string | null;
  role: string;
  is_verified: boolean;
  is_banned: boolean;
  dark_mode_enabled: boolean;
  primary_color: string;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
};

export type BackendPost = {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  media_url?: string | null;
  group_id?: string | null;
  is_hidden: boolean;
  shares_count: number;
  reactions?: Record<string, string[]>;
  link_preview_url?: string | null;
  link_preview_title?: string | null;
  link_preview_description?: string | null;
  link_preview_image?: string | null;
  created_at: string;
  updated_at: string;
  comments_count: number;
};

export type BackendComment = {
  id: string;
  post_id: string;
  user_id: string;
  user_name?: string | null;
  user_profile_image?: string | null;
  content: string;
  reactions?: Record<string, string[]>;
  created_at: string;
  updated_at: string;
};

export type BackendMarketplaceItem = {
  id: string;
  seller_id: string;
  group_id?: string | null;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  status: string;
  location?: string | null;
  image_urls: string[];
  created_at: string;
  updated_at: string;
};

export type BackendGroup = {
  id: string;
  name: string;
  description?: string | null;
  group_type: string;
  admin_id: string;
  group_image_url?: string | null;
  members_count: number;
  created_at: string;
};

export type BackendNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  related_id?: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

export type BackendConversation = {
  id: string;
  name?: string | null;
  is_group_chat: boolean;
  is_muted: boolean;
  is_pinned: boolean;
  unread_count: number;
  created_at: string;
  last_message_time?: string | null;
};

export type BackendMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  media_url?: string | null;
  is_read: boolean;
  is_encrypted: boolean;
  encryption_v: string;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  reactions?: Record<string, unknown>;
};

export type BackendStory = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  view_count: number;
};

export type BackendLiveStream = {
  id: string;
  host_id: string;
  conversation_id?: string | null;
  title?: string | null;
  description?: string | null;
  status: string;
  sdp_offer?: string | null;
  sdp_answer?: string | null;
  viewer_count: number;
  peak_viewer_count: number;
  is_recording_enabled: boolean;
  recording_status?: string | null;
  recording_url?: string | null;
  recording_duration: number;
  recording_size_mb: number;
  thumbnail_url?: string | null;
  started_at: string;
  ended_at?: string | null;
  recording_completed_at?: string | null;
};

export type ApiSession = {
  accessToken: string | null;
  refreshToken: string | null;
  profile: OnboardingProfile | null;
};

export class BackendApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = "BackendApiError";
  }
}

function getApiBaseUrl() {
  const baseUrl =
    process.env.YAMENSHAT_API_BASE_URL ??
    process.env.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000";

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseCookies(req: Request) {
  return cookie.parse(req.headers.cookie ?? "");
}

function decodeProfile(rawValue?: string): OnboardingProfile | null {
  if (!rawValue) return null;

  try {
    return JSON.parse(decodeURIComponent(rawValue)) as OnboardingProfile;
  } catch {
    return null;
  }
}

function encodeProfile(profile: OnboardingProfile) {
  return encodeURIComponent(JSON.stringify(profile));
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;
  const detail = record.detail ?? record.message;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as Record<string, unknown>).msg);
        }
        return JSON.stringify(item);
      })
      .join("، ");
  }

  return fallback;
}

export function getApiSession(req: Request): ApiSession {
  const parsed = parseCookies(req);
  return {
    accessToken: parsed[API_ACCESS_COOKIE_NAME] ?? null,
    refreshToken: parsed[API_REFRESH_COOKIE_NAME] ?? null,
    profile: decodeProfile(parsed[API_PROFILE_COOKIE_NAME]),
  };
}

export function setApiSession(req: Request, res: Response, auth: OnboardingAuthResponse) {
  const options = getSessionCookieOptions(req);

  res.cookie(API_ACCESS_COOKIE_NAME, auth.access_token, {
    ...options,
    maxAge: Math.max(auth.expires_in * 1000, ONE_YEAR_MS),
  });
  res.cookie(API_REFRESH_COOKIE_NAME, auth.refresh_token, {
    ...options,
    maxAge: ONE_YEAR_MS,
  });
  res.cookie(API_PROFILE_COOKIE_NAME, encodeProfile(auth.profile), {
    ...options,
    maxAge: ONE_YEAR_MS,
  });
}

export function clearApiSession(req: Request, res: Response) {
  const options = getSessionCookieOptions(req);
  for (const cookieName of [
    API_ACCESS_COOKIE_NAME,
    API_REFRESH_COOKIE_NAME,
    API_PROFILE_COOKIE_NAME,
  ]) {
    res.clearCookie(cookieName, { ...options, maxAge: -1 });
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {}
): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (init.accessToken) {
    headers.set("authorization", `Bearer ${init.accessToken}`);
  }

  const maxAttempts = 2;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => "");

      if (!response.ok) {
        throw new BackendApiError(
          extractErrorMessage(payload, `Backend API request failed with status ${response.status}`),
          response.status,
          payload
        );
      }

      return payload as T;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      const isAbortError = error instanceof Error && error.name === "AbortError";
      const isNetworkError = error instanceof TypeError || isAbortError;

      if (!isNetworkError || attempt === maxAttempts) {
        break;
      }

      await wait(800 * attempt);
    }
  }

  if (lastError instanceof BackendApiError) {
    throw lastError;
  }

  throw new Error("تعذر الاتصال بالخادم حالياً. جرّب مرة تانية بعد ثوانٍ.");
}

export async function fetchCurrentUser(accessToken: string) {
  return apiRequest<BackendUser>("/api/users/me", {
    method: "GET",
    accessToken,
  });
}

export function formatRelativeArabicDate(value?: string | null) {
  if (!value) return "الآن";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "الآن";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return "الآن";
  if (diffMinutes < 60) return `منذ ${diffMinutes} دقيقة`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "أمس";
  return `منذ ${diffDays} يوم`;
}
