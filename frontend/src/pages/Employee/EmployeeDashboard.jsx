import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Add,
  Receipt,
  PendingActions,
  CheckCircle,
  Cancel,
  FilterList,
} from '@mui/icons-material';
import { logout } from '../../store/authSlice';
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  submitExpense,
  deleteExpense,
  setFilters,
} from '../../store/expenseSlice';
import { ExpenseTable, ExpenseForm } from '../../components/expense';

const EmployeeDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { expenses, loading, error, filters } = useSelector((state) => state.expense);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0);

  // Load expenses on mount
  useEffect(() => {
    dispatch(fetchExpenses());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNewExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingExpense) {
        await dispatch(updateExpense({ id: editingExpense.id, data: formData })).unwrap();
        setSnackbar({ open: true, message: 'Expense updated successfully!', severity: 'success' });
      } else {
        await dispatch(createExpense(formData)).unwrap();
        setSnackbar({ open: true, message: 'Expense created successfully!', severity: 'success' });
      }
      setShowForm(false);
      setEditingExpense(null);
      dispatch(fetchExpenses());
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'An error occurred', severity: 'error' });
    }
  };

  const handleSubmitExpense = async (expense) => {
    try {
      await dispatch(submitExpense(expense.id)).unwrap();
      setSnackbar({ open: true, message: 'Expense submitted for approval!', severity: 'success' });
      dispatch(fetchExpenses());
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to submit expense', severity: 'error' });
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (window.confirm(`Are you sure you want to delete "${expense.title}"?`)) {
      try {
        await dispatch(deleteExpense(expense.id)).unwrap();
        setSnackbar({ open: true, message: 'Expense deleted successfully!', severity: 'success' });
        dispatch(fetchExpenses());
      } catch (err) {
        setSnackbar({ open: true, message: err.message || 'Failed to delete expense', severity: 'error' });
      }
    }
  };

  const handleViewExpense = (expense) => {
    // For now, just open in edit mode
    // Later can create a dedicated view page
    handleEditExpense(expense);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Update filters based on tab
    const statusMap = {
      0: null, // All
      1: 'draft',
      2: 'waiting_approval',
      3: 'approved',
      4: 'rejected',
    };
    dispatch(setFilters({ ...filters, status: statusMap[newValue] }));
  };

  const handleFilterChange = (filterType, value) => {
    dispatch(setFilters({ ...filters, [filterType]: value }));
  };

  // Filter expenses based on current filters
  const filteredExpenses = expenses.filter((expense) => {
    if (filters.status && expense.status !== filters.status) return false;
    if (filters.category_id && expense.category_id !== filters.category_id) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        expense.title?.toLowerCase().includes(searchLower) ||
        expense.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: expenses.length,
    draft: expenses.filter((e) => e.status === 'draft').length,
    pending: expenses.filter((e) => e.status === 'waiting_approval').length,
    approved: expenses.filter((e) => e.status === 'approved').length,
    rejected: expenses.filter((e) => e.status === 'rejected').length,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" fontWeight="600">
          Expensely - Employee Dashboard
        </Typography>
        <Box>
          <Typography variant="body2" sx={{ mr: 2, display: 'inline' }}>
            {user?.name} ({user?.role})
          </Typography>
          <Button variant="outlined" color="inherit" size="small" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Receipt color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.total}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Total Expenses
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Receipt color="action" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.draft}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Draft
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PendingActions color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.pending}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.approved}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Approved
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Cancel color="error" sx={{ mr: 1 }} />
                  <Typography variant="h6">{stats.rejected}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Rejected
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4" fontWeight="600">
            My Expenses
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
            <Button variant="contained" startIcon={<Add />} size="large" onClick={handleNewExpense}>
              New Expense
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {showFilters && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Search"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search by title or description"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="waiting_approval">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`All (${stats.total})`} />
            <Tab label={`Draft (${stats.draft})`} />
            <Tab label={`Pending (${stats.pending})`} />
            <Tab label={`Approved (${stats.approved})`} />
            <Tab label={`Rejected (${stats.rejected})`} />
          </Tabs>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch({ type: 'expense/clearError' })}>
            {error}
          </Alert>
        )}

        {/* Expenses Table */}
        <ExpenseTable
          expenses={filteredExpenses}
          isLoading={loading}
          onView={handleViewExpense}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          onSubmit={handleSubmitExpense}
        />
      </Container>

      {/* Create/Edit Expense Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingExpense ? 'Edit Expense' : 'Create New Expense'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <ExpenseForm
              initialData={editingExpense}
              onSubmit={handleFormSubmit}
              onCancel={() => setShowForm(false)}
              submitLabel={editingExpense ? 'Update Expense' : 'Create Expense'}
            />
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeeDashboard;

