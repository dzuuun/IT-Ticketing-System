const { verifyAccessToken } = require('./jwt');
const { query } = require('../db/index');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    // Fetch user from DB to ensure still active
    const users = await query(
      `SELECT u.id, u.email, u.full_name, u.id_number, u.role, u.department_id,
              d.name AS department_name, u.phone, u.is_active
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (!users || users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'User account not found or disabled.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('[Auth Middleware Error]:', error);
    return res.status(500).json({ success: false, message: 'Authentication server error.' });
  }
}

// Optional authentication for guest tracking / semi-public actions
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.userId) {
        const users = await query(
          `SELECT u.id, u.email, u.full_name, u.id_number, u.role, u.department_id,
                  d.name AS department_name, u.phone
           FROM users u LEFT JOIN departments d ON d.id = u.department_id
           WHERE u.id = ?`,
          [decoded.userId]
        );
        if (users && users.length > 0) {
          req.user = users[0];
        }
      }
    }
    next();
  } catch (err) {
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please sign in.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' does not have permission to access this resource.`,
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
};
