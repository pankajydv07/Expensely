const userService = require('../services/userService');
const { validationResult } = require('express-validator');

// Get all users in the company
const getUsers = async (req, res) => {
  try {
    const { company_id: companyId } = req.user;

    const users = await userService.getUsers(companyId);

    res.json({
      success: true,
      data: users,
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
};

// Get a single user by ID
const getUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { company_id: companyId } = req.user;

    const user = await userService.getUserById(userId, companyId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user,
      message: 'User retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

// Create a new user
const createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { company_id: companyId } = req.user;
    const userData = req.body;

    const newUser = await userService.createUser(userData, companyId);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Manager not found') || error.message.includes('Assigned manager')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id: userId } = req.params;
    const { company_id: companyId } = req.user;
    const userData = req.body;

    const updatedUser = await userService.updateUser(userId, userData, companyId);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Email already exists') {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Manager not found') || error.message.includes('Assigned manager')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

// Delete a user (soft delete)
const deleteUser = async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { company_id: companyId } = req.user;

    const deletedUser = await userService.deleteUser(userId, companyId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: deletedUser,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Cannot delete the last admin user') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Get available managers for assignment
const getManagers = async (req, res) => {
  try {
    const { company_id: companyId } = req.user;

    const managers = await userService.getAvailableManagers(companyId);

    res.json({
      success: true,
      data: managers,
      message: 'Managers retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting managers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get managers'
    });
  }
};

// Get user statistics for dashboard
const getUserStats = async (req, res) => {
  try {
    const { company_id: companyId } = req.user;

    const stats = await userService.getUserStats(companyId);

    res.json({
      success: true,
      data: stats,
      message: 'User statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user statistics'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getManagers,
  getUserStats,
};