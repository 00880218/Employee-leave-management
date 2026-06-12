const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'leaveflow_jwt_secret_token_change_in_production';

/**
 * Middleware to verify user JWT token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No authorization header provided.' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token format must be Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/**
 * Middleware to check if user has manager role
 */
function requireManager(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Access denied. Managers only.' });
  }

  next();
}

module.exports = {
  verifyToken,
  requireManager,
};
