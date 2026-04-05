# Deployment Guide

## 1. Push the Repository to GitHub

This project is prepared for Git-backed deployment on Render. Push the repository to GitHub on the `main` branch, then connect that repository in Render.

- Render GitHub connection guide: [Render docs](https://render.com/docs/github)

## 2. Deploy on Render

This repository includes `render.yaml`, so the recommended path is a Blueprint deploy.

1. Open Render and create a new Blueprint deployment from the repository.
2. Render will detect `render.yaml` and create:
   - one Node web service
   - one managed PostgreSQL database
3. Confirm the linked GitHub repository and branch (`main`).
4. Set the required environment variables before applying the Blueprint:
   - `JWT_SECRET`
   - `APP_BASE_URL`
   - `ADMIN_PASSWORD`
5. `DATABASE_URL` is injected automatically from the managed Render PostgreSQL database.

Helpful references:

- Blueprint spec: [Render docs](https://render.com/docs/blueprint-spec)
- Environment variables: [Render docs](https://render.com/docs/configure-environment-variables)
- Web services and port binding: [Render docs](https://render.com/docs/web-services)

## 3. Required Environment Variables

Set these in Render:

- `NODE_ENV=production`
- `JWT_SECRET=<long-random-secret>`
- `APP_BASE_URL=https://your-service.onrender.com` or your custom domain
- `ADMIN_EMAIL=admin@sfz.local` or your preferred administrator email
- `ADMIN_PASSWORD=<strong-password>`

Notes:

- Render web services expect the app to bind to `0.0.0.0` and use `PORT`. Render documents the default web-service `PORT` as `10000`, but the application should always trust the injected `PORT` value at runtime.
- `DATABASE_URL` is managed by Render when the Blueprint provisions the PostgreSQL database.

## 4. First Deploy Checklist

1. Apply the Blueprint.
2. Wait for the initial build and deploy to finish.
3. Open the service’s public `onrender.com` URL.
4. Update `APP_BASE_URL` to that exact public URL if you did not set it before deployment.
5. Trigger a redeploy after changing `APP_BASE_URL`.

This step matters because QR codes and public verification links are generated from `APP_BASE_URL`.

## 5. Custom Domain Setup

After the app is live, you can attach a domain from the Render Dashboard.

1. Open your web service in Render.
2. Go to `Settings` > `Custom Domains`.
3. Add your domain or subdomain.
4. Update DNS with your registrar as instructed by Render.
5. Verify the domain in Render after DNS propagates.

Render’s documentation states that:

- web services keep their `onrender.com` subdomain even after adding a custom domain
- Render automatically provisions and renews TLS certificates
- HTTP traffic is redirected to HTTPS

Reference: [Render custom domains docs](https://render.com/docs/custom-domains)

After the custom domain is verified:

1. Change `APP_BASE_URL` to the custom domain, for example `https://licenses.example.com`
2. Redeploy the service
3. Generate a fresh license PDF to confirm the QR points to the new public domain

## 6. QR and Public Verification Testing

After deployment:

1. Sign in as an administrator.
2. Create a company.
3. Issue a license.
4. Download the generated PDF.
5. Scan the QR code with a phone or open the verification URL manually.
6. Confirm that the public page loads and shows the correct company and license data.

## 7. Publish Updates

Every push to the connected Git branch can trigger a Render redeploy.

- Git-backed deploy behavior: [Render docs](https://render.com/docs/deploys/)

Recommended release flow:

1. Commit changes locally
2. Push to GitHub
3. Let Render auto-deploy from the updated branch
4. Smoke-test `/api/health`, login, license PDF generation, and QR verification
