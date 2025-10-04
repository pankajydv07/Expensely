import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { MoreVert, Visibility, Edit, Delete, Send } from '@mui/icons-material';
import { format } from 'date-fns';

const getStatusColor = (status) => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'waiting_approval':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'canceled':
      return 'default';
    default:
      return 'default';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'waiting_approval':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
};

const ExpenseTable = ({ expenses, isLoading, onView, onEdit, onDelete, onSubmit }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const handleMenuOpen = (event, expense) => {
    setAnchorEl(event.currentTarget);
    setSelectedExpense(expense);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedExpense(null);
  };

  const handleAction = (action) => {
    if (selectedExpense) {
      switch (action) {
        case 'view':
          onView && onView(selectedExpense);
          break;
        case 'edit':
          onEdit && onEdit(selectedExpense);
          break;
        case 'delete':
          onDelete && onDelete(selectedExpense);
          break;
        case 'submit':
          onSubmit && onSubmit(selectedExpense);
          break;
        default:
          break;
      }
    }
    handleMenuClose();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!expenses || expenses.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No expenses found
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Company Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requester</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow
                key={expense.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  {format(new Date(expense.date_of_expense), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>{expense.title || '—'}</TableCell>
                <TableCell>{expense.category_name || '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {expense.original_currency} {parseFloat(expense.original_amount).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="500">
                    {expense.company_currency} {parseFloat(expense.company_amount).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(expense.status)}
                    color={getStatusColor(expense.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{expense.requester_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {expense.requester_email}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, expense)}
                  >
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleAction('view')}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        {selectedExpense?.status === 'draft' && (
          <>
            <MenuItem onClick={() => handleAction('edit')}>
              <Edit fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={() => handleAction('submit')}>
              <Send fontSize="small" sx={{ mr: 1 }} />
              Submit for Approval
            </MenuItem>
            <MenuItem onClick={() => handleAction('delete')}>
              <Delete fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default ExpenseTable;

