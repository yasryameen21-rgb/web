import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Download, KeyRound, LockKeyhole, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const APP_DOWNLOAD_URL =
  import.meta.env.VITE_ANDROID_APP_URL?.trim() ||
  "https://drive.google.com/file/d/127s1NQTtKHMDz_e2g0Yu7I3P6xAJNSSf/view?usp=drivesdk";

export default function Home() {
  const [, setLocation] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const { data: currentUser, isLoading: isUserLoading } = trpc.auth.me.useQuery();
  const loginMutation = trpc.auth.login.useMutation();
  const sendOtpMutation = trpc.auth.sendOtp.useMutation();
  const isDownloadReady = useMemo(() => /^https?:\/\//.test(APP_DOWNLOAD_URL), []);

  useEffect(() => {
    if (currentUser) {
      setLocation("/app");
    }
  }, [currentUser, setLocation]);

  const normalizedIdentifier = identifier.trim();
  const looksLikeEmail = normalizedIdentifier.includes("@");

  const handleSendOtp = async () => {
    if (!normalizedIdentifier) {
      toast.error("اكتب البريد أو رقم الجوال الأول");
      return;
    }

    try {
      await sendOtpMutation.mutateAsync({
        contactMethod: looksLikeEmail ? "email" : "phone",
        contact: normalizedIdentifier,
      });
      toast.success("تم إرسال رمز التحقق. دخّله لإكمال تسجيل الدخول على الويب");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال رمز التحقق");
    }
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!normalizedIdentifier || !password.trim()) {
      toast.error("اكتب البريد أو رقم الجوال وكلمة المرور أولاً");
      return;
    }

    if (!verificationCode.trim()) {
      toast.error("أدخل رمز التحقق المرسل قبل تسجيل الدخول");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        identifier: normalizedIdentifier,
        password,
        verificationCode: verificationCode.trim(),
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

  return (
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
            <p className="text-lg text-muted-foreground">تطبيق التواصل العائلي الآمن والموثوق</p>
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
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">البريد الإلكتروني أو رقم الجوال</label>
                <Input
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="example@email.com أو 01000000000"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-12 text-base"
                  required
                />
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

              <div className="space-y-3 rounded-xl bg-secondary/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendOtpMutation.isPending || !normalizedIdentifier}
                    variant="outline"
                    className="h-11 sm:w-44"
                  >
                    <KeyRound className="h-4 w-4" />
                    {sendOtpMutation.isPending ? "جارٍ الإرسال..." : "إرسال الرمز"}
                  </Button>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="أدخل رمز التحقق"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="h-11 text-base"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  تم تفعيل تسجيل الدخول على الويب بكلمة المرور + رمز التحقق لنفس الحساب.
                </p>
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
                Download App
              </Button>

              <div className="rounded-xl bg-secondary/40 px-4 py-3 text-right text-sm text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-semibold text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  رابط التطبيق مضاف على الويب والموبايل
                </div>
                <p>
                  لو كنت مسجل برقم جوال، اكتب رقمك ثم كلمة المرور، وبعدها أرسل رمز التحقق وأدخله من نفس الشاشة.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
