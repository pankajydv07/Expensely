const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { AppError } = require('./errorHandler');
const { asyncHandler } = require('./errorHandler');

/**
 * Protect routes - verify JWT token
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      `SELECT u.id, u.name, u.email, u.company_id, u.role_id, u.is_active, r.name as role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('User no longer exists', 401));
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return next(new AppError('User account has been deactivated', 401));
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.company_id,
      roleId: user.role_id,
      role: user.role_name,
    };

    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
});

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

module.exports = {
  protect,
  generateToken,
  generateRefreshToken,
};

