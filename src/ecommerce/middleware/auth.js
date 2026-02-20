/**
 * requireAdminKey middleware
 * Checks for a valid ADMIN_API_KEY in the Authorization header.
 * Usage: Authorization: Bearer <ADMIN_API_KEY>
 */
function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    // If no key is configured, block access in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'Admin access not configured' });
    }
    return next(); // allow in dev/test when not set
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== adminKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { requireAdminKey };
