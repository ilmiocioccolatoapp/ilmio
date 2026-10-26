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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/uploads', require('./routes/uploadRoutes'));

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

app.get('/', (req, res) => {
  res.json({
    message: 'Il Mio Cioccolato API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth/me',
      products: '/api/products',
      availableProducts: '/api/products/available',
      categories: '/api/categories',
      uploads: '/api/uploads/sign',
      appVersion: '/api/app-version'
    }
  });
});

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

module.exports = app;
