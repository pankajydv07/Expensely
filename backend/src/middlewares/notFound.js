/**
 * 404 Not Found middleware
 * Handles requests to undefined routes
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = { notFound };

