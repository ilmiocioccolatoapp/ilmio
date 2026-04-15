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
```

## Database Setup

Generate Prisma client and apply schema:

```bash
npm run prisma:generate
npm run prisma:push
```

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
- `GET /api/products` - Get all products
- `GET /api/products/available` - Get available products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/toggle` - Toggle availability

## Technologies
- Node.js
- Express.js
- PostgreSQL
- Prisma
- Multer
- CORS
- dotenv
