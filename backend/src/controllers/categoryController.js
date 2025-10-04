const db = require('../config/db');

// Get all categories for the user's company
const getCategories = async (req, res) => {
  try {
    const { company_id } = req.user;
    
    console.log('CategoryController: Getting categories for company_id:', company_id);
    
    const result = await db.query(
      'SELECT id, name FROM expense_categories WHERE company_id = $1 ORDER BY name',
      [company_id]
    );
    
    console.log('CategoryController: Found categories:', result.rows);
    
    res.json({
      success: true,
      data: result.rows,
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories'
    });
  }
};

// Add a new custom category
const addCategory = async (req, res) => {
  try {
    const { company_id, role_id } = req.user;
    const { name } = req.body;
    
    // Check if user is admin (only admins can add categories)
    if (role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can add new categories'
      });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }
    
    // Check if category already exists
    const existingCategory = await db.query(
      'SELECT id FROM expense_categories WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
      [company_id, name.trim()]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Category already exists'
      });
    }
    
    // Add the new category
    const result = await db.query(
      'INSERT INTO expense_categories (company_id, name) VALUES ($1, $2) RETURNING id, name',
      [company_id, name.trim()]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Category added successfully'
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add category'
    });
  }
};

// Update a category (admin only)
const updateCategory = async (req, res) => {
  try {
    const { company_id, role_id } = req.user;
    const { id } = req.params;
    const { name } = req.body;
    
    // Check if user is admin
    if (role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update categories'
      });
    }
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }
    
    // Check if category exists and belongs to the company
    const existingCategory = await db.query(
      'SELECT id FROM expense_categories WHERE id = $1 AND company_id = $2',
      [id, company_id]
    );
    
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Check if new name already exists (excluding current category)
    const duplicateName = await db.query(
      'SELECT id FROM expense_categories WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
      [company_id, name.trim(), id]
    );
    
    if (duplicateName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Category name already exists'
      });
    }
    
    // Update the category
    const result = await db.query(
      'UPDATE expense_categories SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND company_id = $3 RETURNING id, name',
      [name.trim(), id, company_id]
    );
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update category'
    });
  }
};

// Delete a category (admin only)
const deleteCategory = async (req, res) => {
  try {
    const { company_id, role_id } = req.user;
    const { id } = req.params;
    
    // Check if user is admin
    if (role_id !== 1) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete categories'
      });
    }
    
    // Check if category exists and belongs to the company
    const existingCategory = await db.query(
      'SELECT id FROM expense_categories WHERE id = $1 AND company_id = $2',
      [id, company_id]
    );
    
    if (existingCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }
    
    // Check if category is being used by any expenses
    const expensesUsingCategory = await db.query(
      'SELECT COUNT(*) as count FROM expenses WHERE category_id = $1',
      [id]
    );
    
    if (parseInt(expensesUsingCategory.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category that is being used by expenses'
      });
    }
    
    // Delete the category
    await db.query(
      'DELETE FROM expense_categories WHERE id = $1 AND company_id = $2',
      [id, company_id]
    );
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete category'
    });
  }
};

module.exports = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
};