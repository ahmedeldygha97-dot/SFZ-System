# SFZ System

SFZ System is a production-oriented web platform for managing company registration, commercial license issuance and renewal, fee collection, PDF certificates, QR-based public verification, reporting, and role-based access control.

## Stack

- Frontend: React, Vite, Tailwind CSS, React Router, i18next, Lucide React
- Backend: Node.js, Express, JWT auth, bcrypt, Puppeteer, QRCode
- Database: PostgreSQL
- ORM: Prisma
- Deployment: Render Blueprint (`render.yaml`)

## Main Features

- Secure JWT authentication with role-based permissions
- Company registration and profile management
- Commercial license issuance and renewal workflows
- Payment and fee collection ledger
- Dashboard and analytics reporting
- Official PDF certificate generation with embedded QR verification
- Public verification page for each license
- Bilingual-ready UI with English and Arabic support
- Deployment-ready structure for Render and GitHub

## Project Structure

```text
backend/    Express API, Prisma schema, auth, PDF and QR services
frontend/   React application, dashboard UI, public verification page
docs/       Architecture and deployment documentation
uploads/    Generated exports and PDFs
render.yaml Render Blueprint definition
```

## Local Development

1. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

2. Update `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL`, and the admin credentials in `.env`.

3. Install dependencies:

   ```bash
   npm install
   ```

4. Generate Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npx prisma migrate dev --schema backend/prisma/schema.prisma
   npm run db:seed
   ```

5. Start the development servers:

   ```bash
   npm run dev
   ```

6. Open:

   - Frontend: `http://localhost:5173`
   - Backend health check: `http://localhost:5000/api/health`

## Default Administrator

The server auto-creates a bootstrap administrator when the database has no users.

- Email: value of `ADMIN_EMAIL`
- Password: value of `ADMIN_PASSWORD`

## Production Build

```bash
npm run build
npm start
```

The backend serves the built frontend from `frontend/dist` in production and listens on `process.env.PORT`.

## QR Verification Flow

- Each license receives a unique `publicId`
- Public verification page path: `/verify/:publicId`
- Backend public endpoint: `/api/public/licenses/:publicId`
- Generated PDFs include a QR code pointing to `APP_BASE_URL/verify/:publicId`

## Documentation

- Architecture: [docs/ARCHITECTURE.md](/Users/Eldygha/OneDrive/سطح المكتب/SFZ-System/docs/ARCHITECTURE.md)
- Deployment guide: [DEPLOYMENT.md](/Users/Eldygha/OneDrive/سطح المكتب/SFZ-System/DEPLOYMENT.md)
