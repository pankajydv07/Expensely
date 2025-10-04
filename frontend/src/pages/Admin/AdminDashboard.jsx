import React, { useState } from 'react';
import { Box, Typography, Container, Paper, Button, Tabs, Tab } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import UserManagement from '../../components/admin/UserManagement';
import CategoryManagement from '../../components/admin/CategoryManagement';
import ApprovalTable from '../../components/approval/ApprovalTable';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="admin tabs">
              <Tab label="User Management" />
              <Tab label="Categories" />
              <Tab label="Approvals" />
              <Tab label="Company Settings" />
              <Tab label="Reports" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <UserManagement />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <CategoryManagement />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <ApprovalTable />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Company Settings
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Company settings management will be implemented here.
                This will include company information, default currency,
                approval rules, and other company-wide configurations.
              </Typography>
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Reports & Analytics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Dashboard statistics and reports will be implemented here.
                This will include expense analytics, user activity reports,
                approval metrics, and financial summaries.
              </Typography>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboard;

