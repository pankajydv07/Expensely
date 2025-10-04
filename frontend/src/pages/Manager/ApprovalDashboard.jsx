import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Avatar,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Visibility,
  Comment,
  Timeline,
  FilterList,
  TrendingUp,
  PendingActions,
  Assessment,
  Settings,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';

const ApprovalDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState('');
  const [comments, setComments] = useState('');
  const [filters, setFilters] = useState({
    status: 'waiting_approval',
    dateRange: 'all',
    amountRange: 'all',
  });
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    fetchExpenses();
    fetchStats();
  }, [filters]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/approval/expenses', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
      });

      if (response.data.success) {
        setExpenses(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/approval/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleApproval = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `/api/approval/expenses/${selectedExpense.id}/${approvalAction}`,
        { comments },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh data
      fetchExpenses();
      fetchStats();
      
      // Close dialog
      setApprovalDialog(false);
      setSelectedExpense(null);
      setComments('');
      setApprovalAction('');
    } catch (error) {
      console.error('Approval action failed:', error);
    }
  };

  const openApprovalDialog = (expense, action) => {
    setSelectedExpense(expense);
    setApprovalAction(action);
    setApprovalDialog(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting_approval': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'waiting_approval': return <PendingActions />;
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      default: return <Timeline />;
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const tabLabels = [
    { label: 'Pending Approval', value: 'waiting_approval' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {user?.role === 'admin' ? 'Admin' : 'Manager'} Approval Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Review and approve expense requests from your team
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {stats.pending}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Approval
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <PendingActions />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {stats.approved}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Approved
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="error.main">
                    {stats.rejected}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Rejected
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.light' }}>
                  <Cancel />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {formatCurrency(stats.totalAmount)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <FilterList />
            <Typography variant="h6">Filters</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                label="Date Range"
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This Week</MenuItem>
                <MenuItem value="month">This Month</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Amount Range</InputLabel>
              <Select
                value={filters.amountRange}
                onChange={(e) => setFilters({ ...filters, amountRange: e.target.value })}
                label="Amount Range"
              >
                <MenuItem value="all">All Amounts</MenuItem>
                <MenuItem value="low">Under $100</MenuItem>
                <MenuItem value="medium">$100 - $500</MenuItem>
                <MenuItem value="high">Over $500</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => {
          setActiveTab(newValue);
          const status = tabLabels[newValue].value;
          setFilters({ ...filters, status });
        }}>
          {tabLabels.map((tab, index) => (
            <Tab 
              key={tab.value} 
              label={
                <Badge 
                  badgeContent={
                    tab.value === 'waiting_approval' ? stats.pending : 
                    tab.value === 'approved' ? stats.approved :
                    tab.value === 'rejected' ? stats.rejected : 0
                  } 
                  color={
                    tab.value === 'waiting_approval' ? 'warning' : 
                    tab.value === 'approved' ? 'success' :
                    tab.value === 'rejected' ? 'error' : 'default'
                  }
                >
                  {tab.label}
                </Badge>
              }
            />
          ))}
        </Tabs>
      </Box>

      {/* Expenses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Original Amount</TableCell>
              <TableCell>Company Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {expense.requester_name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {expense.requester_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {expense.requester_email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {expense.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {expense.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(expense.date_of_expense).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={expense.category_name} 
                    size="small" 
                    variant="outlined" 
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {formatCurrency(expense.original_amount, expense.original_currency)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {expense.original_currency}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(expense.company_amount, expense.company_currency)}
                  </Typography>
                  {expense.exchange_rate_used && (
                    <Typography variant="caption" color="textSecondary">
                      Rate: {expense.exchange_rate_used}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={expense.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(expense.status)}
                    icon={getStatusIcon(expense.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => setSelectedExpense(expense)}
                      title="View Details"
                    >
                      <Visibility />
                    </IconButton>
                    
                    {expense.status === 'waiting_approval' && (
                      <>
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => openApprovalDialog(expense, 'approve')}
                          title="Approve"
                        >
                          <CheckCircle />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => openApprovalDialog(expense, 'reject')}
                          title="Reject"
                        >
                          <Cancel />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {expenses.length === 0 && (
        <Box textAlign="center" py={8}>
          <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No expenses found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {filters.status === 'waiting_approval' 
              ? 'No expenses are currently pending approval'
              : `No ${filters.status} expenses found`
            }
          </Typography>
        </Box>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' ? 'Approve Expense' : 'Reject Expense'}
        </DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box>
              <Alert 
                severity={approvalAction === 'approve' ? 'success' : 'error'} 
                sx={{ mb: 3 }}
              >
                You are about to {approvalAction} the expense request from {selectedExpense.requester_name}
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Description:</Typography>
                  <Typography variant="body2">{selectedExpense.title}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Amount:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(selectedExpense.original_amount, selectedExpense.original_currency)}
                    {selectedExpense.original_currency !== selectedExpense.company_currency && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        ≈ {formatCurrency(selectedExpense.company_amount, selectedExpense.company_currency)}
                      </Typography>
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Date:</Typography>
                  <Typography variant="body2">
                    {new Date(selectedExpense.date_of_expense).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category:</Typography>
                  <Typography variant="body2">{selectedExpense.category_name}</Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label={`${approvalAction === 'approve' ? 'Approval' : 'Rejection'} Comments`}
                placeholder={`Add comments for ${approvalAction === 'approve' ? 'approving' : 'rejecting'} this expense...`}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                required={approvalAction === 'reject'}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApproval}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
            startIcon={approvalAction === 'approve' ? <CheckCircle /> : <Cancel />}
            disabled={approvalAction === 'reject' && !comments.trim()}
          >
            {approvalAction === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ApprovalDashboard;