# Backend Administrative Scripts

This directory contains standalone, manual administrative and database maintenance scripts for the menu platform. These scripts are run intentionally on-demand by administrators and developers; they are not imported or executed by the runtime web server.

## Il Mio v4.2 cutover

The data backfill is part of the transactional Prisma migration `202610300002_multi_owner_platform`; it creates the legacy Il Mio organization, brand, store, assignment, and first menu snapshot while preserving the existing Category and Product IDs and fields. The migration refuses unsupported prices before changing ownership.

After the migration is rehearsed on staging:

- `npm run admin:invite-platform -- --send-setup` sends a Supabase invite or password setup email for `BOOTSTRAP_PLATFORM_ADMIN_EMAIL`. The first confirmed sign-in creates the Platform Admin profile; remove that variable after verifying `/api/admin/me`.
- Set `ILMIO_BRAND_ADMIN_EMAIL` to the existing Il Mio admin email and run `npm run admin:bootstrap-ilmio -- --apply --send-setup`. This creates or reuses the brand membership and sends the appropriate Supabase invite/recovery email. It never accepts or logs a password.
- Set `ILMIO_INITIAL_STORE_PASSWORD` in a secure operator shell and run `npm run store:init-ilmio -- --apply`. This replaces only the migration placeholder with an Argon2 hash for store login code `ilmio-main`. The script refuses to overwrite an initialized password and never prints the value.

All three commands are operator actions. Do not run them against production before the backup, staging migration, smoke test, and restore rehearsal in `DEPLOYMENT.md` have passed.

---

## Script Inventory

### Duplicate brand reconciliation

`npm run brands:reconcile-duplicates` is report-only by default. It lists normalized duplicate brand names with their owner IDs and related-record counts. Review the report and choose the canonical ID explicitly before applying a merge:

```bash
npm run brands:reconcile-duplicates -- --apply --canonical <canonical-brand-id> --duplicates <duplicate-id,duplicate-id>
```

The script loads `backend/.env`, migrates brand administrator memberships, store assignments, categories, assets, and audit-log references in one transaction, then removes the selected duplicate brands. It refuses to merge across owners or currencies, when products or store overrides exist, when category codes collide, or when assignments would collide. Those cases require a reviewed manual migration. Take a backup and rehearse against a restored staging database before using `--apply`; never run this command against production without the approved backup and restore checks.

### Duplicate organization reconciliation

`npm run orgs:reconcile-duplicates` reports organizations with the same normalized name and their brand, store, and membership counts. It does not merge anything unless the canonical organization and duplicate IDs are both explicitly supplied:

```bash
npm run orgs:reconcile-duplicates -- --apply --canonical <canonical-organization-id> --duplicates <duplicate-id,duplicate-id>
```

The merge migrates organization memberships, brands, stores, and audit-log references in one transaction. It refuses differing names/statuses, colliding brand/store slugs, or conflicting membership roles. Review the report and take/rehearse a database backup before applying. This script has not been run on production data.

### 1. `seed.js`
- **Purpose**: Populates the database with initial categories and chocolate cafe menu products (croissants, hot chocolate, desserts, etc.) including English descriptions, ingredients, and starting prices.
- **Execution**:
  ```bash
  node backend/scripts/seed.js
  ```

### 2. `seed_categories.js`
- **Purpose**: Resets and re-seeds the `Category` table with standard categories: Pastries, Drinks, Desserts, and Specialties.
- **Execution**:
  ```bash
  node backend/scripts/seed_categories.js
  ```

### 3. `sync_categories.js`
- **Purpose**: Upserts the standard categories into PostgreSQL without deleting existing data, ensuring all category IDs, names, icons, and order rankings exist.
- **Execution**:
  ```bash
  node backend/scripts/sync_categories.js
  ```

### 4. `update_prices.js`
- **Purpose**: Batch updates product prices in the database from EUR to AED currency values for standard menu items.
- **Execution**:
  ```bash
  node backend/scripts/update_prices.js
  ```

---

## Configuration Note
These utilities require database access configured via `DATABASE_URL` in the `backend/.env` file. Each script loads environment variables relative to `backend/.env` upon execution.
