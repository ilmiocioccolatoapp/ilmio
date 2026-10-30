# Deployment

Vercel is the production host for the API and admin app. Render is archived; `render.yaml` and the old Render keep-alive script have been removed. Production schema changes use checked-in Prisma migrations only.

## Vercel projects

Create two Vercel projects from this repository:

| Project | Root directory | Config | Production URL |
| --- | --- | --- | --- |
| API | `backend` | `backend/vercel.json` | `https://ilmio-app.vercel.app` |
| Admin | `admin` | `admin/vercel.json` | `https://ilmio-admin.vercel.app` |

Build the API with `npm ci` and `npm run prisma:generate`. Do not run migrations from the Vercel build or server startup. The admin build needs `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, and `REACT_APP_SUPABASE_PUBLISHABLE_KEY`.

## API environment

Set these values in Vercel Project Settings → Environment Variables for Production and Preview as appropriate:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, with SSL as required by the provider |
| `STORE_JWT_SECRET` | Random secret of at least 32 characters for tablet sessions |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Server-side Auth token verification and self-service recovery email |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Auth user lookup and invite API; never put this in the admin project |
| `ADMIN_INVITE_REDIRECT_URL` | `https://ilmio-admin.vercel.app/set-password`; add this path to Supabase Auth’s allowed redirect URLs |
| `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` | Email of the first confirmed Supabase user who should become Platform Admin |
| `ADMIN_ORIGINS` | Exact HTTPS browser origins, comma-separated; start with `https://ilmio-admin.vercel.app` |
| `TRUST_PROXY_HOPS` | `1`, so Express records the Vercel client IP for auth limits and legacy monitoring |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Brand image uploads |
| `NODE_ENV` | `production` |

Keep the service-role key and database connection string in the API project only. Do not add them to `REACT_APP_*` variables or commit them to the repository. Configure the Supabase email provider/SMTP and redirect allowlist before inviting admins.

## Controlled database release

Run every migration on a staging database first. The repository’s `npm run test:integration` uses a disposable local PostgreSQL cluster and checks the migration chain; it does not access a staging or production database.

1. Use a staging database that matches the existing single-brand schema. Keep a pre-migration backup with `DATABASE_URL` set to staging:

   ```sh
   cd backend
   npm ci
   npm run db:backup -- /secure/path/staging-before-release.dump
   ```

2. Check `npx prisma migrate status`. If this is an existing database with no migration history, compare its schema with `202610300001_baseline/migration.sql`; only when they match, record that baseline with `npm run prisma:baseline`. Then apply the reviewed migrations:

   ```sh
   npm run prisma:deploy
   ```

3. Deploy the commit to a staging/preview API and admin environment backed by staging Postgres and staging Supabase Auth. Smoke-test admin sign-in, invitation/password setup, tablet login/menu reads, and publishing.

4. Back up the **post-migration** staging database, then rehearse restoring that backup to a separate empty database. The restore checker expects the post-migration `MenuVersion` table:

   ```sh
   npm run db:backup -- /secure/path/staging-after-release.dump
   RESTORE_DATABASE_URL='postgresql://…/ilmio_restore_staging' npm run db:restore-check -- /secure/path/staging-after-release.dump
   ```

5. After staging and restore checks pass, back up production, verify/adopt the production baseline if needed, and apply the same migration commit using `npm run prisma:deploy` with production `DATABASE_URL` from a controlled operator environment. Then deploy the API and admin projects. Do not put `prisma migrate deploy` in `vercel.json`, a build command, or startup code. Never use `prisma db push` in production.

6. Verify `/healthz`, `/api/auth/store/login`, `/api/menu`, and `/api/admin/me`. The first healthy request to the new API stamps the legacy monitoring start time; confirm it appears in the adoption report.

The Vercel project, production database, SMTP configuration, and staging credentials are external to this repository. The runbook is ready, but the staging rehearsal and production bootstrap must be completed by an operator with those credentials.

## First Platform Admin

Before the first API deployment, set `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` to the confirmed Supabase account that will own platform setup. That user signs in once; the API binds the verified Supabase identity and creates the first Platform Admin profile. Immediately after confirming `/api/admin/me` reports `isPlatformAdmin: true`, remove `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` from Vercel and redeploy. The Platform Admin creates organizations and brands, then invites Brand Admins from the **Brands** screen. Invitees set their own passwords through Supabase.

## Existing installations

The migration chain includes an adopted baseline and a data-preserving multi-owner migration. For an existing database, confirm its Prisma migration history before applying anything. Do not mark the baseline applied unless it matches the existing schema and the migration guide’s adoption procedure. Back up and rehearse the exact production database on staging first.

## Legacy retirement

`GET /api/categories` and `GET /api/products/available` are pinned to the original Il Mio assignment and persist each request’s IP, User-Agent, route, and timestamp. The 30-day clock begins when `/healthz` is first served successfully by the instrumented API after deployment. Run `cd backend && npm run legacy:adoption-report` against the production database. Retire both routes only when its `retirementGateMet` is true for a full 30-day monitoring window **and** every managed tablet is on the authenticated build. See [Legacy adoption gate](docs/LEGACY_ADOPTION.md).
