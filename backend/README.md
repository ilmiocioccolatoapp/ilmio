# Il Mio Cioccolato Backend

Backend API for Il Mio Cioccolato cafe management system.

## Features
- RESTful API with Express.js
- PostgreSQL database via Prisma
- Product CRUD operations
- Availability toggle
- File upload support
- CORS enabled
- Error handling

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file in the backend directory:
```env
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/ilmiocioccolato
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_ADMIN_EMAILS=admin@example.com
```

## Database Setup

Generate Prisma client and apply schema:

```bash
npm run prisma:generate
npm run prisma:push
```

## Admin authentication

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_ADMIN_EMAILS` in the backend `.env` file. The allowlist contains the
email address of the Supabase user you created; multiple authorized users can
be comma-separated. The backend verifies every admin access token with
Supabase Auth and does not use or need a service-role key. Configure these
values in the production backend host's environment settings as well.

## Running the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Products
- `GET /api/products` - Get all products (admin sign-in required)
- `GET /api/products/available` - Get available products
- `POST /api/products` - Create product (admin sign-in required)
- `PUT /api/products/:id` - Update product (admin sign-in required)
- `DELETE /api/products/:id` - Delete product (admin sign-in required)
- `PATCH /api/products/:id/toggle` - Toggle availability (admin sign-in required)

### Authentication
- `GET /api/auth/me` - Validate the signed-in admin session
- Category changes and image-upload signing also require an authorized admin session.

## Technologies
- Node.js
- Express.js
- PostgreSQL
- Prisma
- Multer
- CORS
- dotenv
