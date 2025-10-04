const bcrypt = require('bcrypt');
const { query, transaction } = require('../config/db');
const { AppError } = require('../middlewares/errorHandler');
const countryApiClient = require('../integrations/countryApiClient');

/**
 * Hash password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Create company and admin user
 */
const createCompanyWithAdmin = async ({ companyName, countryCode, adminName, email, password }) => {
  // Get currency for country
  const currency = await countryApiClient.getCurrencyForCountry(countryCode);

  if (!currency) {
    throw new AppError('Invalid country code', 400);
  }

  // Use transaction to ensure atomicity
  const result = await transaction(async (client) => {
    // 1. Check if company name already exists
    const existingCompany = await client.query(
      'SELECT id FROM companies WHERE name = $1',
      [companyName]
    );

    if (existingCompany.rows.length > 0) {
      throw new AppError('Company name already exists', 400);
    }

    // 2. Create company
    const companyResult = await client.query(
      `INSERT INTO companies (name, country_code, default_currency)
       VALUES ($1, $2, $3)
       RETURNING id, name, country_code, default_currency`,
      [companyName, countryCode, currency]
    );

    const company = companyResult.rows[0];

    // 3. Check if email already exists for this company
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 400);
    }

    // 4. Hash password
    const hashedPassword = await hashPassword(password);

    // 5. Get admin role ID
    const roleResult = await client.query(
      "SELECT id FROM roles WHERE name = 'admin'"
    );
    const adminRoleId = roleResult.rows[0].id;

    // 6. Create admin user
    const userResult = await client.query(
      `INSERT INTO users (company_id, role_id, name, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, company_id, role_id, name, email, is_active`,
      [company.id, adminRoleId, adminName, email, hashedPassword]
    );

    const user = userResult.rows[0];

    // 7. Create default expense categories
    const defaultCategories = [
      'Travel',
      'Meals & Entertainment',
      'Office Supplies',
      'Software & Subscriptions',
      'Training & Education',
      'Miscellaneous',
    ];

    for (const category of defaultCategories) {
      await client.query(
        'INSERT INTO expense_categories (company_id, name) VALUES ($1, $2)',
        [company.id, category]
      );
    }

    // 8. Create audit log
    await client.query(
      `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        company.id,
        user.id,
        'COMPANY_CREATED',
        'company',
        company.id.toString(),
        JSON.stringify({ companyName, adminName }),
      ]
    );

    return {
      company,
      user: {
        ...user,
        role: 'admin',
      },
    };
  });

  return result;
};

/**
 * Authenticate user with email and password
 */
const authenticateUser = async (email, password) => {
  // Get user with role information
  const result = await query(
    `SELECT u.id, u.company_id, u.role_id, u.name, u.email, u.password_hash, 
            u.is_active, r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];

  // Compare password
  const isMatch = await comparePassword(password, user.password_hash);

  if (!isMatch) {
    return null;
  }

  // Create audit log
  await query(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.company_id, user.id, 'USER_LOGIN', 'user', user.id]
  );

  // Remove password hash from response
  delete user.password_hash;

  return user;
};

/**
 * Get user by ID with company information
 */
const getUserById = async (userId) => {
  const result = await query(
    `SELECT u.id, u.company_id, u.role_id, u.name, u.email, u.is_active,
            r.name as role_name, c.name as company_name, c.default_currency as company_currency
     FROM users u
     JOIN roles r ON u.role_id = r.id
     JOIN companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  const result = await query(
    `SELECT u.id, u.company_id, u.role_id, u.name, u.email, u.is_active,
            r.name as role_name
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
};

module.exports = {
  hashPassword,
  comparePassword,
  createCompanyWithAdmin,
  authenticateUser,
  getUserById,
  getUserByEmail,
};

