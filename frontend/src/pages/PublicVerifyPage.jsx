import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, ShieldX, QrCode } from "lucide-react";
import logo from "/src/assets/images/logo.png";
import { apiRequest } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/format";

export default function PublicVerifyPage() {
  const { publicId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest(`/public/licenses/${publicId}`)
      .then((payload) => setData(payload.item))
      .catch((requestError) => setError(requestError.message));
  }, [publicId]);

  const verified = data && data.status === "ACTIVE";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(47,141,178,0.18),_transparent_25%),linear-gradient(180deg,_#f9fbfd_0%,_#f3eee2_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="page-card overflow-hidden !p-0">
          <div className="border-b border-slate-100 bg-[#12324f] p-8 text-white">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <img src={logo} alt="SFZ logo" className="h-16 w-16 rounded-[22px] bg-white object-contain p-2" />
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-brand-200">Public verification</p>
                  <h1 className="text-3xl font-black">Commercial license check</h1>
                </div>
              </div>
              <div className="rounded-[24px] bg-white/10 px-4 py-3 text-sm font-semibold">
                QR verification ID: {publicId}
              </div>
            </div>
          </div>

          <div className="p-8">
            {error ? (
              <div className="rounded-[24px] bg-rose-50 p-6 text-rose-700">
                <div className="flex items-center gap-3 text-lg font-black">
                  <ShieldX />
                  Verification failed
                </div>
                <p className="mt-3 text-sm">{error}</p>
              </div>
            ) : null}

            {!data && !error ? (
              <div className="rounded-[24px] bg-slate-50 p-6 text-sm font-semibold text-slate-600">Loading license data...</div>
            ) : null}

            {data ? (
              <div className="space-y-6">
                <div className={`rounded-[28px] p-6 ${verified ? "bg-emerald-50" : "bg-amber-50"}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      {verified ? <CheckCircle2 className="text-emerald-600" size={28} /> : <ShieldX className="text-amber-600" size={28} />}
                      <div>
                        <h2 className="text-2xl font-black text-ink-900">
                          {verified ? "License verified" : "License requires attention"}
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                          Publicly issued under the SFZ digital registry.
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={data.status} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ["License number", data.licenseNumber],
                    ["Issue date", formatDate(data.issueDate)],
                    ["Expiry date", formatDate(data.expiryDate)],
                    ["Registration number", data.company.registrationNumber],
                    ["Company name", data.company.nameEn],
                    ["Owner", data.company.ownerName],
                    ["Commercial activity", data.company.commercialActivity || "-"],
                    ["City", data.company.city || "-"]
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
                    This page is the official public verification endpoint for the QR code embedded in the generated PDF.
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
