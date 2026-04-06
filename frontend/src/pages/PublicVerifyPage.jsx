import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Globe, QrCode, ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/format";
import { useSystem } from "../context/SystemContext";

export default function PublicVerifyPage() {
  const { publicId } = useParams();
  const { t } = useTranslation();
  const { logoSrc, systemName, language, setLanguage, settings } = useSystem();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/public/licenses/${publicId}`)
      .then((payload) => setData(payload.item))
      .catch((requestError) => setError(requestError.message));
  }, [publicId]);

  const verified = data && data.status === "ACTIVE";
  const officialNotice =
    language === "en" ? settings?.verificationStatementEn || t("publicVerify.officialNotice") : settings?.verificationStatementAr || t("publicVerify.officialNotice");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,141,178,0.18),_transparent_25%),linear-gradient(180deg,_#f9fbfd_0%,_#f3eee2_100%)] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="page-card overflow-hidden !p-0">
          <div className="border-b border-slate-100 bg-[#12324f] p-8 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img src={logoSrc} alt="SFZ logo" className="h-16 w-16 rounded-[22px] bg-white object-contain p-2" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-200">{t("publicVerify.pageBadge")}</p>
                  <h1 className="text-3xl font-black">{systemName}</h1>
                  <p className="mt-2 text-sm text-slate-200">{t("publicVerify.title")}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                  className="inline-flex items-center gap-2 rounded-[24px] bg-white/10 px-4 py-3 text-sm font-semibold"
                >
                  <Globe size={16} />
                  {language === "ar" ? "English" : "العربية"}
                </button>

                <div className="rounded-[24px] bg-white/10 px-4 py-3 text-sm font-semibold">
                  {t("publicVerify.qrId")}: {publicId}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {error ? (
              <div className="rounded-[24px] bg-rose-50 p-6 text-rose-700">
                <div className="flex items-center gap-3 text-lg font-black">
                  <ShieldX />
                  {t("publicVerify.failure")}
                </div>
                <p className="mt-3 text-sm">{error}</p>
              </div>
            ) : null}

            {!data && !error ? (
              <div className="rounded-[24px] bg-slate-50 p-6 text-sm font-semibold text-slate-600">{t("common.loading")}</div>
            ) : null}

            {data ? (
              <div className="space-y-6">
                <div className={`rounded-[28px] p-6 ${verified ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      {verified ? <CheckCircle2 className="text-emerald-600" size={28} /> : <ShieldX className="text-amber-600" size={28} />}
                      <div>
                        <h2 className="text-2xl font-black text-ink-900">{verified ? t("publicVerify.verified") : t("publicVerify.attention")}</h2>
                        <p className="mt-2 text-sm text-slate-600">{t("publicVerify.helper")}</p>
                      </div>
                    </div>
                    <StatusBadge status={data.status} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    [t("publicVerify.fields.licenseNumber"), data.licenseNumber],
                    [t("publicVerify.fields.issueDate"), formatDate(data.issueDate)],
                    [t("publicVerify.fields.expiryDate"), formatDate(data.expiryDate)],
                    [t("publicVerify.fields.registrationNumber"), data.company.registrationNumber],
                    [t("publicVerify.fields.companyName"), data.company.nameAr || data.company.nameEn],
                    [t("publicVerify.fields.tradeName"), data.company.tradeName || "-"],
                    [t("publicVerify.fields.legalForm"), data.company.legalForm || "-"],
                    [t("publicVerify.fields.manager"), data.company.managerName || data.company.ownerName || "-"],
                    [t("publicVerify.fields.activities"), data.activities || data.company.commercialActivity || "-"],
                    [t("publicVerify.fields.address"), [data.company.city, data.company.areaName, data.company.address].filter(Boolean).join(" - ") || "-"]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                      <p className="mt-3 text-lg font-bold text-ink-900">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-dashed border-brand-200 bg-brand-50 p-5 text-sm text-brand-900">
                  <div className="flex items-center gap-3 font-bold">
                    <QrCode size={18} />
                    {officialNotice}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
