# Backend Administrative Scripts

This directory contains standalone, manual administrative and database maintenance scripts for the Il Mio Cioccolato backend. These scripts are run intentionally on-demand by administrators and developers; they are not imported or executed by the runtime web server.

---

## Script Inventory

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
