import { Box, Typography, Container, Paper, Button, Grid } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'error.main',
          color: 'white',
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" fontWeight="600">
          Expensely - Admin Dashboard
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
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" fontWeight="600" sx={{ mb: 3 }}>
          Administration
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Admin Dashboard - Under Construction
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                This page will display:
              </Typography>
              <Box sx={{ mt: 2, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • User management (create, edit, delete users)
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Role assignment and manager relationships
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Approval rules configuration
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Expense categories management
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Company settings
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Dashboard statistics and reports
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • Override approval capabilities
                </Typography>
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 4 }}>
                Please implement the full admin dashboard UI
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard;

