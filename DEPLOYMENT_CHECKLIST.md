# Vercel release checklist

## Before release

- [ ] API and Admin Vercel projects use `backend` and `admin` as their root directories.
- [ ] All API and admin environment variables are set in the matching Vercel project. The service-role key is API-only.
- [ ] Supabase SMTP is configured and `/set-password` is allowlisted as an Auth redirect.
- [ ] A staging backup was created and the reviewed migration chain applied with `npm run prisma:deploy`.
- [ ] Staging smoke checks passed for admin role boundaries, invite/password setup, tablet login/menu reads, and publishing.
- [ ] A restore was rehearsed against a separate empty PostgreSQL database.
- [ ] Existing production migration history was checked before baseline adoption.

## Production release

- [ ] Take a production backup and retain it outside the app host.
- [ ] Apply reviewed Prisma migrations from a controlled operator environment using `npm run prisma:deploy`.
- [ ] Deploy API and Admin from the same release commit.
- [ ] Confirm `/healthz`, tablet login, `/api/menu`, and `/api/admin/me`.
- [ ] Confirm the first healthy `/healthz` request stamped `LegacyRouteMonitor.startedAt` for the 30-day gate.
- [ ] Bootstrap the first Platform Admin with `BOOTSTRAP_PLATFORM_ADMIN_EMAIL`, verify the account, then remove that variable.
- [ ] Confirm legacy hit rows include route, client IP, User-Agent, and timestamp.

## Legacy retirement gate

- [ ] Every managed tablet is running the authenticated build.
- [ ] `npm run legacy:adoption-report` reports zero hits for 30 consecutive days after monitoring began.
- [ ] A Platform Admin approves retiring both legacy reads only after both checks pass.

Do not put `prisma migrate deploy` in a Vercel build or startup command. Do not use `prisma db push` in production. Render configuration is archived. See [Deployment](DEPLOYMENT.md) and [Legacy adoption gate](docs/LEGACY_ADOPTION.md).
