# Il Mio Cioccolato - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technologies Used](#technologies-used)
4. [Project Structure](#project-structure)
5. [Backend API](#backend-api)
6. [Admin Panel](#admin-panel)
7. [Mobile Application](#mobile-application)
8. [Database Schema](#database-schema)
9. [API Documentation](#api-documentation)
10. [Deployment](#deployment)
11. [Environment Variables](#environment-variables)
12. [Development Setup](#development-setup)

---

## 📖 Project Overview

**Il Mio Cioccolato** is a complete cafe management system consisting of three main components:
- **Backend API**: RESTful API built with Node.js and Express
- **Admin Panel**: React-based web application for product management
- **Mobile App**: Flutter-based mobile gallery application

### Purpose
This system enables Il Mio Cioccolato cafe to:
- Manage product catalog with categories
- Handle product availability in real-time
- Display products to customers through mobile app
- Upload and manage product images
- Track product analytics and statistics

---

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│  Mobile App     │         │   Admin Panel   │
│  (Flutter)      │         │   (React.js)    │
│                 │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │    HTTP/REST API          │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │             │
              │  Backend    │
              │  (Node.js)  │
              │             │
              └──────┬──────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐         ┌──────▼──────┐
    │ PostgreSQL  │         │ Cloudinary  │
    │  Atlas   │         │   (Images)  │
    └──────────┘         └─────────────┘
```

### Deployment Architecture
- **Backend**: Render.com (Web Service)
- **Admin Panel**: Render.com (Static Site)
- **Mobile App**: Android/iOS (via App Stores)
- **Database**: Render PostgreSQL (Cloud)
- **Images**: Cloudinary (CDN)

---

## 💻 Technologies Used

### Backend Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 16+ | Runtime environment |
| **Express.js** | ^4.18.2 | Web framework |
| **PostgreSQL** | - | NoSQL database |
| **Prisma** | ^8.0.0 | PostgreSQL ODM |
| **CORS** | ^2.8.5 | Cross-origin resource sharing |
| **dotenv** | ^16.3.1 | Environment variable management |
| **Multer** | ^1.4.5-lts.1 | File upload middleware |
| **Cloudinary** | ^1.41.3 | Cloud image storage |
| **multer-storage-cloudinary** | ^4.0.0 | Cloudinary storage engine |
| **Nodemon** | ^3.0.1 | Development auto-reload |

### Admin Panel Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | ^18.2.0 | UI library |
| **React DOM** | ^18.2.0 | React rendering |
| **React Scripts** | 5.0.1 | Build tooling |
| **Axios** | ^1.6.0 | HTTP client |
| **CSS3** | - | Styling |

### Mobile App Technologies
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Flutter** | SDK 3.0.0+ | Mobile framework |
| **Dart** | 3.0.0+ | Programming language |
| **HTTP** | ^1.1.0 | HTTP requests |
| **Provider** | ^6.1.1 | State management |
| **Cached Network Image** | ^3.3.0 | Image caching |
| **Flutter SpinKit** | ^5.2.0 | Loading indicators |
| **Flutter Launcher Icons** | ^0.13.1 | App icon generation |

### Development & Deployment Tools
- **Git/GitHub**: Version control
- **Render.com**: Cloud hosting platform
- **Render PostgreSQL**: Cloud database
- **Cloudinary**: Image CDN
- **VS Code**: Primary IDE
- **Postman**: API testing

---

## 📁 Project Structure

```
/Volumes/PERSONAL/ilmio/
│
├── backend/                      # Node.js Backend API
│   ├── config/
│   │   └── database.js          # PostgreSQL connection config
│   ├── controllers/
│   │   ├── categoryController.js # Category business logic
│   │   └── productController.js  # Product business logic
│   ├── middleware/
│   │   └── upload.js            # Multer & Cloudinary config
│   ├── models/
│   │   ├── Category.js          # Category schema
│   │   └── Product.js           # Product schema
│   ├── routes/
│   │   ├── categoryRoutes.js    # Category API routes
│   │   └── productRoutes.js     # Product API routes
│   ├── uploads/                 # Local upload directory
│   ├── package.json             # Dependencies
│   ├── server.js                # Entry point
│   ├── seed.js                  # Database seeder
│   ├── seed_categories.js       # Category seeder
│   ├── sync_categories.js       # Category sync utility
│   ├── update_prices.js         # Price update utility
│   └── README.md
│
├── admin/                        # React Admin Panel
│   ├── public/
│   │   └── index.html           # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Analytics.js     # Analytics dashboard
│   │   │   ├── Categories.js    # Category management
│   │   │   ├── Dashboard.js     # Main dashboard
│   │   │   ├── ProductForm.js   # Add/Edit product form
│   │   │   ├── ProductList.js   # Product listing
│   │   │   └── Settings.js      # Settings page
│   │   ├── services/
│   │   │   └── api.js           # API service layer
│   │   ├── styles/
│   │   │   └── App.css          # Global styles
│   │   ├── App.js               # Main component
│   │   └── index.js             # Entry point
│   ├── package.json
│   └── README.md
│
├── mobile/                       # Flutter Mobile App
│   ├── android/                 # Android platform files
│   ├── ios/                     # iOS platform files
│   ├── lib/
│   │   ├── main.dart            # Entry point
│   │   ├── models/              # Data models
│   │   ├── screens/             # UI screens
│   │   │   └── gallery_screen.dart
│   │   ├── services/            # API services
│   │   ├── utils/               # Utilities & constants
│   │   └── widgets/             # Reusable widgets
│   ├── assets/
│   │   ├── icons/               # App icons
│   │   └── images/              # App images
│   ├── pubspec.yaml             # Dependencies
│   ├── analysis_options.yaml    # Linter config
│   └── README.md
│
├── postgres_data/                # Local PostgreSQL data (dev)
├── scripts/
│   └── keep-alive.sh            # Render keep-alive script
│
├── render.yaml                   # Render deployment config
├── README.md                     # Main documentation
├── DEPLOYMENT.md                 # Deployment guide
└── DEPLOYMENT_CHECKLIST.md       # Pre-deployment checks
```

---

## 🔧 Backend API

### Overview
RESTful API built with Node.js and Express.js, handling all business logic, data persistence, and file uploads.

### Key Features
- ✅ RESTful API architecture
- ✅ Render PostgreSQL integration
- ✅ CRUD operations for products and categories
- ✅ Dynamic category management with ordering
- ✅ Product availability toggle
- ✅ Image upload to Cloudinary
- ✅ Category-based product filtering
- ✅ CORS enabled for cross-origin requests
- ✅ Comprehensive error handling
- ✅ Input validation
- ✅ File size and type validation (max 10MB)

### Main Dependencies
```json
{
  "express": "^4.18.2",
  "Prisma": "^8.0.0",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "multer": "^1.4.5-lts.1",
  "cloudinary": "^1.41.3",
  "multer-storage-cloudinary": "^4.0.0"
}
```

### Server Configuration
- **Port**: 5001 (configurable via environment)
- **Environment**: Development/Production
- **CORS Origins**: localhost:3000, ilmioadmin.onrender.com
- **Max File Size**: 10MB
- **Allowed File Types**: Images only (JPEG, PNG, GIF, WebP)

### Middleware Stack
1. **Body Parser**: JSON & URL-encoded (10MB limit)
2. **CORS**: Cross-origin resource sharing
3. **Static Files**: /uploads directory
4. **Routes**: Product & Category routes
5. **Error Handler**: Global error handling
6. **404 Handler**: Unknown route handling

---

## 🎨 Admin Panel

### Overview
Modern, responsive React-based web application for managing cafe products and categories.

### Key Features
- ✅ Dashboard with real-time statistics
- ✅ Product management (Add, Edit, Delete)
- ✅ Category management (Create, Edit, Delete, Reorder)
- ✅ Product availability toggle
- ✅ Image upload with preview
- ✅ Search and filter products
- ✅ Sort by category, price, availability
- ✅ Responsive design (mobile-friendly)
- ✅ Analytics view
- ✅ Settings page

### Components Structure
```
Admin Panel Components
├── Dashboard.js          # Statistics & overview
├── ProductList.js        # Product grid with actions
├── ProductForm.js        # Add/Edit product form
├── Categories.js         # Category CRUD & reordering
├── Analytics.js          # Product analytics
└── Settings.js           # Configuration settings
```

### UI Features
- **Dashboard Cards**: Total products, categories, available items
- **Product Grid**: Responsive card layout
- **Quick Actions**: Toggle availability, edit, delete
- **Category Pills**: Visual category selection
- **Form Validation**: Client-side validation
- **Image Preview**: Before upload confirmation
- **Loading States**: Spinner indicators
- **Error Messages**: User-friendly error handling

### API Integration
```javascript
// services/api.js
const API_URL = 'http://localhost:5001/api'; // Development
// const API_URL = 'https://ilmiobackend.onrender.com/api'; // Production

// Axios instance with default configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});
```

---

## 📱 Mobile Application

### Overview
Flutter-based mobile gallery app for customers to browse cafe products.

### Key Features
- ✅ Product gallery with grid layout
- ✅ Category-based filtering
- ✅ Product detail view
- ✅ Image caching for performance
- ✅ Loading animations
- ✅ Pull-to-refresh functionality
- ✅ Responsive design (portrait & landscape)
- ✅ Cross-platform (Android & iOS)
- ✅ Material Design 3

### Technical Details
```yaml
# pubspec.yaml
name: il_mio_cioccolato
version: 1.0.1+2
sdk: '>=3.0.0 <4.0.0'
```

### Dependencies
```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0                    # HTTP requests
  provider: ^6.1.1                # State management
  cached_network_image: ^3.3.0    # Image caching
  flutter_spinkit: ^5.2.0         # Loading indicators

dev_dependencies:
  flutter_lints: ^3.0.0           # Code linting
  flutter_launcher_icons: ^0.13.1 # Icon generation
```

### App Structure
```
lib/
├── main.dart               # Entry point & app configuration
├── models/                 # Data models (Product, Category)
├── screens/                # UI screens
│   └── gallery_screen.dart # Main gallery view
├── services/               # API services
├── utils/                  # Constants & utilities
└── widgets/                # Reusable UI components
```

### Color Scheme
- **Primary Color**: Brown (#8B4513)
- **Secondary/Accent**: Gold
- **Background**: Light theme
- **App Bar**: Brown with white text

### Platform Support
- **Android**: MinSDK 21+ (Android 5.0+)
- **iOS**: iOS 12.0+
- **Orientations**: Portrait & Landscape

---

## 🗄️ Database Schema

### PostgreSQL Collections

#### Products Collection
```javascript
{
  _id: ObjectId,
  title: String,              // Product name (max 100 chars)
  category: String,           // Category identifier
  image: String,              // Cloudinary URL
  description: String,        // Product description (max 500 chars)
  ingredients: String,        // Ingredient list
  price: String,              // Format: "AED X.XX" or "€X.XX"
  available: Boolean,         // Availability status (default: true)
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-updated
}
```

**Validation Rules**:
- `title`: Required, trimmed, max 100 characters
- `category`: Required, trimmed
- `image`: Required, valid URL
- `description`: Required, max 500 characters
- `ingredients`: Required
- `price`: Required, matches regex `/^(AED|€)\s?\d+\.\d{2}$/`
- `available`: Boolean, default true

**Indexes**:
- Primary: `_id`
- Custom: None (small dataset)

#### Categories Collection
```javascript
{
  _id: ObjectId,
  id: String,                 // Unique category identifier (lowercase)
  name: String,               // Display name (max 50 chars)
  icon: String,               // Emoji icon (default: 📦)
  order: Number,              // Display order (default: 0)
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-updated
}
```

**Validation Rules**:
- `id`: Required, unique, trimmed, lowercase
- `name`: Required, trimmed, max 50 characters
- `icon`: Required, default '📦'
- `order`: Number, default 0

**Indexes**:
- Primary: `_id`
- Unique: `id`

### Sample Data

**Product Example**:
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "title": "Dark Chocolate Truffle",
  "category": "chocolates",
  "image": "https://res.cloudinary.com/xxx/image/upload/v123/products/truffle.jpg",
  "description": "Rich dark chocolate truffle with a smooth ganache center",
  "ingredients": "Dark chocolate (70% cocoa), cream, butter, cocoa powder",
  "price": "AED 15.00",
  "available": true,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Category Example**:
```json
{
  "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "id": "chocolates",
  "name": "Chocolates",
  "icon": "🍫",
  "order": 1,
  "createdAt": "2024-01-10T09:00:00.000Z",
  "updatedAt": "2024-01-10T09:00:00.000Z"
}
```

---

## 🔌 API Documentation

### Base URL
- **Development**: `http://localhost:5001/api`
- **Production**: `https://ilmiobackend.onrender.com/api`

### Authentication
Currently, no authentication is required (public API).

### Products Endpoints

#### Get All Products
```http
GET /api/products
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "Dark Chocolate Truffle",
      "category": "chocolates",
      "image": "https://cloudinary.com/.../truffle.jpg",
      "description": "Rich dark chocolate truffle",
      "ingredients": "Dark chocolate, cream, butter",
      "price": "AED 15.00",
      "available": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Get Available Products Only
```http
GET /api/products/available
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 8,
  "data": [ /* available products only */ ]
}
```

#### Get Single Product
```http
GET /api/products/:id
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": { /* product object */ }
}
```

#### Create Product
```http
POST /api/products
Content-Type: multipart/form-data
```

**Request Body**:
```
title: "New Product"
category: "chocolates"
description: "Product description"
ingredients: "Ingredient list"
price: "AED 20.00"
available: true
image: [file]
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": { /* created product */ }
}
```

#### Update Product
```http
PUT /api/products/:id
Content-Type: multipart/form-data
```

**Request Body**: Same as Create (all fields optional)

**Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated product */ }
}
```

#### Delete Product
```http
DELETE /api/products/:id
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {}
}
```

#### Toggle Product Availability
```http
PATCH /api/products/:id/toggle
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "available": false
  }
}
```

### Categories Endpoints

#### Get All Categories
```http
GET /api/categories
```

**Response** (200 OK):
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "id": "chocolates",
      "name": "Chocolates",
      "icon": "🍫",
      "order": 1
    }
  ]
}
```

#### Create Category
```http
POST /api/categories
Content-Type: application/json
```

**Request Body**:
```json
{
  "id": "pastries",
  "name": "Pastries",
  "icon": "🥐",
  "order": 5
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": { /* created category */ }
}
```

#### Update Category
```http
PUT /api/categories/:id
Content-Type: application/json
```

**Request Body**:
```json
{
  "name": "Updated Name",
  "icon": "🎂",
  "order": 3
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": { /* updated category */ }
}
```

#### Delete Category
```http
DELETE /api/categories/:id
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {}
}
```

#### Update Category Order
```http
PATCH /api/categories/reorder
Content-Type: application/json
```

**Request Body**:
```json
{
  "categories": [
    { "id": "chocolates", "order": 1 },
    { "id": "cakes", "order": 2 },
    { "id": "drinks", "order": 3 }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Category order updated successfully"
}
```

### Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Validation error message"
}
```

**404 Not Found**:
```json
{
  "success": false,
  "error": "Resource not found"
}
```

**500 Internal Server Error**:
```json
{
  "success": false,
  "error": "Server Error"
}
```

---

## 🚀 Deployment

### Deployment Platform: Render.com

#### Backend Service
- **Type**: Web Service
- **Environment**: Node.js
- **Region**: Singapore
- **Plan**: Free Tier
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Auto-Deploy**: Yes (on git push)
- **Health Check**: Root path `/`

#### Admin Panel Service
- **Type**: Static Site
- **Environment**: Static
- **Region**: Singapore
- **Plan**: Free Tier
- **Build Command**: `cd admin && npm install && npm run build`
- **Publish Directory**: `admin/build`
- **Routes**: SPA rewrite (/* → /index.html)

### Deployment Configuration (render.yaml)
```yaml
services:
  # Backend API
  - type: web
    name: ilmio-backend
    env: node
    region: singapore
    plan: free
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm start
    healthCheckPath: /
    
  # Admin Panel
  - type: web
    name: ilmio-admin
    env: static
    region: singapore
    plan: free
    buildCommand: cd admin && npm install && npm run build
    staticPublishPath: admin/build
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

### Deployment Workflow
1. **Code Changes**: Developer commits to GitHub
2. **Git Push**: Push to main branch
3. **Auto-Deploy**: Render detects changes
4. **Build**: Both services build automatically
5. **Deploy**: Live deployment with zero downtime
6. **Health Check**: Automatic health monitoring

### URLs
- **Backend API**: `https://ilmiobackend.onrender.com`
- **Admin Panel**: `https://ilmioadmin.onrender.com`

---

## 🔐 Environment Variables

### Backend Environment Variables

**Required Variables**:
```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Render PostgreSQL
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<db-name>

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Example (.env.example)**:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/ilmiocioccolato
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Admin Panel Environment Variables

**Required Variables**:
```env
# API URL
REACT_APP_API_URL=https://ilmiobackend.onrender.com/api
```

**Development**:
```env
REACT_APP_API_URL=http://localhost:5001/api
```

### Mobile App Configuration

**API Endpoint** (hardcoded in app):
```dart
// lib/services/api_service.dart
static const String baseUrl = 'https://ilmiobackend.onrender.com/api';
```

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v16 or higher
- **npm**: v8 or higher
- **PostgreSQL**: Local or Atlas account
- **Cloudinary**: Account with API credentials
- **Flutter**: SDK 3.0.0 or higher (for mobile)
- **Git**: For version control

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Create environment file**:
```bash
cp .env.example .env
```

4. **Update .env with your credentials**:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/ilmiocioccolato
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

5. **Seed database (optional)**:
```bash
node seed.js           # Seed products
node seed_categories.js # Seed categories
```

6. **Start development server**:
```bash
npm run dev    # With nodemon (auto-reload)
# OR
npm start      # Without auto-reload
```

**Server runs at**: `http://localhost:5001`

### Admin Panel Setup

1. **Navigate to admin directory**:
```bash
cd admin
```

2. **Install dependencies**:
```bash
npm install
```

3. **Update API URL** (if needed):
```javascript
// src/services/api.js
const API_URL = 'http://localhost:5001/api';
```

4. **Start development server**:
```bash
npm start
```

**App opens at**: `http://localhost:3000`

### Mobile App Setup

1. **Navigate to mobile directory**:
```bash
cd mobile
```

2. **Install Flutter dependencies**:
```bash
flutter pub get
```

3. **Update API URL**:
```dart
// lib/services/api_service.dart
static const String baseUrl = 'http://YOUR_LOCAL_IP:5001/api';
// Note: Use your computer's local IP, not localhost
```

4. **Run app**:
```bash
# List available devices
flutter devices

# Run on specific device
flutter run -d <device-id>

# Run in debug mode
flutter run

# Run in release mode
flutter run --release
```

5. **Generate app icons** (if changed):
```bash
flutter pub run flutter_launcher_icons:main
```

### Local PostgreSQL Setup (Optional)

**Using Docker**:
```bash
docker run -d -p 5432:5432 --name postgres -e POSTGRES_PASSWORD=postgres postgres:16
```

**Using local installation**:
```bash
# macOS
brew install postgresql
brew services start postgresql

# Linux
sudo systemctl start mongod

# Windows
# Start PostgreSQL service from Services panel
```

### Development Tips

**Backend**:
- Use Postman/Insomnia for API testing
- Check `server.js` logs for debugging
- PostgreSQL Compass for database visualization
- Nodemon auto-restarts on file changes

**Admin Panel**:
- React DevTools for component debugging
- Browser console for errors
- Network tab for API call monitoring
- Hot reload enabled by default

**Mobile App**:
- Flutter DevTools for debugging
- Hot reload: Press `r` in terminal
- Hot restart: Press `R` in terminal
- Use Android Studio/Xcode for emulators

---

## 📊 Additional Information

### Security Considerations
- ⚠️ No authentication implemented (suitable for internal use)
- ⚠️ CORS configured for specific origins
- ✅ File type validation for uploads
- ✅ File size limits enforced (10MB)
- ✅ Environment variables for secrets
- ⚠️ PostgreSQL connection string should use strong password

### Performance Optimizations
- **Backend**: Connection pooling with Prisma
- **Admin**: React lazy loading (can be implemented)
- **Mobile**: Image caching with cached_network_image
- **Database**: Indexes on frequently queried fields
- **CDN**: Cloudinary for image delivery

### Known Limitations
- No user authentication/authorization
- Single role (admin) for web panel
- No real-time updates (polling required)
- Limited error recovery in mobile app
- No offline support in mobile app

### Future Enhancements
- [ ] User authentication & authorization
- [ ] Real-time updates with WebSockets
- [ ] Order management system
- [ ] Customer reviews & ratings
- [ ] Inventory management
- [ ] Sales analytics & reports
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Offline mode for mobile
- [ ] Payment integration

### Support & Maintenance
- **Code Repository**: GitHub (private)
- **Deployment Platform**: Render.com
- **Database**: Render PostgreSQL
- **CDN**: Cloudinary
- **Monitoring**: Render built-in monitoring

### Version History
- **v1.0.1**: Current stable version
  - Mobile app with gallery view
  - Admin panel with category management
  - Backend API with Cloudinary integration
  
- **v1.0.0**: Initial release
  - Basic CRUD operations
  - Product management
  - Simple admin panel

---

## 📝 License & Credits

**Project**: Il Mio Cioccolato  
**Type**: Cafe Management System  
**License**: Proprietary  
**Year**: 2024-2026  

**Technologies & Libraries**:
- Node.js & Express.js
- React.js
- Flutter & Dart
- PostgreSQL & Prisma
- Cloudinary
- Render.com

---

**Last Updated**: January 31, 2026  
**Documentation Version**: 1.0.0
