import type { Request, Response } from "express";
import { ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";

type ContactMethod = "phone" | "email";

const ACCESS_TOKEN_COOKIE = "yamenshat_api_access_token";
const REFRESH_TOKEN_COOKIE = "yamenshat_api_refresh_token";
const PROFILE_COOKIE = "yamenshat_api_profile";

function getApiBaseUrl() {
  return (
    process.env.YAMENSHAT_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.OAUTH_SERVER_URL ||
    "https://api.yamenshat.local"
  );
}

function normalizeUrl(pathname: string) {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

function parseCookies(cookieHeader?: string | string[]) {
  const raw = Array.isArray(cookieHeader) ? cookieHeader.join("; ") : cookieHeader || "";
  return raw
    .split(";")
    .map(part => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, pair) => {
      const index = pair.indexOf("=");
      if (index === -1) return acc;
      const key = decodeURIComponent(pair.slice(0, index).trim());
      const value = decodeURIComponent(pair.slice(index + 1).trim());
      acc[key] = value;
      return acc;
    }, {});
}

export type ApiProfile = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  date_of_birth?: string | null;
  contact_method: ContactMethod;
  contact: string;
  created_at: string;
};

export type ApiSessionPayload = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user_id: string;
  display_name: string;
  email?: string | null;
  phone_number?: string | null;
  profile: ApiProfile;
};

export type ApiSession = {
  accessToken: string | null;
  refreshToken: string | null;
  profile: ApiProfile | null;
};

export type BackendUser = {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  bio?: string | null;
  role?: string;
  is_verified?: boolean;
  is_banned?: boolean;
  dark_mode_enabled?: boolean;
  primary_color?: string | null;
  profile_image_url?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
  last_login?: string | null;
};

export type BackendPost = {
  id: string;
  user_id: string;
  content: string;
  post_type?: string;
  group_id?: string | null;
  media_url?: string | null;
  shares_count?: number;
  comments_count?: number;
  reactions?: Record<string, string[]>;
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
};

export type BackendMarketplaceItem = {
  id: string;
  seller_id?: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category?: string | null;
  status?: string | null;
  location?: string | null;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
};

export type BackendGroup = {
  id?: string;
  groupId?: string;
  name: string;
  description?: string | null;
  members_count?: number;
};

export type BackendNotification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
};

export type BackendConversation = {
  id: string;
  name?: string | null;
  unread_count?: number;
  is_muted?: boolean;
  is_pinned?: boolean;
  created_at: string;
  last_message_time?: string | null;
};

export type BackendMessage = {
  id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  media_url?: string | null;
  reply_to_message_id?: string | null;
  created_at: string;
};

export type BackendStory = {
  id: string;
  user_id: string;
  media_type: "image" | "video";
  media_url: string;
  view_count: number;
  created_at: string;
};

export type BackendLiveStream = {
  id: string;
  host_id: string;
  title?: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
};

export type ApiRequestOptions = {
  method?: string;
  body?: BodyInit | null;
  accessToken?: string | null;
  headers?: HeadersInit;
};

export async function apiRequest<T>(pathname: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});

  if (options.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  if (options.accessToken) {
    headers.set("authorization", `Bearer ${options.accessToken}`);
  }

  const response = await fetch(normalizeUrl(pathname), {
    method: options.method ?? "GET",
    headers,
    body: options.body ?? null,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`API request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

export function getApiSession(req: Request): ApiSession {
  const cookies = parseCookies(req.headers.cookie);
  const profileRaw = cookies[PROFILE_COOKIE];

  let profile: ApiProfile | null = null;
  if (profileRaw) {
    try {
      profile = JSON.parse(profileRaw) as ApiProfile;
    } catch {
      profile = null;
    }
  }

  return {
    accessToken: cookies[ACCESS_TOKEN_COOKIE] || null,
    refreshToken: cookies[REFRESH_TOKEN_COOKIE] || null,
    profile,
  };
}

export function setApiSession(req: Request, res: Response, payload: ApiSessionPayload) {
  const cookieOptions = getSessionCookieOptions(req);
  const maxAge = (payload.expires_in ? payload.expires_in * 1000 : ONE_YEAR_MS);

  res.cookie(ACCESS_TOKEN_COOKIE, payload.access_token, {
    ...cookieOptions,
    maxAge,
  });

  if (payload.refresh_token) {
    res.cookie(REFRESH_TOKEN_COOKIE, payload.refresh_token, {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS,
    });
  }

  res.cookie(PROFILE_COOKIE, JSON.stringify(payload.profile), {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });
}

export function clearApiSession(req: Request, res: Response) {
  const cookieOptions = getSessionCookieOptions(req);
  for (const name of [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, PROFILE_COOKIE]) {
    res.clearCookie(name, { ...cookieOptions, maxAge: -1 });
  }
}

export function formatRelativeArabicDate(input: string | number | Date) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return "منذ لحظات";
  }

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

  if (absMs < hour) {
    return rtf.format(Math.round(diffMs / minute), "minute");
  }
  if (absMs < day) {
    return rtf.format(Math.round(diffMs / hour), "hour");
  }
  if (absMs < 30 * day) {
    return rtf.format(Math.round(diffMs / day), "day");
  }

  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export async function fetchCurrentUser(accessToken: string): Promise<BackendUser> {
  return apiRequest<BackendUser>("/api/users/me", {
    method: "GET",
    accessToken,
  });
}
