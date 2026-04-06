import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { loadLogoAsDataUrl } from "./logo.js";
import { getSystemSettings } from "../services/settingsService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return escapeHtml(value);
}

function formatDate(value, language = "ar") {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(language === "ar" ? "ar-LY" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function formatCurrency(value, currency = "LYD", language = "ar") {
  const numericValue = Number(value ?? 0);
  return `${numericValue.toFixed(2)} ${language === "ar" ? "دينار ليبي" : currency}`;
}

function getStatusLabel(status, language = "ar") {
  const map = {
    ACTIVE: language === "ar" ? "سارية" : "Active",
    EXPIRED: language === "ar" ? "منتهية" : "Expired",
    EXPIRING_SOON: language === "ar" ? "تنتهي قريبًا" : "Expiring Soon",
    SUSPENDED: language === "ar" ? "موقوفة" : "Suspended",
    REVOKED: language === "ar" ? "ملغاة" : "Revoked",
    DRAFT: language === "ar" ? "مسودة" : "Draft",
    PENDING: language === "ar" ? "قيد المراجعة" : "Pending",
    CLOSED: language === "ar" ? "مغلقة" : "Closed",
    SUCCESS: language === "ar" ? "ناجح" : "Successful",
    PAID: language === "ar" ? "مدفوع" : "Paid",
    FAILED: language === "ar" ? "فشل" : "Failed",
    REFUNDED: language === "ar" ? "مسترجع" : "Refunded"
  };

  return map[status] ?? status;
}

function buildInfoGrid(items, language = "ar") {
  return `
    <div class="info-grid">
      ${items
        .map(
          (item) => `
            <div class="info-item">
              <div class="info-label ${language === "ar" ? "rtl" : ""}">${escapeHtml(item.label)}</div>
              <div class="info-value ${language === "ar" ? "rtl" : ""}">${safeText(item.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function buildSection(titleAr, titleEn, content) {
  return `
    <section class="section-card">
      <div class="section-title">
        <span>${escapeHtml(titleAr)}</span>
        <span>${escapeHtml(titleEn)}</span>
      </div>
      <div class="section-body">
        ${content}
      </div>
    </section>
  `;
}

function buildDocumentHtml({
  language = "ar",
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  formNumber,
  documentNumber,
  heroBadges = [],
  sections = [],
  qrCodeDataUrl,
  verificationUrl,
  settings,
  logoDataUrl
}) {
  const isArabic = language === "ar";
  const direction = isArabic ? "rtl" : "ltr";
  const bodyFont = isArabic ? "'Tahoma', 'Arial', sans-serif" : "'Arial', 'Tahoma', sans-serif";

  return `
    <!doctype html>
    <html lang="${language}" dir="${direction}">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(titleEn)}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: ${bodyFont};
            background: #ffffff;
            color: #0f2940;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .sheet {
            min-height: 273mm;
            border: 1px solid #d6dde8;
            background: #fff;
          }

          .header {
            border-bottom: 4px solid #173a63;
            padding: 14px 16px 10px;
          }

          .header-grid {
            display: grid;
            grid-template-columns: 90px 1fr 90px;
            align-items: center;
            gap: 12px;
          }

          .header-logo {
            width: 78px;
            height: 78px;
            object-fit: contain;
            margin: 0 auto;
          }

          .header-center {
            text-align: center;
          }

          .header-center h1 {
            margin: 0;
            font-size: 24px;
            color: #173a63;
          }

          .header-center h2 {
            margin: 6px 0 0;
            font-size: 18px;
            color: #173a63;
            font-weight: 700;
          }

          .header-center p {
            margin: 8px 0 0;
            color: #4f627a;
            font-size: 11px;
          }

          .meta-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-top: 12px;
          }

          .meta-box {
            border: 1px solid #d6dde8;
            background: #f8fafc;
            padding: 10px 12px;
            min-height: 56px;
          }

          .meta-label {
            font-size: 10px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #66788a;
          }

          .meta-value {
            margin-top: 4px;
            font-size: 13px;
            font-weight: 700;
          }

          .hero-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 16px 0;
          }

          .hero-badge {
            flex: 1 1 140px;
            border: 1px solid #d6dde8;
            background: linear-gradient(180deg, #eff5fb 0%, #f9fbfd 100%);
            padding: 10px 12px;
          }

          .hero-badge-label {
            color: #5f7388;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .hero-badge-value {
            margin-top: 6px;
            font-size: 14px;
            font-weight: 700;
            color: #173a63;
          }

          .content {
            padding: 12px 16px 16px;
          }

          .section-card {
            margin-top: 12px;
            border: 1px solid #d4dbe6;
            break-inside: avoid;
          }

          .section-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #173a63;
            color: #fff;
            padding: 8px 12px;
            font-weight: 700;
            font-size: 13px;
          }

          .section-body {
            padding: 12px;
            background: #fff;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .info-item {
            border: 1px solid #e1e7ef;
            background: #f8fafc;
            padding: 10px 12px;
            min-height: 72px;
          }

          .info-label {
            color: #6a7d90;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
          }

          .info-value {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.6;
            font-weight: 700;
            color: #10283f;
          }

          .rtl {
            direction: rtl;
            text-align: right;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 12px;
          }

          .data-table th,
          .data-table td {
            border: 1px solid #d7dee8;
            padding: 8px 7px;
            text-align: center;
            vertical-align: middle;
            word-wrap: break-word;
          }

          .data-table th {
            background: #edf3f9;
            color: #173a63;
            font-weight: 800;
          }

          .data-table tbody tr:nth-child(even) {
            background: #fbfcfe;
          }

          .status-pill {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 999px;
            background: #e8f1fb;
            border: 1px solid #bfd1e4;
            font-size: 11px;
            font-weight: 700;
            color: #173a63;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }

          .summary-card {
            border: 1px solid #d4dbe6;
            background: linear-gradient(180deg, #173a63 0%, #234e7d 100%);
            color: white;
            padding: 12px;
          }

          .summary-card-label {
            font-size: 11px;
            opacity: 0.82;
          }

          .summary-card-value {
            margin-top: 8px;
            font-size: 20px;
            font-weight: 800;
          }

          .footer-area {
            margin: 14px 16px 16px;
            border: 1px solid #d4dbe6;
            display: grid;
            grid-template-columns: 1.2fr 170px;
            gap: 0;
          }

          .footer-text {
            padding: 12px 14px;
            background: #f8fafc;
          }

          .footer-text h4 {
            margin: 0 0 6px;
            color: #173a63;
            font-size: 13px;
          }

          .footer-text p {
            margin: 4px 0;
            font-size: 11px;
            color: #42556b;
            line-height: 1.7;
          }

          .qr-box {
            border-inline-start: 1px solid #d4dbe6;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 12px;
            background: #fff;
          }

          .qr-box img {
            width: 120px;
            height: 120px;
            object-fit: contain;
          }

          .qr-box span {
            margin-top: 8px;
            font-size: 10px;
            color: #42556b;
            text-align: center;
            line-height: 1.5;
          }

          .footer-bar {
            background: #173a63;
            color: #ffffff;
            padding: 9px 14px;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="header-grid">
              ${settings.printShowDualLogo && logoDataUrl ? `<img class="header-logo" src="${logoDataUrl}" alt="logo" />` : "<div></div>"}
              <div class="header-center">
                <h1>${escapeHtml(titleAr)}</h1>
                <h2>${escapeHtml(titleEn)}</h2>
                <p>${safeText(subtitleAr)}<br />${safeText(subtitleEn)}</p>
              </div>
              ${logoDataUrl ? `<img class="header-logo" src="${logoDataUrl}" alt="logo" />` : "<div></div>"}
            </div>
            <div class="meta-row">
              <div class="meta-box">
                <div class="meta-label">Form No.</div>
                <div class="meta-value">${safeText(formNumber)}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">Document No.</div>
                <div class="meta-value">${safeText(documentNumber)}</div>
              </div>
              <div class="meta-box">
                <div class="meta-label">Issued By</div>
                <div class="meta-value">${safeText(isArabic ? settings.systemNameAr : settings.systemNameEn)}</div>
              </div>
            </div>
          </div>

          ${
            heroBadges.length > 0
              ? `
                <div class="hero-badges">
                  ${heroBadges
                    .map(
                      (badge) => `
                        <div class="hero-badge">
                          <div class="hero-badge-label">${escapeHtml(badge.label)}</div>
                          <div class="hero-badge-value">${safeText(badge.value)}</div>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }

          <div class="content">
            ${sections.join("")}
          </div>

          <div class="footer-area">
            <div class="footer-text">
              <h4>${escapeHtml(isArabic ? "بيان الاعتماد والتحقق" : "Official Approval & Verification")}</h4>
              <p>${safeText(isArabic ? settings.verificationStatementAr : settings.verificationStatementEn)}</p>
              <p>${safeText(isArabic ? settings.printFooterAr : settings.printFooterEn)}</p>
              <p>${safeText(settings.contactWebsite)} | ${safeText(settings.contactEmail)} | ${safeText(settings.contactPhone)}</p>
            </div>
            <div class="qr-box">
              ${
                qrCodeDataUrl
                  ? `<img src="${qrCodeDataUrl}" alt="QR" /><span>${safeText(
                      verificationUrl,
                      isArabic ? "رابط التحقق العام" : "Verification link"
                    )}</span>`
                  : `<span>${safeText(isArabic ? "لا يوجد رمز تحقق لهذه الوثيقة" : "No QR is attached to this document.")}</span>`
              }
            </div>
          </div>

          <div class="footer-bar">
            <span>${safeText(isArabic ? settings.systemNameAr : settings.systemNameEn)}</span>
            <span>${safeText(isArabic ? "وثيقة رسمية قابلة للطباعة والتحقق" : "Official printable and verifiable document")}</span>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function renderPdf({ html, outputDirectory, fileName }) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true
    });

    await fs.mkdir(outputDirectory, { recursive: true });
    const outputPath = path.join(outputDirectory, fileName);
    await fs.writeFile(outputPath, buffer);

    return {
      buffer,
      absolutePath: outputPath,
      relativePath: path.relative(path.resolve(__dirname, "../../.."), outputPath).replace(/\\/g, "/")
    };
  } finally {
    await browser.close();
  }
}

async function buildQrCode(verificationUrl) {
  if (!verificationUrl) {
    return null;
  }

  return QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 280
  });
}

export async function generateLicensePdf({ license, company, verificationUrl, language = "ar" }) {
  const settings = await getSystemSettings();
  const logoDataUrl = await loadLogoAsDataUrl();
  const qrCodeDataUrl = await buildQrCode(verificationUrl);

  const sections = [
    buildSection(
      "بيانات الترخيص",
      "License Details",
      buildInfoGrid(
        [
          { label: language === "ar" ? "رقم الترخيص" : "License Number", value: license.licenseNumber },
          { label: language === "ar" ? "تاريخ الإصدار" : "Issue Date", value: formatDate(license.issueDate, language) },
          { label: language === "ar" ? "تاريخ الانتهاء" : "Expiry Date", value: formatDate(license.expiryDate, language) },
          { label: language === "ar" ? "المدة" : "Duration", value: `${license.durationMonths ?? "—"} ${language === "ar" ? "شهر" : "months"}` },
          { label: language === "ar" ? "الجهة المصدرة" : "Issuing Authority", value: license.issuingAuthority },
          { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(license.status, language) },
          { label: language === "ar" ? "الرسوم" : "Fees", value: formatCurrency(license.feeAmount, "LYD", language) },
          { label: language === "ar" ? "الأنشطة" : "Activities", value: license.activities || company.commercialActivity }
        ],
        language
      )
    ),
    buildSection(
      "بيانات الشركة",
      "Company Information",
      buildInfoGrid(
        [
          { label: language === "ar" ? "اسم الشركة بالعربية" : "Company Name (AR)", value: company.nameAr },
          { label: language === "ar" ? "اسم الشركة بالإنجليزية" : "Company Name (EN)", value: company.nameEn },
          { label: language === "ar" ? "الاسم التجاري" : "Trade Name", value: company.tradeName },
          { label: language === "ar" ? "الشكل القانوني" : "Legal Form", value: company.legalForm },
          { label: language === "ar" ? "رقم التسجيل" : "Registration Number", value: company.registrationNumber },
          { label: language === "ar" ? "مدير الشركة" : "Company Manager", value: company.managerName || company.ownerName }
        ],
        language
      )
    ),
    buildSection(
      "العنوان والأنشطة",
      "Address and Activities",
      buildInfoGrid(
        [
          { label: language === "ar" ? "المدينة" : "City", value: company.city },
          { label: language === "ar" ? "المنطقة" : "Area", value: company.areaName },
          { label: language === "ar" ? "المبنى" : "Building", value: company.buildingName },
          { label: language === "ar" ? "رقم المقر" : "Premises No.", value: company.premisesNumber },
          { label: language === "ar" ? "العنوان" : "Address", value: company.address },
          { label: language === "ar" ? "النشاط التجاري" : "Commercial Activity", value: company.commercialActivity },
          { label: language === "ar" ? "ملاحظات" : "Notes", value: license.notes }
        ],
        language
      )
    )
  ];

  const html = buildDocumentHtml({
    language,
    titleAr: "رخصة تجارية",
    titleEn: "Trade License",
    subtitleAr: settings.systemNameAr,
    subtitleEn: settings.systemNameEn,
    formNumber: "TL-01",
    documentNumber: license.licenseNumber,
    heroBadges: [
      { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(license.status, language) },
      { label: language === "ar" ? "اسم الشركة" : "Company", value: language === "ar" ? company.nameAr || company.nameEn : company.nameEn },
      { label: language === "ar" ? "تاريخ الانتهاء" : "Expiry", value: formatDate(license.expiryDate, language) }
    ],
    sections,
    qrCodeDataUrl,
    verificationUrl,
    settings,
    logoDataUrl
  });

  return renderPdf({
    html,
    outputDirectory: path.resolve(__dirname, "../../../uploads/generated/licenses"),
    fileName: `${license.licenseNumber}.pdf`
  });
}

export async function generateCompanyPdf({ company, language = "ar" }) {
  const settings = await getSystemSettings();
  const logoDataUrl = await loadLogoAsDataUrl();
  const latestLicense = company.licenses?.[0];
  const verificationUrl = latestLicense?.qrCodeUrl ?? null;
  const qrCodeDataUrl = await buildQrCode(verificationUrl);

  const attachmentsTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th>${language === "ar" ? "اسم الملف" : "File Name"}</th>
          <th>${language === "ar" ? "التصنيف" : "Category"}</th>
          <th>${language === "ar" ? "تاريخ الرفع" : "Uploaded At"}</th>
        </tr>
      </thead>
      <tbody>
        ${
          company.attachments?.length
            ? company.attachments
                .map(
                  (attachment) => `
                    <tr>
                      <td>${safeText(attachment.originalName)}</td>
                      <td>${safeText(attachment.category)}</td>
                      <td>${formatDate(attachment.createdAt, language)}</td>
                    </tr>
                  `
                )
                .join("")
            : `
              <tr>
                <td colspan="3">${language === "ar" ? "لا توجد مرفقات مؤرشفة" : "No archived attachments"}</td>
              </tr>
            `
        }
      </tbody>
    </table>
  `;

  const sections = [
    buildSection(
      "بيانات الشركة",
      "Company Information",
      buildInfoGrid(
        [
          { label: language === "ar" ? "اسم الشركة بالعربية" : "Company Name (AR)", value: company.nameAr },
          { label: language === "ar" ? "اسم الشركة بالإنجليزية" : "Company Name (EN)", value: company.nameEn },
          { label: language === "ar" ? "الاسم التجاري" : "Trade Name", value: company.tradeName },
          { label: language === "ar" ? "رقم التسجيل" : "Registration Number", value: company.registrationNumber },
          { label: language === "ar" ? "الشكل القانوني" : "Legal Form", value: company.legalForm },
          { label: language === "ar" ? "الجنسية" : "Nationality", value: company.nationality }
        ],
        language
      )
    ),
    buildSection(
      "مدير الشركة",
      "Company Manager",
      buildInfoGrid(
        [
          { label: language === "ar" ? "اسم المدير" : "Manager Name", value: company.managerName || company.ownerName },
          { label: language === "ar" ? "البريد الإلكتروني" : "Email", value: company.email },
          { label: language === "ar" ? "الهاتف" : "Phone", value: company.phone },
          { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(company.status, language) }
        ],
        language
      )
    ),
    buildSection(
      "العنوان",
      "Address",
      buildInfoGrid(
        [
          { label: language === "ar" ? "المدينة" : "City", value: company.city },
          { label: language === "ar" ? "المنطقة" : "Area", value: company.areaName },
          { label: language === "ar" ? "المبنى" : "Building", value: company.buildingName },
          { label: language === "ar" ? "رقم المقر" : "Premises No.", value: company.premisesNumber },
          { label: language === "ar" ? "العنوان التفصيلي" : "Detailed Address", value: company.address }
        ],
        language
      )
    ),
    buildSection(
      "الأنشطة والأرشيف",
      "Activities and Archive",
      `
        ${buildInfoGrid(
          [
            { label: language === "ar" ? "النشاط التجاري" : "Commercial Activity", value: company.commercialActivity },
            { label: language === "ar" ? "ملاحظات" : "Notes", value: company.notes },
            { label: language === "ar" ? "آخر ترخيص" : "Latest License", value: latestLicense?.licenseNumber },
            { label: language === "ar" ? "عدد المرفقات" : "Attachment Count", value: company.attachments?.length ?? 0 }
          ],
          language
        )}
        <div style="margin-top:12px;">${attachmentsTable}</div>
      `
    )
  ];

  const html = buildDocumentHtml({
    language,
    titleAr: "بيانات شركة",
    titleEn: "Company Data",
    subtitleAr: settings.systemNameAr,
    subtitleEn: settings.systemNameEn,
    formNumber: "CD-01",
    documentNumber: company.registrationNumber,
    heroBadges: [
      { label: language === "ar" ? "الشركة" : "Company", value: language === "ar" ? company.nameAr || company.nameEn : company.nameEn },
      { label: language === "ar" ? "المدير" : "Manager", value: company.managerName || company.ownerName },
      { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(company.status, language) }
    ],
    sections,
    qrCodeDataUrl,
    verificationUrl,
    settings,
    logoDataUrl
  });

  return renderPdf({
    html,
    outputDirectory: path.resolve(__dirname, "../../../uploads/generated/companies"),
    fileName: `${company.registrationNumber}.pdf`
  });
}

export async function generateCommercialReportPdf({ analytics, from, to, language = "ar" }) {
  const settings = await getSystemSettings();
  const logoDataUrl = await loadLogoAsDataUrl();
  const verificationUrl = settings.contactWebsite || "";
  const qrCodeDataUrl = await buildQrCode(verificationUrl);

  const summaryCards = `
    <div class="summary-grid">
      ${[
        { label: language === "ar" ? "إجمالي الشركات" : "Total Companies", value: analytics.summary.totalCompanies },
        { label: language === "ar" ? "إجمالي التراخيص" : "Total Licenses", value: analytics.summary.totalLicenses },
        { label: language === "ar" ? "المدفوع" : "Paid", value: analytics.summary.paidCount },
        { label: language === "ar" ? "الإيرادات" : "Revenue", value: formatCurrency(analytics.summary.revenue, "LYD", language) }
      ]
        .map(
          (card) => `
            <div class="summary-card">
              <div class="summary-card-label">${escapeHtml(card.label)}</div>
              <div class="summary-card-value">${safeText(card.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  const companiesTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th>${language === "ar" ? "رقم التسجيل" : "Registration"}</th>
          <th>${language === "ar" ? "اسم الشركة" : "Company"}</th>
          <th>${language === "ar" ? "الاسم التجاري" : "Trade Name"}</th>
          <th>${language === "ar" ? "آخر ترخيص" : "Latest License"}</th>
          <th>${language === "ar" ? "الحالة" : "Status"}</th>
        </tr>
      </thead>
      <tbody>
        ${analytics.companies
          .map(
            (company) => `
              <tr>
                <td>${safeText(company.registrationNumber)}</td>
                <td>${safeText(language === "ar" ? company.nameAr || company.nameEn : company.nameEn)}</td>
                <td>${safeText(company.tradeName)}</td>
                <td>${safeText(company.licenses?.[0]?.licenseNumber)}</td>
                <td><span class="status-pill">${escapeHtml(getStatusLabel(company.licenses?.[0]?.status || company.status, language))}</span></td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;

  const sections = [
    buildSection("ملخص التقرير", "Report Summary", summaryCards),
    buildSection(
      "إحصاءات النشاط",
      "Activity Summary",
      `
        <table class="data-table">
          <thead>
            <tr>
              <th>${language === "ar" ? "النشاط" : "Activity"}</th>
              <th>${language === "ar" ? "العدد" : "Count"}</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.activitySummary
              .map(
                (row) => `
                  <tr>
                    <td>${safeText(row.label)}</td>
                    <td>${safeText(row.value)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
    ),
    buildSection("سجل الشركات والتراخيص", "Registered Companies and Licenses", companiesTable),
    buildSection(
      "التراخيص التي تنتهي قريبًا",
      "Expiring Licenses",
      `
        <table class="data-table">
          <thead>
            <tr>
              <th>${language === "ar" ? "رقم الترخيص" : "License"}</th>
              <th>${language === "ar" ? "الشركة" : "Company"}</th>
              <th>${language === "ar" ? "تاريخ الانتهاء" : "Expiry Date"}</th>
              <th>${language === "ar" ? "الحالة" : "Status"}</th>
            </tr>
          </thead>
          <tbody>
            ${analytics.expiringLicenses
              .map(
                (license) => `
                  <tr>
                    <td>${safeText(license.licenseNumber)}</td>
                    <td>${safeText(language === "ar" ? license.company.nameAr || license.company.nameEn : license.company.nameEn)}</td>
                    <td>${formatDate(license.expiryDate, language)}</td>
                    <td><span class="status-pill">${escapeHtml(getStatusLabel(license.status, language))}</span></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
    )
  ];

  const html = buildDocumentHtml({
    language,
    titleAr: "تقرير التراخيص التجارية",
    titleEn: "Commercial License Report",
    subtitleAr: `${settings.systemNameAr} | ${formatDate(from, language)} - ${formatDate(to, language)}`,
    subtitleEn: `${settings.systemNameEn} | ${formatDate(from, "en")} - ${formatDate(to, "en")}`,
    formNumber: "RPT-CL-01",
    documentNumber: `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`,
    sections,
    qrCodeDataUrl,
    verificationUrl,
    settings,
    logoDataUrl
  });

  return renderPdf({
    html,
    outputDirectory: path.resolve(__dirname, "../../../uploads/generated/reports"),
    fileName: "commercial-license-report.pdf"
  });
}

export async function generatePaymentReceiptPdf({ payment, company, license, language = "ar" }) {
  const settings = await getSystemSettings();
  const logoDataUrl = await loadLogoAsDataUrl();

  const sections = [
    buildSection(
      "بيانات السداد",
      "Payment Details",
      buildInfoGrid(
        [
          { label: language === "ar" ? "رقم الإيصال" : "Receipt Number", value: payment.receiptNumber },
          { label: language === "ar" ? "التاريخ" : "Payment Date", value: formatDate(payment.paymentDate, language) },
          { label: language === "ar" ? "المبلغ" : "Amount", value: formatCurrency(payment.amount, payment.currency, language) },
          { label: language === "ar" ? "طريقة السداد" : "Method", value: payment.method },
          { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(payment.status, language) },
          { label: language === "ar" ? "المرجع" : "Reference", value: payment.reference },
          { label: language === "ar" ? "رقم الترخيص" : "License Number", value: license?.licenseNumber },
          { label: language === "ar" ? "اسم الشركة" : "Company", value: language === "ar" ? company.nameAr || company.nameEn : company.nameEn }
        ],
        language
      )
    )
  ];

  const html = buildDocumentHtml({
    language,
    titleAr: "إيصال سداد",
    titleEn: "Payment Receipt",
    subtitleAr: settings.systemNameAr,
    subtitleEn: settings.systemNameEn,
    formNumber: "PAY-01",
    documentNumber: payment.receiptNumber || payment.id,
    heroBadges: [
      { label: language === "ar" ? "المبلغ" : "Amount", value: formatCurrency(payment.amount, payment.currency, language) },
      { label: language === "ar" ? "الحالة" : "Status", value: getStatusLabel(payment.status, language) }
    ],
    sections,
    qrCodeDataUrl: null,
    verificationUrl: null,
    settings,
    logoDataUrl
  });

  return renderPdf({
    html,
    outputDirectory: path.resolve(__dirname, "../../../uploads/generated/receipts"),
    fileName: `${payment.receiptNumber || payment.id}.pdf`
  });
}

export async function generateAuditLogsPdf({ logs, summary, from, to, language = "ar" }) {
  const settings = await getSystemSettings();
  const logoDataUrl = await loadLogoAsDataUrl();
  const verificationUrl = settings.contactWebsite || "";
  const qrCodeDataUrl = await buildQrCode(verificationUrl);

  const logTable = `
    <table class="data-table">
      <thead>
        <tr>
          <th>${language === "ar" ? "التاريخ" : "Timestamp"}</th>
          <th>${language === "ar" ? "المستخدم" : "User"}</th>
          <th>${language === "ar" ? "الإجراء" : "Action"}</th>
          <th>${language === "ar" ? "الكيان" : "Entity"}</th>
          <th>${language === "ar" ? "الحالة" : "Status"}</th>
          <th>${language === "ar" ? "عنوان IP" : "IP Address"}</th>
        </tr>
      </thead>
      <tbody>
        ${
          logs.length
            ? logs
                .map(
                  (row) => `
                    <tr>
                      <td>${formatDate(row.createdAt, language)}</td>
                      <td>${safeText(row.userName || row.userRole)}</td>
                      <td>${safeText(row.action)}</td>
                      <td>${safeText(row.entityType)}</td>
                      <td><span class="status-pill">${escapeHtml(getStatusLabel(row.status, language))}</span></td>
                      <td>${safeText(row.ipAddress)}</td>
                    </tr>
                  `
                )
                .join("")
            : `
              <tr>
                <td colspan="6">${language === "ar" ? "لا توجد سجلات مطابقة للفلاتر الحالية" : "No audit records matched the selected filters."}</td>
              </tr>
            `
        }
      </tbody>
    </table>
  `;

  const summaryGrid = `
    <div class="summary-grid">
      ${[
        { label: language === "ar" ? "إجمالي السجلات" : "Total Logs", value: summary.total },
        { label: language === "ar" ? "عمليات ناجحة" : "Successful Actions", value: summary.success },
        { label: language === "ar" ? "عمليات فاشلة" : "Failed Actions", value: summary.failed },
        { label: language === "ar" ? "مستخدمون فريدون" : "Unique Users", value: summary.uniqueUsers }
      ]
        .map(
          (card) => `
            <div class="summary-card">
              <div class="summary-card-label">${escapeHtml(card.label)}</div>
              <div class="summary-card-value">${safeText(card.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  const sections = [
    buildSection("ملخص السجل التدقيقي", "Audit Summary", summaryGrid),
    buildSection(
      "نطاق التقرير",
      "Report Scope",
      buildInfoGrid(
        [
          { label: language === "ar" ? "من" : "From", value: from ? formatDate(from, language) : null },
          { label: language === "ar" ? "إلى" : "To", value: to ? formatDate(to, language) : null },
          { label: language === "ar" ? "عدد الصفوف" : "Rows Included", value: logs.length }
        ],
        language
      )
    ),
    buildSection("السجل التفصيلي", "Detailed Audit Log", logTable)
  ];

  const html = buildDocumentHtml({
    language,
    titleAr: "تقرير السجل التدقيقي",
    titleEn: "Audit Log Report",
    subtitleAr: settings.systemNameAr,
    subtitleEn: settings.systemNameEn,
    formNumber: "AUD-01",
    documentNumber: `AUD-${new Date().toISOString().slice(0, 10)}`,
    heroBadges: [
      { label: language === "ar" ? "إجمالي السجلات" : "Total Logs", value: summary.total },
      { label: language === "ar" ? "الناجحة" : "Successful", value: summary.success },
      { label: language === "ar" ? "الفاشلة" : "Failed", value: summary.failed }
    ],
    sections,
    qrCodeDataUrl,
    verificationUrl,
    settings,
    logoDataUrl
  });

  return renderPdf({
    html,
    outputDirectory: path.resolve(__dirname, "../../../uploads/generated/reports"),
    fileName: "audit-log-report.pdf"
  });
}
