# Il Mio v4.2 Go-Live Checklist

This runbook covers the first migration from the single-brand Il Mio schema to the multi-store platform, the two administrator roles, and the Store ID login used by tablets.

## Release readiness

- [x] The local migration chain includes a legacy baseline, Il Mio data backfill, and legacy-route adoption monitoring.
- [x] The live legacy `Category` and `Product` schema was checked read-only against the baseline. Columns, defaults, indexes, foreign key, and RLS flags match.
- [x] The live catalog currently has 8 categories and 19 products; all product prices pass the migration format check, and products have valid legacy category references.
- [x] The Flutter flow uses Store ID and password, skips brand choice for one assigned menu, shows a selector for multiple menus, stores tokens with `flutter_secure_storage`, and expires offline access after 72 hours.
- [x] A release migration removes direct Data API execute access from the existing Supabase `public.rls_auto_enable()` SECURITY DEFINER helper, if present, without removing its event trigger.
- [x] A signed version `2.1.0+9` APK candidate was compiled at `mobile/build/app/outputs/flutter-apk/app-release.apk`. This first artifact uses the current production API URL and cannot complete the v4.2 login flow until the API migration/deployment is live; rebuild it after the `Ilmio-app` API is updated.
- [x] Release scope is limited to the existing Supabase `Ilmio-app` project. The other project is out of scope and will not be modified.
- [ ] Vercel Preview still points to production services. No staging project or branch was created: the Free organization already has two active projects; a third project is not available under its Free quota, and branching requires Pro. No plan upgrade or extra project was created.
- [ ] Production migration, account setup, and store password initialization have not been run.

## 1. Scope and no-extra-project rehearsal

1. Use only the existing Supabase `Ilmio-app` project for this release. Keep the organization on its current Free plan; do not create or modify the other Supabase project.
2. The Free organization currently has two active projects, its Free-plan limit. A new standalone project was quoted at $0/month, but there is no available third Free-project slot. Free projects can pause after a week of low activity. See [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) and [pricing](https://supabase.com/pricing).
3. Branch creation was rejected because the current plan does not support branching. The branch quote was $0.01344/hour, separate from a Pro subscription; the [Pro plan starts at $25/month](https://supabase.com/pricing). No upgrade was made.
4. For a no-extra-project rehearsal, take a protected database dump from `Ilmio-app`, restore it to a disposable local PostgreSQL instance, then run the migration and restore checks against that copy. Keep all connection strings and dumps outside the repository. Continue running `npm run test:integration` as well.
5. Do not smoke-test Vercel Preview while its environment variables point to production. The APK cannot use an SSO-protected preview as its API endpoint.
6. Before the production release, confirm a fresh `Ilmio-app` backup can be restored and passes the migration rehearsal. Configure `STORE_JWT_SECRET`, `ADMIN_ORIGINS`, `ADMIN_INVITE_REDIRECT_URL`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in the correct Vercel production projects.
7. Configure Supabase Auth email delivery and add the production password-setup redirect URL to its allowed redirect URLs. Enable leaked-password protection before sending setup emails; the current production project advisor reports that it is disabled.

## 2. Back up and rehearse the Il Mio database migration

Use a protected operator shell or secret manager for connection strings. Do not put secrets in this repository, command history, or the APK. The source database is the existing `Ilmio-app` project; restore its dump to a disposable local PostgreSQL instance for rehearsal.

```sh
cd backend
npm ci
npm run db:backup -- /secure/path/ilmio-before.dump
npx prisma migrate status
```

For a copy of the existing legacy database with no Prisma migration history, first compare it to `prisma/migrations/202610300001_baseline/migration.sql`. Only if it exactly matches, record the baseline and apply the remaining migrations:

```sh
npm run prisma:baseline
npm run prisma:deploy
```

The second migration backfills the legacy catalog into the Il Mio organization, brand, store, and StoreBrand assignment in one transaction. It preserves the existing Category and Product IDs and fields, converts supported AED/EUR price strings into exact numeric amounts, creates the first published menu snapshot, and pins legacy menu routes to the Il Mio assignment. It stops before the backfill if prices are malformed, unsupported, or mix currencies. The fourth migration also removes public execute grants from the existing Supabase RLS event-trigger helper if that helper exists.

After migration, verify:

- `Category` and `Product` row counts and original IDs match the pre-migration backup.
- Every category and product belongs to `legacy-ilmio-brand`, and every product still references its original category.
- `legacy-ilmio-store` has login code `ilmio-main`; `legacy-ilmio-main` links it to the Il Mio brand and has a current published menu snapshot.
- Both legacy routes return the preserved catalog shape and are recorded in `LegacyRouteHit` during the integration test.
- Store ID login, menu sync, publishing, and ownership boundaries pass the local integration tests. Real Supabase Auth and tablet sign-in are verified after the production API deployment.

On the local restored copy, mark the baseline only after verifying it matches, apply the migrations, and test the migrated data. Back up the migrated local copy and rehearse restoring it to a separate empty local database before applying anything to production. The checker expects the post-migration `MenuVersion` table:

```sh
npm run db:backup -- /secure/path/ilmio-after.dump
RESTORE_DATABASE_URL='postgresql://…/ilmio_restore_local' npm run db:restore-check -- /secure/path/ilmio-after.dump
```

## 3. Deploy and bootstrap the Platform Admin on Ilmio-app

Configure the backend API environment in Vercel. `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` belong only in the backend project; never use them in the admin frontend or mobile app.

Required API values:

- `DATABASE_URL`
- `STORE_JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOOTSTRAP_PLATFORM_ADMIN_EMAIL`
- `ADMIN_INVITE_REDIRECT_URL`
- `ADMIN_ORIGINS`
- `TRUST_PROXY_HOPS`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` when uploads are enabled

Set `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` to the intended Super Admin’s confirmed Supabase Auth email. For the intended account already specified in this project, use `roobiinpandey@gmail.com`. Set the production value only during the production release window. Do not configure Preview with production credentials or use it to send test invites.

If the account does not exist in the selected Auth project, first dry-run and then send its setup email from the backend with that project's secrets loaded in the operator shell:

```sh
npm run admin:invite-platform
npm run admin:invite-platform -- --send-setup
```

Deploy the API and admin commit to `Ilmio-app` production only after the local production-copy migration and restore rehearsals pass. The confirmed user signs in; the first matching login creates the Platform Admin profile. Verify `/api/admin/me` reports `isPlatformAdmin: true`, then remove `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` from Production and redeploy.

## 4. Invite the Il Mio Brand Admin

Set `ILMIO_BRAND_ADMIN_EMAIL` to the existing Il Mio administrator email and use the `Ilmio-app` Supabase service-role key, publishable key, and database connection. Dry-run against the local restored rehearsal database first. Apply the script to production only after the database migration and API deployment; it creates/reuses the profile and `BRAND_ADMIN` membership and sends the setup or recovery email:

```sh
npm run admin:bootstrap-ilmio
npm run admin:bootstrap-ilmio -- --apply --send-setup
```

The script is idempotent for the matching account and brand. It stops if the profile is inactive or linked to a different Supabase user. It does not accept, store, or print a password. Confirm the administrator can sign in and manage only Il Mio before production rollout.

## 5. Initialize the Il Mio tablet login

Choose a unique store password of at least 20 characters and deliver it to the store operator through an approved password manager. Load it as `ILMIO_INITIAL_STORE_PASSWORD` in a protected operator shell. The script replaces only the one-time `!reset-required` migration placeholder with an Argon2id hash and refuses to overwrite an initialized password:

```sh
npm run store:init-ilmio
npm run store:init-ilmio -- --apply
```

The tablet signs in with Store ID `ilmio-main` and that password. The password itself is never printed or saved to the repository.

## 6. Build and test the APK

Rebuild the signed APK after the `Ilmio-app` production API has received the v4.2 deployment. The current candidate uses the default production endpoint and cannot sign in before that deployment:

```sh
cd ../mobile
flutter pub get
flutter test
flutter build apk --release --dart-define=API_BASE_URL=https://ilmio-app.vercel.app/api
```

The release APK is written to `mobile/build/app/outputs/flutter-apk/app-release.apk`. Verify the APK signature and version, then test on a tablet:

- One assigned published brand opens directly to its gallery.
- Multiple assigned brands show the brand selector and each menu stays scoped to its assignment.
- Wrong store credentials fail without exposing whether the Store ID exists.
- Token refresh and logout work; a revoked store session is rejected.
- Offline menu access works for up to 72 hours, then asks the device to reconnect.
- The legacy public routes remain pinned to Il Mio during the 30-day adoption window.

## 7. Ilmio-app production release

Only after the local production-copy migration rehearsal and separate restore rehearsal pass:

1. Take and verify a fresh production backup outside the workspace.
2. Confirm the production baseline status. The currently observed production schema matches the checked-in legacy baseline, but still verify migration history immediately before release.
3. Apply the reviewed baseline adoption, if needed, and migrations `202610300002_multi_owner_platform`, `202610300003_legacy_route_monitoring`, and `202610300004_revoke_public_rls_trigger` with `npm run prisma:deploy` from a controlled operator shell. Never run migrations as part of a Vercel build or startup.
4. Configure production API environment values and deploy the API/admin commit. Keep the legacy routes enabled and monitor the 30-day adoption report.
5. Set up the Platform Admin, invite the Il Mio Brand Admin, initialize the store password, and verify `/healthz`, `/api/admin/me`, `/api/auth/store/login`, and `/api/menu`.
6. Build the production APK against `https://ilmio-app.vercel.app/api` after the API is live, install it, and validate the flows above with the real Il Mio store credentials.

Do not retire `/api/categories` or `/api/products/available` until the 30-day monitoring gate is met and every managed tablet has moved to the authenticated app.
