import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Globe, LockKeyhole, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo from "/src/assets/images/logo.png";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    email: "admin@sfz.local",
    password: "Admin@123456"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form);
      navigate("/");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(47,141,178,0.22),_transparent_28%),linear-gradient(180deg,_#fefbf4_0%,_#eef6fb_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[36px] bg-[#12324f] p-8 text-white shadow-panel lg:p-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img src={logo} alt="SFZ logo" className="h-16 w-16 rounded-[22px] bg-white object-contain p-2" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-200">SFZ</p>
                  <h1 className="text-3xl font-black">{t("appName")}</h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar")}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-white"
              >
                <Globe size={16} />
                {i18n.language === "ar" ? "English" : "العربية"}
              </button>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="text-xs uppercase tracking-[0.3em] text-brand-200">Digital Registry Platform</p>
              <h2 className="mt-5 text-5xl font-black leading-[1.05]">{t("loginTitle")}</h2>
              <p className="mt-5 text-lg text-slate-200">{t("loginSubtitle")}</p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Secure JWT access", value: "RBAC" },
                { label: "Instant PDF output", value: "Puppeteer" },
                { label: "Public QR check", value: "Live verify" }
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-200">{item.value}</p>
                  <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[36px] bg-white/90 p-8 shadow-panel backdrop-blur lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-600">Sign in</p>
              <h3 className="mt-3 text-3xl font-black text-ink-900">Welcome back</h3>
              <p className="mt-3 text-sm text-slate-500">Use the seeded administrator account or your assigned credentials.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t("email")}</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="field pl-11"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">{t("password")}</span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="field pl-11"
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                </div>
              </label>

              {error ? <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div> : null}

              <button type="submit" disabled={loading} className="primary-btn w-full">
                {loading ? "Signing in..." : t("signIn")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
