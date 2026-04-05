import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appName: "SFZ System",
      loginTitle: "Commercial License Management",
      loginSubtitle: "Manage companies, licenses, payments, and public verification from one secure workspace.",
      email: "Email",
      password: "Password",
      signIn: "Sign In",
      dashboard: "Dashboard",
      companies: "Companies",
      licenses: "Licenses",
      payments: "Payments",
      users: "Users",
      reports: "Reports",
      search: "Search",
      save: "Save",
      cancel: "Cancel",
      create: "Create",
      close: "Close",
      status: "Status",
      amount: "Amount",
      issueDate: "Issue date",
      expiryDate: "Expiry date",
      owner: "Owner",
      city: "City",
      companyName: "Company name",
      verification: "Verification"
    }
  },
  ar: {
    translation: {
      appName: "نظام SFZ",
      loginTitle: "إدارة الشركات والتراخيص التجارية",
      loginSubtitle: "منصة موحدة وآمنة لإدارة الشركات والتراخيص والمدفوعات والتحقق العام عبر رمز QR.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      signIn: "تسجيل الدخول",
      dashboard: "لوحة التحكم",
      companies: "الشركات",
      licenses: "التراخيص",
      payments: "المدفوعات",
      users: "المستخدمون",
      reports: "التقارير",
      search: "بحث",
      save: "حفظ",
      cancel: "إلغاء",
      create: "إنشاء",
      close: "إغلاق",
      status: "الحالة",
      amount: "المبلغ",
      issueDate: "تاريخ الإصدار",
      expiryDate: "تاريخ الانتهاء",
      owner: "المالك",
      city: "المدينة",
      companyName: "اسم الشركة",
      verification: "التحقق"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem("sfz-language") ?? "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;
