import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expenseService from '../services/expenseService';

const initialState = {
  expenses: [],
  categories: [],
  currentExpense: null,
  isLoading: false,
  error: null,
  filters: {
    status: '',
    categoryId: '',
    startDate: '',
    endDate: '',
  },
};

// Async thunks
export const fetchExpenses = createAsyncThunk(
  'expenses/fetchExpenses',
  async (filters, { rejectWithValue }) => {
    try {
      const response = await expenseService.getExpenses(filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to fetch expenses'
      );
    }
  }
);

export const fetchExpense = createAsyncThunk(
  'expenses/fetchExpense',
  async (id, { rejectWithValue }) => {
    try {
      const response = await expenseService.getExpense(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to fetch expense'
      );
    }
  }
);

export const createExpense = createAsyncThunk(
  'expenses/createExpense',
  async (expenseData, { rejectWithValue }) => {
    try {
      const response = await expenseService.createExpense(expenseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to create expense'
      );
    }
  }
);

export const updateExpense = createAsyncThunk(
  'expenses/updateExpense',
  async ({ id, expenseData }, { rejectWithValue }) => {
    try {
      const response = await expenseService.updateExpense(id, expenseData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to update expense'
      );
    }
  }
);

export const deleteExpense = createAsyncThunk(
  'expenses/deleteExpense',
  async (id, { rejectWithValue }) => {
    try {
      await expenseService.deleteExpense(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to delete expense'
      );
    }
  }
);

export const submitExpense = createAsyncThunk(
  'expenses/submitExpense',
  async (id, { rejectWithValue }) => {
    try {
      await expenseService.submitExpense(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to submit expense'
      );
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'expenses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await expenseService.getCategories();
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Failed to fetch categories'
      );
    }
  }
);

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentExpense: (state) => {
      state.currentExpense = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch expenses
      .addCase(fetchExpenses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch single expense
      .addCase(fetchExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExpense = action.payload;
      })
      .addCase(fetchExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create expense
      .addCase(createExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses.unshift(action.payload);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update expense
      .addCase(updateExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.expenses.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Delete expense
      .addCase(deleteExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.expenses = state.expenses.filter((e) => e.id !== action.payload);
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Submit expense
      .addCase(submitExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        const expense = state.expenses.find((e) => e.id === action.payload);
        if (expense) {
          expense.status = 'waiting_approval';
        }
      })
      .addCase(submitExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch categories
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      });
  },
});

export const { setFilters, clearFilters, clearError, clearCurrentExpense } = expenseSlice.actions;
export default expenseSlice.reducer;

