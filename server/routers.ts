import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  process.env.VITE_BACKEND_API_URL ||
  "https://yamen-yasry-backend.onrender.com"
).replace(/\/+$/, "");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(() => null),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  users: router({
    create: publicProcedure
      .input(
        z.object({
          firstName: z.string().min(1, "الاسم الأول مطلوب"),
          lastName: z.string().min(1, "اسم العائلة مطلوب"),
          dateOfBirth: z.date().optional(),
          contactMethod: z.enum(["phone", "email"]),
          contact: z.string().min(1, "رقم الجوال أو البريد الإلكتروني مطلوب"),
        })
      )
      .mutation(async ({ input }) => {
        const payload = {
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          date_of_birth: input.dateOfBirth
            ? input.dateOfBirth.toISOString().split("T")[0]
            : null,
          contact_method: input.contactMethod,
          contact: input.contact.trim(),
        };

        try {
          const response = await fetch(`${BACKEND_API_URL}/api/auth/register-profile`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          let data: any = null;
          try {
            data = await response.json();
          } catch {
            data = null;
          }

          if (!response.ok) {
            throw new TRPCError({
              code: response.status >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
              message:
                data?.message ||
                data?.detail ||
                data?.error ||
                "تعذر إنشاء الحساب. تحقق من إعدادات الخادم وقاعدة البيانات.",
            });
          }

          return {
            success: true,
            message: data?.message || "تم إنشاء الحساب بنجاح",
            userId: data?.user_id ?? data?.userId,
            displayName: data?.display_name ?? data?.displayName,
            email: data?.email ?? null,
            phoneNumber: data?.phone_number ?? null,
            profile: data?.profile ?? null,
            accessToken: data?.access_token ?? null,
            refreshToken: data?.refresh_token ?? null,
            expiresIn: data?.expires_in ?? null,
            tokenType: data?.token_type ?? null,
          };
        } catch (error) {
          console.error("خطأ في إنشاء المستخدم:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل الاتصال بخدمة التسجيل. تأكد من BACKEND_API_URL وقاعدة البيانات.",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
