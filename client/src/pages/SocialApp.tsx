import { useLocation } from "wouter";
import { LogOut, MessageCircle, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function SocialApp() {
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الخروج بنجاح");
      setLocation("/");
    },
    onError: () => {
      toast.error("حصلت مشكلة أثناء تسجيل الخروج");
    },
  });

  const handleLogout = () => logoutMutation.mutate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>جارٍ تحميل حسابك</CardTitle>
            <CardDescription>بنجهز لوحة التطبيق دلوقتي</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>لازم تسجل دخول الأول</CardTitle>
            <CardDescription>ادخل بحسابك علشان تفتح التطبيق</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} className="w-full">
              الرجوع للصفحة الرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm">
              نسخة ويب جاهزة للبناء
            </Badge>
            <h1 className="text-3xl font-bold">أهلاً {currentUser.name || "بك"}</h1>
            <p className="text-muted-foreground">
              دي لوحة بسيطة ومستقرة لنسخة الويب، جاهزة للعرض والتطوير بعد ما مشكلة البناء اتحلت.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            {logoutMutation.isPending ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                المجتمع
              </CardTitle>
              <CardDescription>أساس واجهة المجتمع جاهز للتوسعة</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              تقدر تضيف هنا المنشورات، الأصدقاء، والمجموعات بشكل تدريجي من غير ما تكسر البناء.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5" />
                الرسائل
              </CardTitle>
              <CardDescription>مكان مخصص للدردشة والرسائل</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              اربط مكونات المحادثات الحقيقية لاحقًا بعد مراجعة الـ API والـ state management.
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" />
                الأمان
              </CardTitle>
              <CardDescription>الجلسة الحالية مربوطة بحساب المستخدم</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              المستخدم الحالي: <span className="font-medium text-foreground">{currentUser.email || currentUser.phone_number || currentUser.id}</span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
