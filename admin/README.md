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

Platform Admins have three simple sections: **Dashboard**, **Store management**, and **Brand management**. The Dashboard lists tablet devices with a recent check-in and active stores without a recent device check-in; status refreshes automatically. A device is considered online when it checked in within the last 10 minutes. Store management lists store cards; open one to manage menu items, categories, per-store availability and publishing, connected devices, and tablet ID/password. Brand management lists brand cards, including their name, code, and owner, and supports adding and editing brands. Duplicate organization names are disambiguated in the UI and rejected for new organizations; use the documented report-first reconciliation command to merge existing duplicate records. Invitees receive a Supabase email and set their own password at `/set-password`. Organization Admins manage stores, assignments, passwords, and tablet sessions. Brand Admins manage their assigned catalogs, branding, overrides, and publication.

Inside a Platform Admin store, **Menu items** and **Categories** edit the shared brand catalog. **Store availability & publishing** controls branch-specific prices and availability, and publishes changes to that tablet. In **Tablet login**, the Store ID is visible and editable; passwords show only whether one is set. Reset a forgotten password with a new one of at least 6 characters. Existing passwords cannot be retrieved.

Deploy from the `admin` root directory using Vercel. Configure `REACT_APP_API_URL`, `REACT_APP_SUPABASE_URL`, and `REACT_APP_SUPABASE_PUBLISHABLE_KEY` as build environment variables. See [deployment](../DEPLOYMENT.md).
