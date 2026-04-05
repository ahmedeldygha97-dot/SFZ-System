import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { loadLogoAsDataUrl } from "./logo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function safeText(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function buildLicenseHtml({ license, company, qrCodeDataUrl, logoDataUrl, verificationUrl }) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Commercial License ${license.licenseNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #14213d;
            margin: 0;
            background: #f6f8fb;
          }

          .sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 24mm 18mm;
            box-sizing: border-box;
            background: white;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #fca311;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 18px;
          }

          .brand img {
            width: 76px;
            height: 76px;
            object-fit: contain;
            border-radius: 18px;
            background: #ffffff;
          }

          .title {
            text-align: right;
          }

          .title h1 {
            margin: 0;
            font-size: 28px;
            letter-spacing: 0.03em;
          }

          .title p {
            margin: 6px 0 0;
            color: #52627a;
            font-size: 13px;
          }

          .hero {
            background: linear-gradient(135deg, #14213d, #1f5e8a);
            color: white;
            padding: 18px 22px;
            border-radius: 18px;
            display: flex;
            justify-content: space-between;
            gap: 24px;
          }

          .hero-block h2 {
            margin: 0;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            opacity: 0.78;
          }

          .hero-block strong {
            display: block;
            margin-top: 10px;
            font-size: 24px;
          }

          .grid {
            margin-top: 24px;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 22px;
          }

          .card {
            background: #ffffff;
            border: 1px solid #d8e0ea;
            border-radius: 18px;
            padding: 18px;
          }

          .card h3 {
            margin: 0 0 14px;
            font-size: 16px;
          }

          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .detail {
            background: #f7f9fc;
            border-radius: 14px;
            padding: 12px;
          }

          .detail span {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: #74839b;
            margin-bottom: 6px;
            letter-spacing: 0.08em;
          }

          .detail strong {
            font-size: 15px;
            line-height: 1.45;
          }

          .qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 12px;
          }

          .qr-box img {
            width: 180px;
            height: 180px;
            object-fit: contain;
          }

          .qr-box a {
            color: #1f5e8a;
            font-size: 12px;
            word-break: break-word;
          }

          .footer {
            margin-top: 26px;
            padding-top: 18px;
            border-top: 1px dashed #bfd0e2;
            font-size: 12px;
            color: #5e6c84;
            display: flex;
            justify-content: space-between;
            gap: 18px;
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="header">
            <div class="brand">
              ${logoDataUrl ? `<img src="${logoDataUrl}" alt="SFZ Logo" />` : ""}
              <div>
                <strong style="font-size:22px;">SFZ Commercial Registry</strong>
                <div style="color:#617089;margin-top:6px;">Company and License Management Platform</div>
              </div>
            </div>
            <div class="title">
              <h1>Commercial License</h1>
              <p>Official digital certificate with QR verification</p>
            </div>
          </div>

          <div class="hero">
            <div class="hero-block">
              <h2>License Number</h2>
              <strong>${safeText(license.licenseNumber)}</strong>
            </div>
            <div class="hero-block">
              <h2>Status</h2>
              <strong>${safeText(license.status)}</strong>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Company Details</h3>
              <div class="details">
                <div class="detail">
                  <span>Company Name (EN)</span>
                  <strong>${safeText(company.nameEn)}</strong>
                </div>
                <div class="detail">
                  <span>Company Name (AR)</span>
                  <strong>${safeText(company.nameAr)}</strong>
                </div>
                <div class="detail">
                  <span>Registration Number</span>
                  <strong>${safeText(company.registrationNumber)}</strong>
                </div>
                <div class="detail">
                  <span>Owner</span>
                  <strong>${safeText(company.ownerName)}</strong>
                </div>
                <div class="detail">
                  <span>Activity</span>
                  <strong>${safeText(company.commercialActivity)}</strong>
                </div>
                <div class="detail">
                  <span>Location</span>
                  <strong>${safeText([company.city, company.address].filter(Boolean).join(", "))}</strong>
                </div>
              </div>

              <h3 style="margin-top:20px;">License Details</h3>
              <div class="details">
                <div class="detail">
                  <span>Issue Date</span>
                  <strong>${formatDate(license.issueDate)}</strong>
                </div>
                <div class="detail">
                  <span>Expiry Date</span>
                  <strong>${formatDate(license.expiryDate)}</strong>
                </div>
                <div class="detail">
                  <span>Fee Amount</span>
                  <strong>${Number(license.feeAmount).toFixed(2)} LYD</strong>
                </div>
                <div class="detail">
                  <span>Notes</span>
                  <strong>${safeText(license.notes)}</strong>
                </div>
              </div>
            </div>

            <div class="card qr-box">
              <h3>Verify This License</h3>
              <img src="${qrCodeDataUrl}" alt="QR verification code" />
              <div>Scan the QR code or open the link below.</div>
              <a href="${verificationUrl}">${verificationUrl}</a>
            </div>
          </div>

          <div class="footer">
            <div>
              Generated by SFZ System on ${formatDate(new Date())}
            </div>
            <div>
              This certificate can be validated publicly using the QR code above.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function generateLicensePdf({ license, company, verificationUrl }) {
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    margin: 1,
    width: 320
  });

  const logoDataUrl = await loadLogoAsDataUrl();
  const html = buildLicenseHtml({ license, company, qrCodeDataUrl, logoDataUrl, verificationUrl });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm"
      }
    });

    const outputDirectory = path.resolve(__dirname, "../../../uploads/generated/licenses");
    await fs.mkdir(outputDirectory, { recursive: true });

    const filename = `${license.licenseNumber}.pdf`;
    const outputPath = path.join(outputDirectory, filename);

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
