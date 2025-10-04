import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Check, Close, Visibility } from '@mui/icons-material';
import approvalService from '../../services/approvalService';

const ApprovalTable = () => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, action: '', expense: null });
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await approvalService.getPendingApprovals();
      setApprovals(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setError('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action, expense) => {
    setActionDialog({ open: true, action, expense });
    setComment('');
  };

  const handleCloseDialog = () => {
    setActionDialog({ open: false, action: '', expense: null });
    setComment('');
  };

  const handleConfirmAction = async () => {
    if (!actionDialog.expense) return;

    try {
      setProcessing(true);
      const { expense, action } = actionDialog;

      if (action === 'approve') {
        await approvalService.approveExpense(expense.id, comment);
      } else if (action === 'reject') {
        await approvalService.rejectExpense(expense.id, comment);
      }

      // Refresh the approvals list
      await fetchPendingApprovals();
      handleCloseDialog();
    } catch (error) {
      console.error(`Error ${actionDialog.action}ing expense:`, error);
      setError(`Failed to ${actionDialog.action} expense`);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting_approval':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'submitted':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pending Approvals ({approvals.length})
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No pending approvals
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {expense.user_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {expense.user_email}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {expense.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.category_name}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(expense.amount, expense.currency)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.status.replace('_', ' ')}
                      color={getStatusColor(expense.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => handleAction('approve', expense)}
                        title="Approve"
                      >
                        <Check />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleAction('reject', expense)}
                        title="Reject"
                      >
                        <Close />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => setSelectedExpense(expense)}
                        title="View Details"
                      >
                        <Visibility />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {actionDialog.action === 'approve' ? 'Approve Expense' : 'Reject Expense'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.expense && (
            <Box>
              <Typography variant="body2" gutterBottom>
                <strong>Employee:</strong> {actionDialog.expense.user_name}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Description:</strong> {actionDialog.expense.description}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Amount:</strong> {formatCurrency(actionDialog.expense.amount, actionDialog.expense.currency)}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                sx={{ mt: 2 }}
                placeholder={`Add a comment for ${actionDialog.action}ing this expense...`}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={actionDialog.action === 'approve' ? 'success' : 'error'}
            disabled={processing}
          >
            {processing ? (
              <CircularProgress size={20} />
            ) : (
              actionDialog.action === 'approve' ? 'Approve' : 'Reject'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Expense Details Dialog */}
      <Dialog
        open={Boolean(selectedExpense)}
        onClose={() => setSelectedExpense(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Expense Details</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedExpense.description}
              </Typography>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} mt={2}>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Employee
                  </Typography>
                  <Typography variant="body1">
                    {selectedExpense.user_name} ({selectedExpense.user_email})
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Category
                  </Typography>
                  <Typography variant="body1">
                    {selectedExpense.category_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedExpense.expense_date)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Status
                  </Typography>
                  <Chip
                    label={selectedExpense.status.replace('_', ' ')}
                    color={getStatusColor(selectedExpense.status)}
                    size="small"
                  />
                </Box>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Submitted On
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(selectedExpense.created_at)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedExpense(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalTable;