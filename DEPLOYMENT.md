# Deployment Guide

## 1. GitHub Repository

The project is already prepared for Git-backed deployment from:

- [ahmedeldygha97-dot/SFZ-System](https://github.com/ahmedeldygha97-dot/SFZ-System)

Use the `main` branch for Render deployment.

## 2. Deploy on Render

This repository includes `render.yaml`, so the recommended path is a Blueprint deploy.

1. Open Render.
2. Choose `New +` > `Blueprint`.
3. Connect the GitHub repository above.
4. Render will detect `render.yaml` and provision:
   - one Node web service
   - one PostgreSQL database
5. Before confirming the deploy, set the required environment variables.

Helpful Render references:

- [GitHub connection](https://render.com/docs/github)
- [Blueprint spec](https://render.com/docs/blueprint-spec)
- [Environment variables](https://render.com/docs/configure-environment-variables)
- [Web services](https://render.com/docs/web-services)

## 3. Required Environment Variables

Set these in Render:

- `NODE_ENV=production`
- `PORT` is injected by Render automatically
- `DATABASE_URL` is injected automatically from the managed database
- `JWT_SECRET=<long-random-secret>`
- `APP_BASE_URL=https://your-service.onrender.com`
- `CLIENT_URL=https://your-service.onrender.com`
- `ADMIN_EMAIL=admin@sfz.local`
- `ADMIN_PASSWORD=<strong-password>`

Important:

- `APP_BASE_URL` is used to generate the public QR verification links.
- `CLIENT_URL` should normally match the same public domain when frontend and backend are served together from one service.

## 4. First Deploy Checklist

1. Apply the Blueprint.
2. Wait for the first build and health check to finish.
3. Open the public service URL.
4. Confirm:
   - `/api/health` returns `ok`
   - login works
   - company creation works
   - license PDF generation works
   - QR verification opens the public page

## 5. Domain Linking

After the service is live:

1. Open the Render web service.
2. Go to `Settings` > `Custom Domains`.
3. Add your domain or subdomain.
4. Update DNS records with your registrar exactly as Render instructs.
5. Wait for verification.

Reference:

- [Render custom domains](https://render.com/docs/custom-domains)

After the domain is verified:

1. Set `APP_BASE_URL=https://your-domain.com`
2. Set `CLIENT_URL=https://your-domain.com`
3. Trigger a redeploy
4. Generate a fresh license PDF and scan its QR code

## 6. Backups, Uploads, and Storage Note

The system stores:

- generated PDFs
- uploaded logo
- archived attachments
- JSON backup files

For real production use on Render, these files should live on persistent storage. If you deploy without persistent disk/object storage, files may be lost on rebuild/redeploy.

Recommended production practice:

1. Use a Render disk on a paid plan, or
2. Move uploads/backups to object storage

This matters especially for:

- archived files
- downloadable backup history
- generated official PDFs you want to retain

## 7. QR Verification Test

After deployment:

1. Sign in as admin
2. Create a company
3. Issue a license
4. Download the license PDF
5. Scan the QR code from a phone
6. Confirm the public page loads and shows the correct live status

## 8. Backup and Restore Test

After deployment:

1. Open `Settings`
2. Create a manual backup
3. Download the generated JSON backup file
4. Confirm it appears in backup history
5. Test restore only on a non-production environment first

## 9. Publish Updates

After future changes:

1. Commit changes locally
2. Push to GitHub `main`
3. Let Render redeploy automatically
4. Smoke-test health, login, PDFs, backups, and public QR verification
