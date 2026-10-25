const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');

// Load env vars
dotenv.config();

// Connect to database (non-blocking for serverless)
connectDB().catch((err) => {
  console.error('DB connection error:', err.message);
});

const app = express();

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware - allow local + Vercel preview/production
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3000',
      'https://ilmioadmin.onrender.com',
      'https://ilmio-admin.onrender.com',
      'https://ilmio-admin.vercel.app',
      'https://ilmio-app.vercel.app',
      'https://ilmiocioccolato.vercel.app'
    ];
    if (!origin || allowed.includes(origin) || /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // open for now; tighten later
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Static folder for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));

// Tablet app version. Menu data does not need this — only new APK builds.
app.get('/api/app-version', (req, res) => {
  let manifest = {
    version: '1.0.1',
    build: 2,
    apkUrl: '',
    notes: ''
  };
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'app-version.json'), 'utf8');
    manifest = { ...manifest, ...JSON.parse(raw) };
  } catch (err) {
    console.error('app-version.json unreadable:', err.message);
  }
  if (process.env.APP_VERSION) manifest.version = process.env.APP_VERSION;
  if (process.env.APP_BUILD) manifest.build = Number(process.env.APP_BUILD);
  if (process.env.APP_APK_URL) manifest.apkUrl = process.env.APP_APK_URL;

  res.json({ success: true, data: manifest });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Il Mio Cioccolato API',
    version: '1.0.0',
    endpoints: {
      products: '/api/products',
      availableProducts: '/api/products/available',
      categories: '/api/categories',
      appVersion: '/api/app-version'
    }
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB'
    });
  }

  if (err.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Only listen when not running on Vercel serverless
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
