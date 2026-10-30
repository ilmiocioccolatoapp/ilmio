# Menu platform admin

React admin console for Platform Admin, Organization Admin, and Brand Admin roles.

## Local development

Create `admin/.env.local` with the browser-safe values:

```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```sh
npm ci
npm start
```

The browser uses only a Supabase publishable key. The service-role key belongs in the backend environment only. API authorization is enforced by verified Supabase identity and database memberships; hiding a control in this app is not a substitute for server-side role checks.

Platform Admins land on **Stores**, which lists stores across all owner organizations. Use **Create store** at the top right to add a store, select its owner, and optionally assign a brand menu. Click a store card to manage its menu items, categories, and tablet login. **Brands** lists every brand with its slug and owner, and provides brand editing, safe deletion for brands without dependent records, branch management, creation, and Brand Admin invitations. Adding a branch from a brand creates the store and brand assignment atomically. Invitees receive a Supabase email and set their own password at `/set-password`. Organization Admins manage stores, assignments, passwords, and tablet sessions. Brand Admins manage their assigned catalogs, branding, overrides, and publication.

Inside a Platform Admin store, **Menu items** and **Categories** edit the shared brand catalog. **Store availability & publishing** controls branch-specific prices and availability, and publishes changes to that tablet. In **Tablet login**, the Store ID is visible and editable; passwords show only whether one is set. Reset a forgotten password with a new one of at least 6 characters. Existing passwords cannot be retrieved.

Deploy from the `admin` root directory using Vercel. Configure `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` as build environment variables. See [deployment](../DEPLOYMENT.md).
