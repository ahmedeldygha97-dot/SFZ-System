# SFZ System

SFZ System is a production-oriented web platform for managing company registration, commercial licensing, fee collection, PDF document generation, QR-based public verification, archived files, backups, and audit activity.

## Highlights

- Arabic-first UI with persistent language switching and RTL/LTR layout support
- React + Vite + Tailwind dashboard with role-based access control
- Company registry with detailed legal/address fields and archived attachments
- License issuance, editing, renewal, suspension/reactivation, status history, and public verification
- Payment tracking with receipt PDF generation
- Official-style PDF templates for company data, licenses, receipts, and reports
- Settings module for general preferences, logo management, backups, and security policy
- Automatic/manual JSON backup generation with restore validation
- Audit trail with filters and CSV export

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, i18next, Lucide React
- Backend: Node.js, Express, JWT auth, bcrypt, Puppeteer, QRCode
- Database: PostgreSQL
- ORM: Prisma
- Deployment: Render Blueprint (`render.yaml`)

## Project Structure

```text
backend/    Express API, Prisma schema, RBAC, PDF, QR, backup, audit modules
frontend/   React dashboard, public verification page, Arabic/English UI
docs/       Architecture and deployment documentation
uploads/    Generated PDFs, attachments, backup files, uploaded assets
render.yaml Render Blueprint definition
```

## Local Development

1. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start a local Prisma Postgres instance for development:

   ```bash
   npm run db:local:start
   ```

4. Update `DATABASE_URL` in `.env` using the local Prisma Postgres URL shown by:

   ```bash
   npm run db:local:list
   ```

5. Generate Prisma client, push the schema, and seed the administrator:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

6. Start the app in development mode:

   ```bash
   npm run dev
   ```

7. Open:

   - Frontend dev server: `http://localhost:5173`
   - Backend health check: `http://localhost:5000/api/health`

## Production-style Local Run

```bash
npm run build
npm start
```

Then open `http://localhost:5000`.

## Default Administrator

- Email: `admin@sfz.local`
- Password: `Admin@123456`

These values can be changed in `.env`.

## Core Modules

- Dashboard analytics
- Companies
- Licenses
- Payments
- Users and permissions
- Settings
- Backups and restore
- Audit logs
- Public verification

## Documentation

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deployment guide: [DEPLOYMENT.md](DEPLOYMENT.md)
