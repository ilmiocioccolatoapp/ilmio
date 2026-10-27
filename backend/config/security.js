const cors = require('cors');

function adminOrigins(env = process.env) {
  // Preserve the admin origin established for this application. Additional
  // preview/custom domains must be listed explicitly, never matched by suffix.
  const configured = env.ADMIN_ORIGINS === undefined
    ? (env.NODE_ENV === 'production'
      ? 'https://ilmio-admin.vercel.app'
      : 'https://ilmio-admin.vercel.app,http://localhost:3000,http://127.0.0.1:3000')
    : env.ADMIN_ORIGINS;

  return new Set(configured.split(',').map(value => value.trim()).filter(Boolean).map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value || url.username || url.password ||
        (env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
      throw new Error('ADMIN_ORIGINS must contain exact origins; production origins must use HTTPS.');
    }
    return url.origin;
  }));
}

function corsMiddleware(env = process.env) {
  const allowed = adminOrigins(env);
  return cors({
    origin: (origin, callback) => callback(null, Boolean(origin && allowed.has(origin))),
    // Authentication uses an explicit bearer token, not ambient cookies.
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
}

function securityHeaders(req, res, next) {
  res.vary('Origin');
  res.set('Content-Security-Policy', "frame-ancestors 'none'");
  res.set('X-Frame-Options', 'DENY');
  next();
}

module.exports = { adminOrigins, corsMiddleware, securityHeaders };
