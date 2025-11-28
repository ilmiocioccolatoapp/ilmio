# Il Mio Cioccolato Backend

Backend API for Il Mio Cioccolato cafe management system.

## Features
- RESTful API with Express.js
- MongoDB database with Mongoose
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
MONGODB_URI=mongodb://localhost:27017/ilmiocioccolato
NODE_ENV=development
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

## Product Schema

```javascript
{
  title: String (required, max 100 chars),
  category: String (required, enum: pastries|drinks|desserts|specialties),
  image: String (required, URL),
  description: String (required, max 500 chars),
  ingredients: String (required),
  price: String (required, format: €X.XX),
  available: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## Technologies
- Node.js
- Express.js
- MongoDB
- Mongoose
- Multer
- CORS
- dotenv
