const { AppError } = require('./errorHandler');

/**
 * Restrict access to specific roles
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager', 'employee')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user exists on request (set by protect middleware)
    if (!req.user) {
      return next(new AppError('User not authenticated', 401));
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
};

/**
 * Check if user is an admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

/**
 * Check if user is a manager or admin
 */
const isManagerOrAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
    return next(new AppError('Manager or Admin access required', 403));
  }
  next();
};

/**
 * Check if user belongs to the same company
 * Useful for ensuring users can only access data from their own company
 */
const sameCompany = (req, res, next) => {
  // This middleware should be used after data has been fetched
  // and req.resource.company_id is available
  if (req.resource && req.resource.company_id !== req.user.companyId) {
    return next(new AppError('Access denied: Different company', 403));
  }
  next();
};

/**
 * Check if user owns the resource or is an admin
 * @param {string} ownerField - The field name in req.params or req.resource that contains the owner ID
 */
const ownerOrAdmin = (ownerField = 'userId') => {
  return (req, res, next) => {
    const ownerId = req.resource ? req.resource[ownerField] : req.params[ownerField];
    
    if (req.user.role === 'admin' || req.user.id === ownerId) {
      return next();
    }

    return next(new AppError('You can only access your own resources', 403));
  };
};

module.exports = {
  restrictTo,
  isAdmin,
  isManagerOrAdmin,
  sameCompany,
  ownerOrAdmin,
};

