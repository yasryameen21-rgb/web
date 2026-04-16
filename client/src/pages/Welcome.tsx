import { useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, MessageCircle, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const logoutMutation = trpc.auth.logout.useMutation();

  const savedProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem("yamenChatSignupProfile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    } finally {
      localStorage.removeItem("yamenChatSignupProfile");
      toast.success("تم تسجيل الخروج بنجاح");
      setLocation("/");
    }
  };

  const displayName = savedProfile?.name || savedProfile?.displayName || "المستخدم";
  const contactValue = savedProfile?.email || savedProfile?.phoneNumber || savedProfile?.contact || "لم يتم حفظ بيانات التواصل بعد";

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl"></div>
      </div>

      <header className="relative z-20 border-b border-sky-200 bg-white/70 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="floating-text">
            <h1 className="text-2xl font-bold gradient-text">يامن شات</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="smooth-transition hover:bg-red-600 hover:text-white border-red-200 text-red-700"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="p-8 shadow-lg border-0 smooth-transition hover:shadow-xl text-center bg-white/90 backdrop-blur">
            <div className="mb-4">
              <MessageCircle className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">أهلاً وسهلاً!</h2>
            <div className="my-6 flex justify-center">
              <img
                src="/welcome-child-realistic.png"
                alt="Welcome to Yamen Chat"
                className="w-64 h-64 object-cover rounded-2xl shadow-md border-4 border-blue-200"
              />
            </div>
            <p className="text-lg text-slate-600 mb-6">تم إنشاء حسابك بنجاح في يامن شات</p>
            <div className="bg-sky-50 rounded-lg p-4 mb-6 border border-sky-100">
              <p className="text-foreground font-semibold">مرحباً، {displayName}</p>
              <p className="text-sm text-slate-600 mt-1">{contactValue}</p>
            </div>
            <p className="text-slate-600">
              يمكنك الآن البدء في استخدام التطبيق للتواصل مع عائلتك بأمان وسهولة.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105 bg-white/90">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">المراسلة الفورية</h3>
              <p className="text-sm text-slate-600">تواصل مع أفراد عائلتك بشكل فوري وآمن</p>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105 bg-white/90">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">مجموعات عائلية</h3>
              <p className="text-sm text-slate-600">أنشئ مجموعات للتواصل مع عائلتك بكاملها</p>
            </div>
          </Card>

          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105 bg-white/90">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-violet-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">آمن وموثوق</h3>
              <p className="text-sm text-slate-600">تشفير قوي لحماية خصوصيتك وبيانات عائلتك</p>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            className="smooth-transition hover:shadow-lg hover:scale-105 px-8 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => setLocation("/app")}
          >
            ابدأ الآن
          </Button>
        </div>
      </div>

      <footer className="relative z-10 border-t border-sky-200 bg-white/70 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-600">
          <p>© 2024 يامن شات - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
