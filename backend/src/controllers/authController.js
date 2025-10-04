const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError } = require('../middlewares/errorHandler');
const { generateToken } = require('../middlewares/authMiddleware');

/**
 * @desc    Register new company and admin user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { companyName, countryCode, adminName, email, password } = req.body;

  // Create company and admin user
  const result = await authService.createCompanyWithAdmin({
    companyName,
    countryCode,
    adminName,
    email,
    password,
  });

  // Generate JWT token
  const token = generateToken(result.user.id);

  res.status(201).json({
    success: true,
    message: 'Company and admin user created successfully',
    data: {
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        companyId: result.user.company_id,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        currency: result.company.default_currency,
      },
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  const { email, password } = req.body;

  // Authenticate user
  const user = await authService.authenticateUser(email, password);

  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if user is active
  if (!user.is_active) {
    return next(new AppError('Your account has been deactivated', 401));
  }

  // Generate JWT token
  const token = generateToken(user.id);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        companyId: user.company_id,
      },
    },
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getCurrentUser = asyncHandler(async (req, res, next) => {
  const user = await authService.getUserById(req.user.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        companyId: user.company_id,
        companyName: user.company_name,
        companyCurrency: user.company_currency,
      },
    },
  });
});

/**
 * @desc    Forgot password - send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address', 400));
  }

  // TODO: Implement password reset token generation and email sending
  // For now, just return success message
  
  res.status(200).json({
    success: true,
    message: 'Password reset link sent to email (Feature coming soon)',
  });
});

/**
 * @desc    Reset password with token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res, next) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return next(new AppError('Please provide token and new password', 400));
  }

  // TODO: Implement password reset with token verification
  
  res.status(200).json({
    success: true,
    message: 'Password reset successful (Feature coming soon)',
  });
});

/**
 * @desc    Refresh JWT token
 * @route   POST /api/auth/refresh
 * @access  Public (requires refresh token)
 */
const refreshToken = asyncHandler(async (req, res, next) => {
  // TODO: Implement refresh token logic
  
  res.status(200).json({
    success: true,
    message: 'Token refresh (Feature coming soon)',
  });
});

module.exports = {
  signup,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  refreshToken,
};

