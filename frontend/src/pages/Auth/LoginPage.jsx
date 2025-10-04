import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Visibility, VisibilityOff, AccountBalance } from '@mui/icons-material';
import authService from '../../services/authService';
import { login, clearError } from '../../store/authSlice';

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(formData));
    if (result.type === 'auth/login/fulfilled') {
      navigate('/');
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setForgotPasswordError('Please enter your email address');
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordError('');
    setForgotPasswordMessage('');

    try {
      const response = await authService.forgotPassword(forgotPasswordEmail);
      setForgotPasswordMessage(response.message);
    } catch (error) {
      setForgotPasswordError(error.message || 'Failed to send reset password email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordEmail('');
    setForgotPasswordMessage('');
    setForgotPasswordError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 2,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <AccountBalance
              sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
            />
            <Typography variant="h4" component="h1" gutterBottom fontWeight="600">
              Welcome to Expensely
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in to manage your expenses
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ cursor: 'pointer', color: '#1976d2', mb: 1 }}
                onClick={() => setForgotPasswordOpen(true)}
              >
                Forgot Password?
              </Typography>
              <Typography variant="body2">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  style={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Sign up for free
                </Link>
              </Typography>
            </Box>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="caption" display="block" gutterBottom fontWeight="600">
                Demo Credentials:
              </Typography>
              <Typography variant="caption" display="block">
                Admin: admin@acme.com / Password123!
              </Typography>
              <Typography variant="caption" display="block">
                Manager: john.manager@acme.com / Password123!
              </Typography>
              <Typography variant="caption" display="block">
                Employee: alice@acme.com / Password123!
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>

      {/* Forgot Password Modal */}
      <Dialog 
        open={forgotPasswordOpen} 
        onClose={handleCloseForgotPassword}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Enter your email address and we'll send you a new password.
          </Typography>
          
          {forgotPasswordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {forgotPasswordError}
            </Alert>
          )}
          
          {forgotPasswordMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {forgotPasswordMessage}
            </Alert>
          )}
          
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            disabled={forgotPasswordLoading}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseForgotPassword}
            disabled={forgotPasswordLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleForgotPassword}
            variant="contained"
            disabled={forgotPasswordLoading}
          >
            {forgotPasswordLoading ? <CircularProgress size={20} /> : 'Send New Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;

