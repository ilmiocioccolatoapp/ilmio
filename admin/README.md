# Il Mio Cioccolato - Web Admin Panel

## Description
React-based admin panel for managing Il Mio Cioccolato cafe products.

## Features
- Dashboard with statistics
- Product management (CRUD operations)
- Category filtering
- Availability toggle
- Responsive design

## Installation

```bash
npm install
```

## Configuration

Create `admin/.env.local` with the public admin configuration:

```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The publishable key is intended for browser use. Never put a Supabase secret or
service-role key in the admin app. The API checks every admin request against
Supabase Auth and allows only the addresses listed by `SUPABASE_ADMIN_EMAILS`
on the backend.

For production, set these `REACT_APP_*` values in the admin hosting provider
before building the site. The API URL should point to the deployed backend.

## Running the Application

```bash
npm start
```

The application will open at `http://localhost:3000`

## Build for Production

```bash
npm run build
```

## Technologies Used
- React 18
- Axios
- CSS3 with Flexbox/Grid
- Functional Components with Hooks
