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

    if (
      formData.contactMethod === "email" &&
      !formData.contact.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createUserMutation.mutateAsync({
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: new Date(formData.dateOfBirth),
        contactMethod: formData.contactMethod,
        contact: formData.contact,
      });

      const profile = {
        userId: result.userId,
        name: result.displayName || `${formData.firstName} ${formData.lastName}`.trim(),
        email: result.email || (formData.contactMethod === "email" ? formData.contact : ""),
        phoneNumber: result.phoneNumber || (formData.contactMethod === "phone" ? formData.contact : ""),
        contactMethod: formData.contactMethod,
        contact: formData.contact,
        profile: result.profile ?? null,
        accessToken: result.accessToken ?? null,
        refreshToken: result.refreshToken ?? null,
      };

      localStorage.setItem("yamenChatSignupProfile", JSON.stringify(profile));
      toast.success(result.message || "تم إنشاء الحساب بنجاح!");
      setLocation("/welcome");
    } catch (error: any) {
      const message = error?.message || "حدث خطأ أثناء إنشاء الحساب";
      toast.error(message);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold gradient-text">إنشاء حساب جديد</h1>
            <button
              onClick={handleBack}
              className="p-2 hover:bg-white/70 rounded-lg smooth-transition"
              title="العودة"
            >
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          <Card className="p-8 shadow-lg border-0 smooth-transition hover:shadow-xl bg-white/90 backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">الاسم الأول *</label>
                <Input
                  type="text"
                  name="firstName"
                  placeholder="أدخل اسمك الأول"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">اسم العائلة *</label>
                <Input
                  type="text"
                  name="lastName"
                  placeholder="أدخل اسم عائلتك"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تاريخ الميلاد *</label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">طريقة التواصل *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleContactMethodChange("phone")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      formData.contactMethod === "phone"
                        ? "bg-blue-600 text-white"
                        : "bg-sky-100 text-sky-900 hover:bg-sky-200"
                    }`}
                  >
                    الجوال
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContactMethodChange("email")}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                      formData.contactMethod === "email"
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    }`}
                  >
                    البريد
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {formData.contactMethod === "phone" ? "رقم الجوال *" : "البريد الإلكتروني *"}
                </label>
                <Input
                  type={formData.contactMethod === "phone" ? "tel" : "email"}
                  name="contact"
                  placeholder={
                    formData.contactMethod === "phone" ? "أدخل رقم جوالك" : "أدخل بريدك الإلكتروني"
                  }
                  value={formData.contact}
                  onChange={handleInputChange}
                  className="h-11 text-base smooth-transition focus:ring-2 focus:ring-sky-400"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-base font-semibold smooth-transition hover:shadow-lg mt-6 bg-blue-600 hover:bg-blue-700 text-white"
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

          <p className="text-center text-sm text-slate-600">
            بإنشاء حساب، فإنك توافق على شروط الخدمة وسياسة الخصوصية.
          </p>
        </div>
      </div>
    </div>
  );
}
