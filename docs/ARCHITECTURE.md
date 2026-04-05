# Architecture Overview

## High-Level Design

The project uses a two-part application structure inside one repository:

- `frontend/`: React SPA built with Vite
- `backend/`: Express API and production web server

In production, the backend serves the compiled frontend from `frontend/dist`, which keeps deployment simple on Render as a single web service plus PostgreSQL.

## Backend Modules

- Authentication: JWT login and current-user endpoint
- Authorization: permission-based guards derived from role mappings
- Companies: registration and company profile management
- Licenses: issue, renew, status tracking, PDF export, QR link creation
- Payments: collection ledger with license linkage
- Reports: revenue and portfolio analytics
- Public verification: anonymous license lookup by `publicId`
- Audit logging: tracks major domain actions

## Database Entities

- `User`
- `Company`
- `License`
- `LicenseRenewal`
- `Payment`
- `AuditLog`

## Roles

- `SUPER_ADMIN`
- `ADMIN`
- `FINANCE`
- `INSPECTOR`
- `VIEWER`

Each role maps to explicit permissions inside [backend/src/config/permissions.js](/Users/Eldygha/OneDrive/سطح المكتب/SFZ-System/backend/src/config/permissions.js).

## PDF and QR Flow

1. The backend builds a public verification URL from `APP_BASE_URL` and a license `publicId`
2. The backend generates a QR image for that URL
3. Puppeteer renders the official certificate HTML into a PDF
4. The PDF is stored under `uploads/generated/licenses/`
5. Users can download the PDF from the dashboard
6. The QR opens the public verification page without authentication

## Frontend UX Structure

- Login page with shared logo asset
- Protected dashboard shell with responsive sidebar and header
- CRUD screens for companies, licenses, payments, and users
- Reporting screen with operational analytics
- Public verification screen for external users

## Deployment Shape

- One Render web service
- One Render PostgreSQL database
- Render Blueprint file in [render.yaml](/Users/Eldygha/OneDrive/سطح المكتب/SFZ-System/render.yaml)

This setup keeps the deployment path straightforward while remaining flexible enough to split frontend and backend services later if needed.
