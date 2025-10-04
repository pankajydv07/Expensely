import { Box, Typography, Container, Paper, Button } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import ApprovalTable from '../../components/approval/ApprovalTable';

const ManagerDashboard = () => {
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
          bgcolor: 'success.main',
          color: 'white',
          py: 2,
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" fontWeight="600">
          Expensely - Manager Dashboard
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
        <Paper sx={{ p: 3 }}>
          <ApprovalTable />
        </Paper>
      </Container>
    </Box>
  );
};

export default ManagerDashboard;

