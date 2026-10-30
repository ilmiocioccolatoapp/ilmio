# Il Mio v4.2 Go-Live Checklist

This runbook covers the first migration from the single-brand Il Mio schema to the multi-store platform, the two administrator roles, and the Store ID login used by tablets.

## Release readiness

- [x] The local migration chain includes a legacy baseline, Il Mio data backfill, and legacy-route adoption monitoring.
- [x] The live legacy `Category` and `Product` schema was checked read-only against the baseline. Columns, defaults, indexes, foreign key, and RLS flags match.
- [x] The live catalog currently has 8 categories and 19 products; all product prices pass the migration format check, and products have valid legacy category references.
- [x] The Flutter flow uses Store ID and password, skips brand choice for one assigned menu, shows a selector for multiple menus, stores tokens with `flutter_secure_storage`, and expires offline access after 72 hours.
- [x] A release migration removes direct Data API execute access from the existing Supabase `public.rls_auto_enable()` SECURITY DEFINER helper, if present, without removing its event trigger.
- [x] A signed version `2.1.0+9` APK candidate was compiled at `mobile/build/app/outputs/flutter-apk/app-release.apk`. This first artifact uses the current production API URL and cannot complete the v4.2 login flow until the API migration/deployment is live; rebuild it against the isolated staging API before tablet login testing.
- [ ] Isolated staging Postgres, Supabase Auth, and Vercel Preview settings are not configured yet. Current Preview settings point to production services. Do not run database migrations or invite/bootstrap scripts against Preview until that is corrected.
- [ ] Production migration, account setup, and store password initialization have not been run.

## 1. Prepare isolated staging

1. Create or designate a staging Postgres database and Supabase Auth project that contain no customer data. Do not use either existing Il Mio production project as a disposable database. If using a Supabase database branch, check its current quoted cost and confirm it before creating it.
2. For both Vercel projects (`ilmio-app` rooted at `backend/` and `ilmio-admin` rooted at `admin/`), remove production secrets from Preview and configure Preview with staging-only values. Do not test a Preview deployment until `DATABASE_URL`, `SUPABASE_URL`, publishable key, and service-role key resolve to staging.
3. Configure a staging `STORE_JWT_SECRET` with at least 32 random bytes, `ADMIN_ORIGINS` with the exact staging admin origin, `ADMIN_INVITE_REDIRECT_URL` with the staging `/set-password` route, and the required Cloudinary values if image upload is in scope.
4. Configure Supabase Auth email delivery and add the staging password-setup redirect URL to its allowed redirect URLs. Ensure test operators can access the Vercel Preview deployment. A Vercel SSO-protected preview cannot be used directly by the tablet APK.
5. Enable leaked-password protection in Supabase Auth before sending setup emails. The current production project advisor reports that this setting is disabled.

## 2. Back up and migrate staging

Use a protected operator shell or secret manager for connection strings. Do not put secrets in this repository, command history, or the APK.

```sh
cd backend
npm ci
npm run db:backup -- /secure/path/ilmio-staging-before.dump
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
- Both legacy routes return the preserved catalog shape and are recorded in `LegacyRouteHit`.
- Admin sign-in, password setup, Store ID login, menu sync, brand publishing, and image upload work against staging.

Back up the migrated staging database and rehearse restoring it to a separate empty database before production. The checker expects the post-migration `MenuVersion` table:

```sh
npm run db:backup -- /secure/path/ilmio-staging-after.dump
RESTORE_DATABASE_URL='postgresql://…/ilmio_restore_staging' npm run db:restore-check -- /secure/path/ilmio-staging-after.dump
```

## 3. Deploy and bootstrap the Platform Admin

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

Set `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` to the intended Super Admin’s confirmed Supabase Auth email. For the intended account already specified in this project, use `roobiinpandey@gmail.com`. Preview and staging must use staging Supabase Auth; set the production value only during the production release window.

If the account does not exist in the selected Auth project, first dry-run and then send its setup email from the backend with that project's secrets loaded in the operator shell:

```sh
npm run admin:invite-platform
npm run admin:invite-platform -- --send-setup
```

Deploy the API and admin commit to staging. The confirmed user signs in; the first matching login creates the Platform Admin profile. Verify `/api/admin/me` reports `isPlatformAdmin: true`, then remove `BOOTSTRAP_PLATFORM_ADMIN_EMAIL` from that environment and redeploy.

## 4. Invite the Il Mio Brand Admin

Set `ILMIO_BRAND_ADMIN_EMAIL` to the existing Il Mio administrator email and use the staging Supabase service-role key, staging publishable key, and staging database connection. Dry-run first, then create/reuse the profile and `BRAND_ADMIN` membership and send the Supabase setup or recovery email:

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

Build against the unprotected staging API URL. Do not use the default production endpoint until the production API has received the v4.2 deployment:

```sh
cd ../mobile
flutter pub get
flutter test
flutter build apk --release --dart-define=API_BASE_URL=https://staging-api.example.com/api
```

The release APK is written to `mobile/build/app/outputs/flutter-apk/app-release.apk`. Verify the APK signature and version, then test on a tablet:

- One assigned published brand opens directly to its gallery.
- Multiple assigned brands show the brand selector and each menu stays scoped to its assignment.
- Wrong store credentials fail without exposing whether the Store ID exists.
- Token refresh and logout work; a revoked store session is rejected.
- Offline menu access works for up to 72 hours, then asks the device to reconnect.
- The legacy public routes remain pinned to Il Mio during the 30-day adoption window.

## 7. Production release

Only after staging smoke tests and the separate restore rehearsal pass:

1. Take and verify a fresh production backup outside the workspace.
2. Confirm the production baseline status. The currently observed production schema matches the checked-in legacy baseline, but still verify migration history immediately before release.
3. Apply the reviewed baseline adoption, if needed, and migrations `202610300002_multi_owner_platform`, `202610300003_legacy_route_monitoring`, and `202610300004_revoke_public_rls_trigger` with `npm run prisma:deploy` from a controlled operator shell. Never run migrations as part of a Vercel build or startup.
4. Configure production API environment values and deploy the API/admin commit. Keep the legacy routes enabled and monitor the 30-day adoption report.
5. Set up the Platform Admin, invite the Il Mio Brand Admin, initialize the store password, and verify `/healthz`, `/api/admin/me`, `/api/auth/store/login`, and `/api/menu`.
6. Build the production APK against `https://ilmio-app.vercel.app/api` after the API is live, install it, and validate the flows above with the real Il Mio store credentials.

Do not retire `/api/categories` or `/api/products/available` until the 30-day monitoring gate is met and every managed tablet has moved to the authenticated app.
