# Menu platform API

Express API for the multi-brand, multi-store menu platform. PostgreSQL is accessed through Prisma. Supabase Auth protects admin routes; store tablets use signed store sessions and read immutable published menu snapshots.

## Local development

```sh
npm ci
cp .env.example .env
npm run prisma:generate
npm start
```

Set `DATABASE_URL`, `STORE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the Cloudinary values in the local environment. Admin invitation routes also require the server-only `SUPABASE_SERVICE_ROLE_KEY`. Do not put that key in the React app or commit it.

## Database changes

Use checked-in migrations. To apply them locally or to a controlled staging/production database:

```sh
npm run prisma:deploy
```

Production releases must follow the backup, staging, and restore rehearsal in the repository’s [deployment guide](../DEPLOYMENT.md). Never run `prisma db push` in production or from server startup.

The integration harness creates a disposable local PostgreSQL cluster, applies the full migration chain, and runs tenant/session acceptance checks:

```sh
npm run test:integration
```

## Legacy route adoption

`GET /api/categories` and `GET /api/products/available` are temporary, pinned reads. Their requests are persisted for the 30-day retirement gate:

```sh
npm run legacy:adoption-report
```

See [the adoption gate](../docs/LEGACY_ADOPTION.md) before removing either route.
