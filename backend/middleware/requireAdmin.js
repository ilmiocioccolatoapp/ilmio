const { createClient } = require('@supabase/supabase-js');
const { logError } = require('../utils/errors');

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const adminEmails = new Set(
  (process.env.SUPABASE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    })
  : null;

async function requireAdmin(req, res, next) {
  // Prevent browsers and shared caches from retaining protected responses,
  // including configuration/authentication errors.
  res.set('Cache-Control', 'no-store');
  if (!supabase || adminEmails.size === 0) {
    console.error('Admin authentication is missing Supabase or admin email configuration.');
    return res.status(503).json({
      success: false,
      error: 'Admin authentication is not configured on the server.'
    });
  }

  const authorization = req.get('Authorization') || '';
  const tokenMatch = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!tokenMatch) {
    return res.status(401).json({
      success: false,
      error: 'Sign in is required.'
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(tokenMatch[1]);
    if (error) {
      if ([400, 401, 403].includes(error.status)) {
        return res.status(401).json({
          success: false,
          error: 'Your session is invalid or expired. Please sign in again.'
        });
      }

      logError('Supabase token verification failed', error);
      return res.status(503).json({
        success: false,
        error: 'Could not verify your session. Please try again.'
      });
    }

    const user = data.user;
    if (!user?.email || !adminEmails.has(user.email.toLowerCase())) {
      return res.status(403).json({
        success: false,
        error: 'This Supabase account is not authorized to use the admin panel.'
      });
    }

    req.adminUser = { id: user.id, email: user.email };
    return next();
  } catch (error) {
    logError('Supabase token verification request failed', error);
    return res.status(503).json({
      success: false,
      error: 'Could not verify your session. Please try again.'
    });
  }
}

module.exports = requireAdmin;
