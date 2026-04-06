# Architecture Overview

## High-Level Shape

The system is a single-repository application with:

- `frontend/`: React SPA for the secure dashboard and the public verification UI
- `backend/`: Express API, Prisma database layer, PDF engine, backup logic, and production web server

In production, the backend serves the built frontend from `frontend/dist`.

## Backend Modules

- Authentication: JWT login, logout, current-user endpoint, account lockout support
- Authorization: role-based permissions with optional per-user permission overrides
- Companies: registration, editing, detailed profile data, PDF export
- Licenses: issue, update, renew, suspend/reactivate, status history, QR verification, PDF export
- Payments: collection ledger, payment status tracking, receipt PDF generation
- Attachments: archived file upload and download for companies and licenses
- Reports: analytics plus official report PDF generation
- Settings: general settings, logo management, backup settings, security policy
- Backups: manual and scheduled JSON backups with restore validation
- Audit logs: filtered audit trail with CSV export
- Public verification: anonymous license lookup by `publicId`

## Database Entities

- `User`
- `Role`
- `Permission`
- `RolePermission`
- `Company`
- `License`
- `LicenseStatusHistory`
- `LicenseRenewal`
- `Payment`
- `Attachment`
- `Backup`
- `SystemSetting`
- `AuditLog`

## RBAC Model

Primary roles:

- `SUPER_ADMIN`
- `ADMIN`
- `STAFF`
- `FINANCE`
- `INSPECTOR`
- `VIEWER`

Permissions are defined in [backend/src/config/permissions.js](../backend/src/config/permissions.js) and seeded into the database for UI/reference purposes. The API currently enforces permission checks through code-level role mappings plus optional custom user permissions.

## PDF and QR Flow

1. The backend generates a public verification URL using `APP_BASE_URL` and a license `publicId`
2. A QR code is generated from that URL
3. Puppeteer renders an official bilingual HTML document into PDF
4. PDFs are stored in `uploads/generated/`
5. The QR opens the public verification page without authentication

## Localization

- Arabic is the default system language
- The frontend stores the selected language in local storage
- The UI switches the document direction between RTL and LTR
- Public settings expose the current system name and logo for both secure and public pages

## Backup Strategy

- Backups are generated as JSON snapshots
- Database records plus uploaded logo/attachment file content are included in the backup payload
- Restore validates backup integrity before applying data
- Automatic backup cadence is driven by `SystemSetting`

## Deployment Shape

- One Render web service
- One Render PostgreSQL database
- Blueprint definition in [render.yaml](../render.yaml)

For durable uploads and backup history in production, attach persistent storage or move file storage to object storage.
