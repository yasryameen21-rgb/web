import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Download, LockKeyhole, Mail, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  DEFAULT_ARAB_COUNTRY,
  arabCountries,
  buildFullPhoneNumber,
  findArabCountry,
  stripPhoneDigits,
} from "@/lib/arabCountries";

const APP_DOWNLOAD_URL =
  import.meta.env.VITE_ANDROID_APP_URL?.trim() ||
  "https://drive.google.com/file/d/127s1NQTtKHMDz_e2g0Yu7I3P6xAJNSSf/view?usp=drivesdk";

export default function Home() {
  const [, setLocation] = useLocation();
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_ARAB_COUNTRY.code);
  const [localPhone, setLocalPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryStep, setRecoveryStep] = useState<"idle" | "otp-sent" | "verified">("idle");

  const { data: currentUser, isLoading: isUserLoading } = trpc.auth.me.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const forgotPasswordSendCodeMutation = trpc.auth.forgotPasswordSendCode.useMutation();
  const forgotPasswordVerifyMutation = trpc.auth.forgotPasswordVerify.useMutation();
  const forgotPasswordCompleteMutation = trpc.auth.forgotPasswordComplete.useMutation();
  const isDownloadReady = useMemo(() => /^https?:\/\//.test(APP_DOWNLOAD_URL), []);
  const selectedCountry = findArabCountry(selectedCountryCode);
  const normalizedPhone = buildFullPhoneNumber(selectedCountry.dialCode, localPhone);
  const normalizedEmail = email.trim().toLowerCase();

  const resolvePreferredIdentifier = () => {
    if (normalizedPhone) {
      return {
        identifier: normalizedPhone,
        contactMethod: "phone" as const,
      };
    }

    if (normalizedEmail) {
      return {
        identifier: normalizedEmail,
        contactMethod: "email" as const,
      };
    }

    return null;
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    if (currentUser) {
      setLocation("/app");
    }
  }, [currentUser, setLocation]);

  const handlePhoneChange = (value: string) => {
    setLocalPhone(stripPhoneDigits(value));
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    window.requestAnimationFrame(() => {
      phoneInputRef.current?.focus();
    });
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const resolvedIdentifier = resolvePreferredIdentifier();

    if (!resolvedIdentifier || !password.trim()) {
      toast.error("اكتب رقم الجوال أو البريد الإلكتروني ثم كلمة المرور أولاً");
      return;
    }

    if (resolvedIdentifier.contactMethod === "email" && !isValidEmail(resolvedIdentifier.identifier)) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        identifier: resolvedIdentifier.identifier,
        password,
      });
      toast.success("تم تسجيل الدخول بنجاح");
      setLocation("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تسجيل الدخول حالياً");
    }
  };

  const handleDownloadClick = () => {
    if (!isDownloadReady) {
      toast.error("رابط التنزيل غير متاح حالياً");
      return;
    }

    window.open(APP_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
  };

  const handleOpenForgotPassword = () => {
    const resolvedIdentifier = resolvePreferredIdentifier();

    if (!resolvedIdentifier) {
      toast.error("اكتب رقم الجوال أو البريد الإلكتروني أولاً ثم جرّب الاسترجاع");
      return;
    }

    if (resolvedIdentifier.contactMethod === "email" && !isValidEmail(resolvedIdentifier.identifier)) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح أولاً");
      return;
    }

    setForgotPasswordOpen(true);
    setRecoveryCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setRecoveryStep("idle");
  };

  const handleSendRecoveryCode = async () => {
    const resolvedIdentifier = resolvePreferredIdentifier();

    if (!resolvedIdentifier) {
      toast.error("اكتب رقم الجوال أو البريد الإلكتروني أولاً");
      return;
    }

    if (resolvedIdentifier.contactMethod === "email" && !isValidEmail(resolvedIdentifier.identifier)) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    try {
      await forgotPasswordSendCodeMutation.mutateAsync({
        contactMethod: resolvedIdentifier.contactMethod,
        contact: resolvedIdentifier.identifier,
      });
      setRecoveryStep("otp-sent");
      toast.success("تم إرسال رمز التحقق. أدخل الكود ثم أنشئ كلمة مرور جديدة");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال رمز التحقق");
    }
  };

  const handleVerifyRecoveryCode = async () => {
    if (recoveryCode.trim().length < 4) {
      toast.error("اكتب رمز تحقق صالح أولاً");
      return;
    }

    const resolvedIdentifier = resolvePreferredIdentifier();

    if (!resolvedIdentifier) {
      toast.error("اكتب رقم الجوال أو البريد الإلكتروني أولاً");
      return;
    }

    try {
      await forgotPasswordVerifyMutation.mutateAsync({
        contactMethod: resolvedIdentifier.contactMethod,
        contact: resolvedIdentifier.identifier,
        verificationCode: recoveryCode.trim(),
      });
      setRecoveryStep("verified");
      toast.success("تم التحقق من الرمز. اكتب كلمة المرور الجديدة الآن");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر التحقق من الرمز حالياً");
    }
  };

  const handleCompletePasswordReset = async () => {
    const resolvedIdentifier = resolvePreferredIdentifier();

    if (!resolvedIdentifier) {
      toast.error("اكتب رقم الجوال أو البريد الإلكتروني أولاً");
      return;
    }

    if (recoveryCode.trim().length < 4) {
      toast.error("أدخل رمز التحقق أولاً");
      return;
    }

    if (newPassword.trim().length < 8) {
      toast.error("كلمة المرور الجديدة لازم تكون 8 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("تأكيد كلمة المرور غير متطابق");
      return;
    }

    try {
      await forgotPasswordCompleteMutation.mutateAsync({
        contactMethod: resolvedIdentifier.contactMethod,
        contact: resolvedIdentifier.identifier,
        verificationCode: recoveryCode.trim(),
        newPassword,
      });
      toast.success("تم إنشاء كلمة مرور جديدة وحفظها");
      setForgotPasswordOpen(false);
      await loginMutation.mutateAsync({
        identifier: resolvedIdentifier.identifier,
        password: newPassword,
      });
      toast.success("تم تسجيل الدخول تلقائياً");
      setLocation("/app");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر حفظ كلمة المرور الجديدة حالياً");
    }
  };

  return (
    <>
      <div className="min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
          <div className="absolute bottom-20 left-20 h-96 w-96 rounded-full bg-accent/10 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-4 text-center">
              <div className="floating-text">
                <h1 className="text-5xl font-bold gradient-text sm:text-6xl">يامن شات</h1>
              </div>
              <p className="text-lg text-muted-foreground">تسجيل الدخول متاح برقم الجوال المحلي أو البريد الإلكتروني</p>
              <div className="mt-6 flex justify-center">
                <img
                  src="/home-child-security-realistic.png"
                  alt="Yamen Chat Security"
                  className="glow-effect h-64 w-64 rounded-3xl border-4 border-primary/30 object-cover shadow-2xl"
                />
              </div>
            </div>

            <Card className="border-0 p-8 shadow-lg transition-all hover:shadow-xl">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">الدولة العربية</label>
                  <Select value={selectedCountryCode} onValueChange={handleCountryChange}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="اختر الدولة" />
                    </SelectTrigger>
                    <SelectContent>
                      {arabCountries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name} (+{country.dialCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">رقم الجوال المحلي</label>
                  <div className="flex gap-2">
                    <div className="flex h-12 min-w-24 items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-muted-foreground">
                      +{selectedCountry.dialCode}
                    </div>
                    <Input
                      ref={phoneInputRef}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="اكتب الرقم بدون مفتاح الدولة"
                      value={localPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">البريد الإلكتروني</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="email"
                      autoComplete="email"
                      dir="ltr"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 pr-10 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">كلمة المرور</label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="أدخل كلمة المرور"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-10 text-base"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    نسيت كلمة السر
                  </button>
                </div>

                <div className="rounded-xl bg-secondary/30 px-4 py-3 text-right text-sm text-muted-foreground">
                  اكتب رقم الجوال أو البريد الإلكتروني. لو الاتنين موجودين، النظام هيحاول تسجيل الدخول برقم الجوال أولاً، ولو الرقم فاضي هيستخدم البريد الإلكتروني.
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending || isUserLoading}
                  className="h-12 w-full text-base font-semibold"
                >
                  {loginMutation.isPending ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
                </Button>
              </form>

              <div className="my-6 h-px bg-border" />

              <div className="space-y-3 text-center">
                <button
                  type="button"
                  onClick={() => setLocation("/signup")}
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  إنشاء حساب جديد
                </button>

                <Button
                  type="button"
                  onClick={handleDownloadClick}
                  variant="outline"
                  className="h-12 w-full text-base font-semibold"
                >
                  <Download className="h-4 w-4" />
                  تنزيل التطبيق
                </Button>

                <div className="rounded-xl bg-secondary/40 px-4 py-3 text-right text-sm text-muted-foreground">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                    <Smartphone className="h-4 w-4 text-primary" />
                    دعم جميع الدول العربية
                  </div>
                  <p>
                    القائمة مقتصرة على الدول العربية فقط، والرقم الظاهر في الإدخال هو الرقم المحلي بدون أي prefix، ويمكنك أيضاً تسجيل الدخول بالبريد الإلكتروني من الحقل الجديد.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>استرجاع كلمة المرور</DialogTitle>
            <DialogDescription>
              سيتم إرسال رمز تحقق إلى وسيلة التواصل المكتوبة حالياً. بعد تأكيد الرمز سيظهر فورم إنشاء كلمة مرور جديدة، وبعد الحفظ سيتم تسجيل الدخول مباشرة.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm leading-7 text-muted-foreground">
              وسيلة الاسترجاع الحالية:{" "}
              <span className="font-semibold text-foreground">
                {resolvePreferredIdentifier()?.contactMethod === "phone"
                  ? `+${selectedCountry.dialCode} ${localPhone || "—"}`
                  : normalizedEmail || "—"}
              </span>
            </div>

            <Button
              type="button"
              onClick={handleSendRecoveryCode}
              disabled={forgotPasswordSendCodeMutation.isPending}
              className="w-full"
            >
              {forgotPasswordSendCodeMutation.isPending ? "جاري إرسال رمز التحقق..." : "إرسال رمز التحقق"}
            </Button>

            {recoveryStep !== "idle" && (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                <label className="text-sm font-medium text-foreground">رمز التحقق</label>
                <Input
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(stripPhoneDigits(e.target.value))}
                  inputMode="numeric"
                  placeholder="أدخل رمز التحقق"
                  className="h-11 text-base"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleVerifyRecoveryCode}
                  disabled={forgotPasswordVerifyMutation.isPending || recoveryStep === "verified"}
                  className="w-full"
                >
                  {forgotPasswordVerifyMutation.isPending ? "جارٍ التحقق من الرمز..." : recoveryStep === "verified" ? "تم تأكيد الرمز" : "تأكيد الرمز"}
                </Button>
              </div>
            )}

            {recoveryStep === "verified" && (
              <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-semibold">أنشئ كلمة مرور جديدة</p>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                  className="h-11 text-base"
                />
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="h-11 text-base"
                />
                <Button
                  type="button"
                  onClick={handleCompletePasswordReset}
                  disabled={forgotPasswordCompleteMutation.isPending || loginMutation.isPending}
                  className="w-full"
                >
                  {forgotPasswordCompleteMutation.isPending || loginMutation.isPending ? "جارٍ الحفظ وتسجيل الدخول..." : "حفظ كلمة المرور الجديدة"}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
