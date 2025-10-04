import api from './api';

const expenseService = {
  // Get all expenses with optional filters
  getExpenses: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const queryString = params.toString();
    const url = queryString ? `/expenses?${queryString}` : '/expenses';
    
    const response = await api.get(url);
    return response.data;
  },

  // Get single expense by ID
  getExpense: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  // Create new expense
  createExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },

  // Update expense
  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  // Delete expense
  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  // Submit expense for approval
  submitExpense: async (id) => {
    const response = await api.post(`/expenses/${id}/submit`);
    return response.data;
  },

  // Get expense categories
  getCategories: async () => {
    const response = await api.get('/expenses/categories');
    return response.data;
  },

  // Upload attachments (TODO: implement multipart/form-data)
  uploadAttachment: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/expenses/${id}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default expenseService;

