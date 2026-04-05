import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Building2, CreditCard, FileText, Globe, LayoutDashboard, Menu, ShieldCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "/src/assets/images/logo.png";
import { useAuth } from "../context/AuthContext";

const navigation = [
  { to: "/", labelKey: "dashboard", permission: "dashboard:view", icon: LayoutDashboard },
  { to: "/companies", labelKey: "companies", permission: "company:view", icon: Building2 },
  { to: "/licenses", labelKey: "licenses", permission: "license:view", icon: FileText },
  { to: "/payments", labelKey: "payments", permission: "payment:view", icon: CreditCard },
  { to: "/reports", labelKey: "reports", permission: "report:view", icon: ShieldCheck },
  { to: "/users", labelKey: "users", permission: "user:view", icon: Users }
];

export default function AppShell() {
  const { t, i18n } = useTranslation();
  const { user, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const language = i18n.language === "ar" ? "ar" : "en";
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.body.className = language === "ar" ? "font-arabic bg-sand text-slate-900" : "bg-sand text-slate-900";
    localStorage.setItem("sfz-language", language);
  }, [i18n.language]);

  const items = useMemo(() => navigation.filter((item) => hasPermission(item.permission)), [hasPermission]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,141,178,0.18),_transparent_30%),linear-gradient(180deg,_#f8fbfd_0%,_#f5f3ec_100%)]">
      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        <aside
          className={`fixed inset-y-0 z-40 w-72 border-r border-white/60 bg-[#12263f] p-5 text-white shadow-2xl transition-transform duration-300 lg:static ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <img src={logo} alt="SFZ logo" className="h-12 w-12 rounded-2xl bg-white object-contain p-1.5" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Registry</p>
              <h1 className="text-xl font-black">{t("appName")}</h1>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {items.map(({ to, labelKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-white text-ink-900" : "text-slate-200 hover:bg-white/10"
                  }`
                }
              >
                <Icon size={18} />
                {t(labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="mt-10 rounded-[28px] bg-white/10 p-4 text-sm text-slate-200">
            <p className="font-bold">{user?.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-brand-200">{user?.role}</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/75 px-4 py-4 backdrop-blur xl:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="rounded-2xl bg-slate-100 p-3 text-slate-700 lg:hidden"
                >
                  <Menu size={18} />
                </button>
                <Link to="/" className="flex items-center gap-3 lg:hidden">
                  <img src={logo} alt="SFZ logo" className="h-10 w-10 rounded-2xl bg-brand-50 object-contain p-1.5" />
                  <span className="text-lg font-black text-ink-900">{t("appName")}</span>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <Globe size={16} />
                  {i18n.language === "ar" ? "English" : "العربية"}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-2xl bg-ink-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
