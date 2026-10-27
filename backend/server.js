const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/database');
const { corsMiddleware, securityHeaders } = require('./config/security');
const { logError, errorHandler } = require('./utils/errors');

// Load env vars
dotenv.config();

// Connect to database (non-blocking for serverless)
connectDB().catch((err) => {
  logError('Database startup failed', err);
});

const app = express();

app.use(securityHeaders);
app.use(corsMiddleware());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
    logError('App version manifest could not be read', err);
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

app.use(errorHandler);

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
