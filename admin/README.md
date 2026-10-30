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

Platform Admins create brands and invite Brand Admins from **Brands**. Invitees receive a Supabase email and set their own password at `/set-password`. Organization Admins manage stores, assignments, passwords, and tablet sessions. Brand Admins manage their assigned catalogs, branding, overrides, and publication.

For tablet access, open **Stores & owners**, choose the store's owner, then select a store card. Its Store ID, password status, and assigned brand menus are shown inside the branch details. Use **Set/Reset tablet password** to create a password of at least 6 characters; existing passwords cannot be retrieved. Use **Manage branch menu** for local price/availability overrides and publish them to that branch's tablet. Product details and new items are managed in the shared brand catalog.

Deploy from the `admin` root directory using Vercel. Configure `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` as build environment variables. See [deployment](../DEPLOYMENT.md).
