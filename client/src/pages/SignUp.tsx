import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    contactMethod: "phone" as "phone" | "email",
    contact: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const createUserMutation = trpc.users.create.useMutation();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactMethodChange = (method: "phone" | "email") => {
    setFormData((prev) => ({
      ...prev,
      contactMethod: method,
      contact: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من البيانات
    if (!formData.firstName.trim()) {
      toast.error("يرجى إدخال الاسم الأول");
      return;
    }
    if (!formData.lastName.trim()) {
      toast.error("يرجى إدخال اسم العائلة");
      return;
    }
    if (!formData.dateOfBirth) {
      toast.error("يرجى إدخال تاريخ الميلاد");
      return;
    }
    if (!formData.contact.trim()) {
      toast.error(
        `يرجى إدخال ${formData.contactMethod === "phone" ? "رقم الجوال" : "البريد الإلكتروني"}`
      );
      return;
    }

    // التحقق من صيغة البريد الإلكتروني إذا كانت الطريقة بريد
    if (
      formData.contactMethod === "email" &&
      !formData.contact.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);
    try {
      await createUserMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: new Date(formData.dateOfBirth),
        contactMethod: formData.contactMethod,
        contact: formData.contact,
      });

      toast.success("تم إنشاء الحساب بنجاح!");
      setLocation("/welcome");
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء الحساب");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 overflow-hidden">
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-md space-y-6">
          {/* رأس الصفحة */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold gradient-text">إنشاء حساب جديد</h1>
            <button
              onClick={handleBack}
              className="p-2 hover:bg-secondary rounded-lg smooth-transition"
              title="العودة"
            >
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* بطاقة النموذج */}
          <Card className="p-8 shadow-lg border-0 smooth-transition hover:shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* الاسم الأول */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  الاسم الأول *
                </label>
                <Input
                  type="text"
                  name="firstName"
                  placeholder="أدخل اسمك الأول"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* اسم العائلة */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  اسم العائلة *
                </label>
                <Input
                  type="text"
                  name="lastName"
                  placeholder="أدخل اسم عائلتك"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* تاريخ الميلاد */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  تاريخ الميلاد *
                </label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* اختيار طريقة التواصل */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  طريقة التواصل *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleContactMethodChange("phone")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      formData.contactMethod === "phone"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    الجوال
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContactMethodChange("email")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      formData.contactMethod === "email"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    البريد
                  </button>
                </div>
              </div>

              {/* حقل التواصل */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {formData.contactMethod === "phone"
                    ? "رقم الجوال *"
                    : "البريد الإلكتروني *"}
                </label>
                <Input
                  type={formData.contactMethod === "phone" ? "tel" : "email"}
                  name="contact"
                  placeholder={
                    formData.contactMethod === "phone"
                      ? "أدخل رقم جوالك"
                      : "أدخل بريدك الإلكتروني"
                  }
                  value={formData.contact}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              {/* زر الإنشاء */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold smooth-transition hover:shadow-lg mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            </form>
          </Card>

          {/* ملاحظة */}
          <p className="text-center text-sm text-muted-foreground">
            بإنشاء حساب، فإنك توافق على شروط الخدمة
          </p>
        </div>
      </div>
    </div>
  );
}
