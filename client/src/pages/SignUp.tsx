import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_ARAB_COUNTRY,
  arabCountries,
  buildFullPhoneNumber,
  findArabCountry,
  stripPhoneDigits,
} from "@/lib/arabCountries";

const DEFAULT_BIRTH_DATE = "2008-04-03";
const MIN_BIRTH_DATE = "1950-01-01";

export default function SignUp() {
  const [, setLocation] = useLocation();
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_ARAB_COUNTRY.code);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: DEFAULT_BIRTH_DATE,
    contactMethod: "phone" as "phone" | "email",
    contact: "",
    password: "",
    verificationCode: "",
  });

  const createUserMutation = trpc.users.create.useMutation();
  const sendOtpMutation = trpc.auth.sendOtp.useMutation();
  const selectedCountry = findArabCountry(selectedCountryCode);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "contact" && prev.contactMethod === "phone" ? stripPhoneDigits(value) : value,
    }));
  };

  const handleContactMethodChange = (method: "phone" | "email") => {
    setFormData((prev) => ({
      ...prev,
      contactMethod: method,
      contact: "",
      verificationCode: "",
    }));
  };

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    window.requestAnimationFrame(() => {
      phoneInputRef.current?.focus();
    });
  };

  const getResolvedContact = () => {
    if (formData.contactMethod === "phone") {
      return buildFullPhoneNumber(selectedCountry.dialCode, formData.contact);
    }

    return formData.contact.trim().toLowerCase();
  };

  const validateContact = () => {
    const resolvedContact = getResolvedContact();

    if (!resolvedContact) {
      toast.error(
        `يرجى إدخال ${formData.contactMethod === "phone" ? "رقم الجوال" : "البريد الإلكتروني"}`
      );
      return false;
    }

    if (
      formData.contactMethod === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedContact)
    ) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return false;
    }

    return true;
  };

  const handleSendOtp = async () => {
    if (!validateContact()) return;

    try {
      await sendOtpMutation.mutateAsync({
        contactMethod: formData.contactMethod,
        contact: getResolvedContact(),
      });
      toast.success("تم إرسال رمز التحقق، أدخله لإكمال إنشاء الحساب");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إرسال رمز التحقق");
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      toast.error("يرجى إدخال الاسم الأول");
      return;
    }

    if (!formData.lastName.trim()) {
      toast.error("يرجى إدخال اسم العائلة");
      return;
    }

    if (!validateContact()) {
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      toast.error("كلمة المرور لازم تكون 8 أحرف على الأقل");
      return;
    }

    if (!formData.verificationCode.trim()) {
      toast.error("أدخل رمز التحقق أولاً");
      return;
    }

    try {
      await createUserMutation.mutateAsync({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: new Date(formData.dateOfBirth),
        contactMethod: formData.contactMethod,
        contact: getResolvedContact(),
        password: formData.password,
        verificationCode: formData.verificationCode.trim(),
      });

      toast.success("تم إنشاء الحساب وتفعيل الجلسة بنجاح");
      setLocation("/welcome");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الحساب");
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
        <div className="absolute bottom-20 left-20 h-96 w-96 rounded-full bg-accent/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold gradient-text">إنشاء حساب جديد</h1>
            <button
              onClick={() => setLocation("/")}
              className="rounded-lg p-2 transition hover:bg-secondary"
              title="العودة"
            >
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </button>
          </div>

          <Card className="border-0 p-8 shadow-lg transition-all hover:shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">الاسم الأول *</label>
                  <Input
                    type="text"
                    name="firstName"
                    placeholder="أدخل اسمك الأول"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="h-11 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">اسم العائلة *</label>
                  <Input
                    type="text"
                    name="lastName"
                    placeholder="أدخل اسم العائلة"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="h-11 text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">تاريخ الميلاد *</label>
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  min={MIN_BIRTH_DATE}
                  max={DEFAULT_BIRTH_DATE}
                  onChange={handleInputChange}
                  className="h-11 text-base"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">طريقة التواصل *</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleContactMethodChange("phone")}
                    className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all ${
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
                    className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all ${
                      formData.contactMethod === "email"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    البريد
                  </button>
                </div>
              </div>

              {formData.contactMethod === "phone" ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">الدولة</label>
                    <Select value={selectedCountryCode} onValueChange={handleCountryChange}>
                      <SelectTrigger className="h-11 text-base">
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
                    <label className="text-sm font-medium text-foreground">رقم الجوال المحلي *</label>
                    <div className="flex gap-2">
                      <div className="flex h-11 min-w-24 items-center justify-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-muted-foreground">
                        +{selectedCountry.dialCode}
                      </div>
                      <Input
                        ref={phoneInputRef}
                        type="tel"
                        name="contact"
                        inputMode="numeric"
                        placeholder="اكتب الرقم بدون مفتاح الدولة"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="h-11 text-base"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">البريد الإلكتروني *</label>
                  <Input
                    type="email"
                    name="contact"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={formData.contact}
                    onChange={handleInputChange}
                    className="h-11 text-base"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">إنشاء كلمة المرور *</label>
                <Input
                  type="password"
                  name="password"
                  placeholder="8 أحرف أو أكثر"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="h-11 text-base"
                  required
                />
              </div>

              <div className="space-y-3 rounded-xl bg-secondary/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendOtpMutation.isPending}
                    variant="outline"
                    className="h-11 sm:w-44"
                  >
                    {sendOtpMutation.isPending ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                  </Button>
                  <Input
                    type="text"
                    name="verificationCode"
                    inputMode="numeric"
                    placeholder="أدخل رمز التحقق"
                    value={formData.verificationCode}
                    onChange={handleInputChange}
                    className="h-11 text-base"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  في حالة التسجيل بالجوال اختر الدولة واكتب الرقم المحلي فقط، وسيتم إضافة المقدمة تلقائياً قبل إرسال رمز التحقق والتسجيل.
                </p>
              </div>

              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                className="mt-6 h-12 w-full text-base font-semibold"
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
            </form>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            بإنشاء حساب، فأنت توافق على شروط الخدمة وسياسة الخصوصية.
          </p>
        </div>
      </div>
    </div>
  );
}
