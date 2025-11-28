# Il Mio Cioccolato - Complete System

A full-stack application for Il Mio Cioccolato cafe featuring a Node.js backend, React admin panel, and Flutter mobile app.

## ⚠️ Security Notice

**IMPORTANT:** Never commit sensitive data to Git!

- `.env` files are gitignored
- Use `.env.example` as a template
- Never hardcode API keys, passwords, or secrets in code

## 🏗️ Project Structure

```
/Volumes/PERSONAL/ilmio/
├── backend/              # Node.js + Express + MongoDB API
├── admin/                # React.js Admin Panel
└── mobile/               # Flutter Mobile Gallery App
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- Flutter SDK (for mobile app)

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/ilmiocioccolatoapp/ilmio.git
cd ilmio
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm start
```

3. **Admin Panel Setup**
```bash
cd admin
npm install
npm start
```

4. **Mobile App Setup**
```bash
cd mobile
flutter pub get
flutter run
```

## 📦 Components

### 1. Backend API (Node.js + Express + MongoDB)
RESTful API for managing cafe products and categories.

**Features:**
- MongoDB Atlas database with Mongoose ODM
- CRUD operations for products and categories
- Dynamic category management
- Product availability toggle
- Image upload with Cloudinary
- Category-based product sorting
- CORS enabled
- Error handling and validation

**Tech Stack:**
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Multer (file uploads)
- Cloudinary (image hosting)

**Environment Variables Required:**
```
PORT=5001
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Admin Panel (React.js)
Modern admin interface for product and category management.

**Features:**
- Dashboard with statistics
- Add/Edit/Delete products
- Category management (create, edit, delete, reorder)
- Toggle product availability
- Dynamic category filtering
- Image upload (10MB limit)
- Form validation
- Responsive design

**Tech Stack:**
- React 18
- Axios
- CSS3 (Flexbox/Grid)
- Functional components with Hooks

### 3. Mobile Gallery App (Flutter)
Swipeable product gallery for customers.

**Features:**
- PageView gallery with smooth animations
- Cached network images
- Loading and error states
- Category badges
- Beautiful card-based UI
- Responsive design

**Tech Stack:**
- Flutter 3.x
- Provider (state management)
- HTTP package
- Cached Network Image

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- MongoDB (v5+)
- Flutter SDK (v3+)
- npm or yarn

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ilmiocioccolato
NODE_ENV=development
```

Start MongoDB and run the server:
```bash
# Start MongoDB (if not running)
mongod

# Run backend
npm run dev
```

Backend will run on `http://localhost:5001`

### 2. Admin Panel Setup

```bash
cd admin
npm install
npm start
```

Admin panel will open at `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd mobile
flutter pub get
```

**Configure API endpoint** in `lib/utils/constants.dart`:
- Android Emulator: `http://10.0.2.2:5001/api`
- iOS Simulator: `http://localhost:5001/api`
- Physical Device: `http://YOUR_IP:5001/api`

Run the app:
```bash
flutter run
```

Build APK:
```bash
flutter build apk --release
```

## 🎨 Design Specifications

**Color Scheme:**
- Primary: Chocolate Brown (#8B4513)
- Dark Brown: #5C3D2E
- Gold Accent: #D4A55C

**Typography:**
- Font: Segoe UI / System Default

**Design Principles:**
- Clean, professional aesthetic
- Mobile-first responsive design
- Smooth animations and transitions
- Consistent branding across platforms

## 📡 API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/available` - Get available products only
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PATCH /api/products/:id/toggle` - Toggle availability

### Product Model
```javascript
{
  title: String,
  category: String (pastries|drinks|desserts|specialties),
  image: String (URL),
  description: String,
  ingredients: String,
  price: String (€X.XX format),
  available: Boolean,
  timestamps: true
}
```

## 🔧 Development Workflow

1. **Start MongoDB**
2. **Run Backend** (`npm run dev` in backend/)
3. **Run Admin Panel** (`npm start` in admin/)
4. **Run Mobile App** (`flutter run` in mobile/)

## 📱 Building for Production

### Backend
```bash
cd backend
npm start
```

### Admin Panel
```bash
cd admin
npm run build
# Deploy the build/ folder to your hosting service
```

### Mobile App
```bash
cd mobile
# Android
flutter build apk --release

# iOS
flutter build ios --release
```

## 🛠️ Troubleshooting

### Backend Issues
- Ensure MongoDB is running
- Check port 5001 is not in use
- Verify `.env` configuration

### Admin Panel Issues
- Clear browser cache
- Check backend is running
- Verify API URL in `src/services/api.js`

### Mobile App Issues
- Run `flutter clean && flutter pub get`
- Check API endpoint configuration
- For Android emulator, use `10.0.2.2` instead of `localhost`
- Ensure backend allows CORS from all origins

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ilmiocioccolato
NODE_ENV=development
```

### Admin Panel
API URL configured in `src/services/api.js`:
```javascript
const API_URL = 'http://localhost:5001/api';
```

### Mobile App
API URL configured in `lib/utils/constants.dart`:
```dart
static const String baseUrl = 'http://10.0.2.2:5001/api';
```

## 🔐 Security Considerations

- Add authentication/authorization for admin panel
- Implement rate limiting on API
- Validate and sanitize all inputs
- Use environment variables for sensitive data
- Enable HTTPS in production
- Implement proper error handling

## 📄 License

This project is created for Il Mio Cioccolato cafe.

## 🤝 Support

For issues or questions, please refer to individual README files in each component directory:
- [Backend README](backend/README.md)
- [Admin Panel README](admin/README.md)
- [Mobile App README](mobile/README.md)

---

**Built with ❤️ and ☕ for Il Mio Cioccolato**
