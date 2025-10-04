import api from './api';

// Get all categories for the user's company
export const getCategories = async () => {
  try {
    const response = await api.get('/categories');
    return response.data;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
};

// Add a new category (admin only)
export const addCategory = async (categoryData) => {
  try {
    const response = await api.post('/categories', categoryData);
    return response.data;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

// Update a category (admin only)
export const updateCategory = async (categoryId, categoryData) => {
  try {
    const response = await api.put(`/categories/${categoryId}`, categoryData);
    return response.data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Delete a category (admin only)
export const deleteCategory = async (categoryId) => {
  try {
    const response = await api.delete(`/categories/${categoryId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

const categoryService = {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory
};

export default categoryService;