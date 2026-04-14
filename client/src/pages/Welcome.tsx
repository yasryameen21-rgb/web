import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LogOut, MessageCircle, Users, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { data: user } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      setLocation("/");
    } catch (error) {
      console.error("خطأ في تسجيل الخروج:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden">
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      {/* شريط الرأس */}
      <header className="relative z-20 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="floating-text">
            <h1 className="text-2xl font-bold gradient-text">يامن شات</h1>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="smooth-transition hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* رسالة الترحيب */}
        <div className="max-w-2xl mx-auto mb-12">
          <Card className="p-8 shadow-lg border-0 smooth-transition hover:shadow-xl text-center">
            <div className="mb-4">
              <MessageCircle className="w-16 h-16 mx-auto text-primary mb-4" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              أهلاً وسهلاً!
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              تم إنشاء حسابك بنجاح في يامن شات
            </p>
            {user && (
              <div className="bg-secondary/30 rounded-lg p-4 mb-6">
                <p className="text-foreground font-semibold">
                  مرحباً، {user.name || "المستخدم"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.email || "لم يتم تعيين بريد إلكتروني"}
                </p>
              </div>
            )}
            <p className="text-muted-foreground">
              يمكنك الآن البدء في استخدام التطبيق للتواصل مع عائلتك بأمان وسهولة
            </p>
          </Card>
        </div>

        {/* المميزات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
          {/* بطاقة المراسلة */}
          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                المراسلة الفورية
              </h3>
              <p className="text-sm text-muted-foreground">
                تواصل مع أفراد عائلتك بشكل فوري وآمن
              </p>
            </div>
          </Card>

          {/* بطاقة المجموعات */}
          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                مجموعات عائلية
              </h3>
              <p className="text-sm text-muted-foreground">
                أنشئ مجموعات للتواصل مع عائلتك بكاملها
              </p>
            </div>
          </Card>

          {/* بطاقة الأمان */}
          <Card className="p-6 shadow-lg border-0 smooth-transition hover:shadow-xl hover:scale-105">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                آمن وموثوق
              </h3>
              <p className="text-sm text-muted-foreground">
                تشفير قوي لحماية خصوصيتك وبيانات عائلتك
              </p>
            </div>
          </Card>
        </div>

        {/* زر الانتقال إلى التطبيق */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="smooth-transition hover:shadow-lg hover:scale-105 px-8"
            onClick={() => setLocation("/app")}
          >
            ابدأ الآن
          </Button>
        </div>
      </div>

      {/* تذييل */}
      <footer className="relative z-10 border-t border-border bg-card/50 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© 2024 يامن شات - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
