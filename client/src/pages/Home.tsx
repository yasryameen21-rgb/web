import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Download, ArrowLeft } from "lucide-react";

const GOOGLE_DRIVE_LINK = "https://drive.google.com/uc?export=download&id=YOUR_FILE_ID";

export default function Home() {
  const [, setLocation] = useLocation();
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // محاكاة تسجيل الدخول
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLocation("/app");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    setLocation("/signup");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden">
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* اسم التطبيق بتأثير عائم */}
          <div className="text-center space-y-4">
            <div className="floating-text">
              <h1 className="text-5xl sm:text-6xl font-bold gradient-text">
                يامن شات
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              تطبيق التواصل العائلي الآمن والموثوق
            </p>
          </div>

          {/* بطاقة نموذج التسجيل */}
          <Card className="p-8 shadow-lg border-0 smooth-transition hover:shadow-xl">
            <form onSubmit={handleLogin} className="space-y-6">
              {/* اختيار طريقة التسجيل */}
              <div className="flex gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setLoginMethod("phone")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    loginMethod === "phone"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Phone className="w-4 h-4 inline-block ml-2" />
                  الجوال
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod("email")}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    loginMethod === "email"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  <Mail className="w-4 h-4 inline-block ml-2" />
                  البريد
                </button>
              </div>

              {/* حقل الإدخال */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {loginMethod === "phone" ? "رقم الجوال" : "البريد الإلكتروني"}
                </label>
                <Input
                  type={loginMethod === "phone" ? "tel" : "email"}
                  placeholder={
                    loginMethod === "phone"
                      ? "أدخل رقم جوالك"
                      : "أدخل بريدك الإلكتروني"
                  }
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-12 text-base smooth-transition focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* زر تسجيل الدخول */}
              <Button
                type="submit"
                disabled={isLoading || !inputValue}
                className="w-full h-12 text-base font-semibold smooth-transition hover:shadow-lg"
              >
                {isLoading ? "جاري التسجيل..." : "تسجيل الدخول"}
              </Button>
            </form>

            {/* فاصل */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">أو</span>
              </div>
            </div>

            {/* زر إنشاء حساب جديد */}
            <Button
              type="button"
              onClick={handleCreateAccount}
              variant="outline"
              className="w-full h-12 text-base font-semibold smooth-transition hover:bg-secondary"
            >
              إنشاء حساب جديد
            </Button>
          </Card>

          {/* زر تنزيل التطبيق */}
          <div className="flex justify-center pt-4">
            <a
              href={GOOGLE_DRIVE_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold smooth-transition hover:shadow-lg hover:scale-105"
            >
              <Download className="w-5 h-5" />
              تنزيل التطبيق
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
