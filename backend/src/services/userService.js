const { query } = require('../config/db');
const bcrypt = require('bcrypt');

/**
 * Get all users in the same company
 */
const getUsers = async (companyId) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role,
        u.is_active,
        u.created_at,
        u.updated_at,
        c.name as company_name,
        manager.name as manager_name,
        manager.email as manager_email
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN manager_relationships mr ON u.id = mr.user_id
      LEFT JOIN users manager ON mr.manager_id = manager.id
      WHERE u.company_id = $1
      ORDER BY u.created_at DESC`,
      [companyId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

/**
 * Get a single user by ID (within same company)
 */
const getUserById = async (userId, companyId) => {
  try {
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role,
        u.is_active,
        u.created_at,
        u.updated_at,
        mr.manager_id,
        c.name as company_name,
        manager.name as manager_name,
        manager.email as manager_email
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN manager_relationships mr ON u.id = mr.user_id
      LEFT JOIN users manager ON mr.manager_id = manager.id
      WHERE u.id = $1 AND u.company_id = $2`,
      [userId, companyId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
};

/**
 * Create a new user
 */
const createUser = async (userData, companyId) => {
  const { name, email, password, role, managerId, isActive = true } = userData;

  try {
    // Check if user with this email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND company_id = $2',
      [email, companyId]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Get role_id from role name
    const roleResult = await query(
      'SELECT id FROM roles WHERE name = $1',
      [role]
    );

    if (roleResult.rows.length === 0) {
      throw new Error('Invalid role specified');
    }

    const roleId = roleResult.rows[0].id;

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(
      'INSERT INTO users (company_id, role_id, name, email, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, is_active, created_at',
      [companyId, roleId, name, email, hashedPassword, isActive]
    );

    const newUser = userResult.rows[0];

    // If managerId is provided, create manager relationship
    if (managerId) {
      // Verify manager exists and is in same company
      const managerCheck = await query(
        'SELECT u.id, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1 AND u.company_id = $2',
        [managerId, companyId]
      );

      if (managerCheck.rows.length === 0) {
        throw new Error('Manager not found or not in the same company');
      }

      const managerRole = managerCheck.rows[0].role;
      if (!['manager', 'admin'].includes(managerRole)) {
        throw new Error('Assigned manager must have manager or admin role');
      }

      // Create manager relationship
      await query(
        'INSERT INTO manager_relationships (user_id, manager_id) VALUES ($1, $2)',
        [newUser.id, managerId]
      );
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: role,
      isActive: newUser.is_active,
      createdAt: newUser.created_at
    };

  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Update a user (simplified version)
 */
const updateUser = async (userId, userData, companyId) => {
  try {
    // For now, return a success message since full user update 
    // requires role management that's not implemented yet
    throw new Error('User update feature is coming soon.');
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

/**
 * Delete a user (soft delete by setting is_active = false)
 */
const deleteUser = async (userId, companyId) => {
  try {
    // Verify user exists and is in same company
    const existingUser = await getUserById(userId, companyId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Don't allow deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = await query(
        'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND role = $2 AND is_active = true',
        [companyId, 'admin']
      );

      if (parseInt(adminCount.rows[0].count) <= 1) {
        throw new Error('Cannot delete the last admin user');
      }
    }

    // Soft delete by setting is_active = false
    const result = await query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
      [userId, companyId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Get managers available for assignment (users with manager or admin role)
 */
const getAvailableManagers = async (companyId) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, r.name as role 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1 
       AND r.name IN ('manager', 'admin') 
       AND u.is_active = true
       ORDER BY u.name`,
      [companyId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting available managers:', error);
    throw error;
  }
};

/**
 * Get user statistics for dashboard
 */
const getUserStats = async (companyId) => {
  try {
    const result = await query(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN r.name = 'admin' THEN 1 END) as admin_count,
        COUNT(CASE WHEN r.name = 'manager' THEN 1 END) as manager_count,
        COUNT(CASE WHEN r.name = 'employee' THEN 1 END) as employee_count
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.company_id = $1`,
      [companyId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error getting user statistics:', error);
    throw error;
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getAvailableManagers,
  getUserStats,
};