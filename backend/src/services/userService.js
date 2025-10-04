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
 * Update a user
 */
const updateUser = async (userId, userData, companyId) => {
  try {
    console.log('🔄 UserService: Updating user', userId, 'with data:', userData);

    // Verify user exists and is in same company
    const existingUser = await getUserById(userId, companyId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Build dynamic query based on provided fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (userData.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      updateValues.push(userData.name);
      paramIndex++;
    }

    if (userData.email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await query(
        'SELECT id FROM users WHERE email = $1 AND company_id = $2 AND id != $3',
        [userData.email, companyId, userId]
      );

      if (emailCheck.rows.length > 0) {
        throw new Error('Email is already in use');
      }

      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(userData.email);
      paramIndex++;
    }

    if (userData.password !== undefined) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      updateFields.push(`password_hash = $${paramIndex}`);
      updateValues.push(hashedPassword);
      paramIndex++;
    }

    if (userData.role !== undefined) {
      // Get role ID
      const roleResult = await query(
        'SELECT id FROM roles WHERE name = $1',
        [userData.role]
      );

      if (roleResult.rows.length === 0) {
        throw new Error('Invalid role');
      }

      updateFields.push(`role_id = $${paramIndex}`);
      updateValues.push(roleResult.rows[0].id);
      paramIndex++;
    }

    if (userData.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(userData.isActive);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    // Add WHERE clause parameters
    updateValues.push(userId, companyId);
    
    // Construct and execute update query
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex} AND company_id = $${paramIndex + 1}
      RETURNING id, name, email, is_active, created_at, updated_at
    `;

    console.log('🔄 UserService: Executing update query:', updateQuery);
    console.log('🔄 UserService: Update values:', updateValues);

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      throw new Error('User not found or update failed');
    }

    // Handle manager relationship if provided
    if (userData.managerId !== undefined) {
      // First, remove existing manager relationship
      await query(
        'DELETE FROM manager_relationships WHERE user_id = $1',
        [userId]
      );

      // Add new manager relationship if managerId is provided
      if (userData.managerId) {
        await query(
          'INSERT INTO manager_relationships (user_id, manager_id) VALUES ($1, $2)',
          [userId, userData.managerId]
        );
      }
    }

    // Return updated user with role information
    const updatedUser = await getUserById(userId, companyId);
    console.log('✅ UserService: User updated successfully:', updatedUser);

    return updatedUser;
  } catch (error) {
    console.error('❌ UserService: Error updating user:', error);
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