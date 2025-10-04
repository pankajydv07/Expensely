import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  CloudUpload,
  Close,
  Description,
  Add,
  CameraAlt,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { fetchCategories } from '../../store/expenseSlice';
import categoryService from '../../services/categoryService';
import expenseService from '../../services/expenseService';

const ExpenseForm = ({ initialData, onSubmit, onCancel, submitLabel = 'Create Expense' }) => {
  const dispatch = useDispatch();
  const { categories, loading: categoriesLoading } = useSelector((state) => state.expense);
  const { user } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_of_expense: new Date().toISOString().split('T')[0],
    original_amount: '',
    original_currency: 'USD',
    category_id: '',
    receipt_file: null,
    payment_method: 'Card',
  });

  const [receiptPreview, setReceiptPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  
  // Custom category modal
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Currency options
  const currencies = [
    'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'
  ];

  // Payment methods
  const paymentMethods = [
    'Cash', 'Card', 'Bank Transfer', 'UPI', 'Digital Wallet', 'Other'
  ];

  // Load categories on mount
  useEffect(() => {
    if (categories.length === 0) {
      dispatch(fetchCategories());
    }
  }, [dispatch, categories.length]);

  // Populate form with initial data (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
        date_of_expense: initialData.date_of_expense?.split('T')[0] || formData.date_of_expense,
      });
    }
  }, [initialData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleReceiptUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        receipt: 'Please upload a valid image file (JPG, PNG)'
      }));
      return;
    }

    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        receipt: 'File size must be less than 5MB'
      }));
      return;
    }

    // Clear receipt errors
    setErrors(prev => ({
      ...prev,
      receipt: null
    }));

    // Set preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Store file
    setFormData(prev => ({
      ...prev,
      receipt_file: file
    }));

    // Process with OCR
    await processOCR(file);
  };

  const processOCR = async (file) => {
    setOcrProcessing(true);
    setOcrResults(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('receipt', file);

      // Call OCR endpoint
      const response = await expenseService.uploadReceipt(formData);
      
      if (response.success && response.data.ocrData) {
        const ocrData = response.data.ocrData;
        setOcrResults({
          ...ocrData,
          confidence: response.data.confidence
        });

        // Auto-fill form with OCR data if confidence is good
        if (response.data.confidence > 60) {
          setFormData(prev => ({
            ...prev,
            title: ocrData.description || prev.title,
            description: ocrData.description || prev.description,
            original_amount: ocrData.amount?.toString() || prev.original_amount,
            original_currency: ocrData.currency || prev.original_currency,
            date_of_expense: ocrData.date || prev.date_of_expense,
            // Find matching category
            category_id: findCategoryByName(ocrData.category) || prev.category_id,
          }));
        }
      }
    } catch (error) {
      console.error('OCR processing failed:', error);
      setErrors(prev => ({
        ...prev,
        receipt: 'Failed to process receipt. You can still fill the form manually.'
      }));
    } finally {
      setOcrProcessing(false);
    }
  };

  const findCategoryByName = (categoryName) => {
    if (!categoryName || !categories.length) return '';
    
    const found = categories.find(cat => 
      cat.name.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(cat.name.toLowerCase())
    );
    
    return found?.id || '';
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setAddingCategory(true);
    try {
      const response = await categoryService.addCategory({
        name: newCategoryName.trim()
      });

      if (response.success) {
        // Refresh categories
        dispatch(fetchCategories());
        
        // Select the new category
        setFormData(prev => ({
          ...prev,
          category_id: response.data.id
        }));

        // Close modal
        setShowAddCategory(false);
        setNewCategoryName('');
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        category: error.response?.data?.error || 'Failed to add category'
      }));
    } finally {
      setAddingCategory(false);
    }
  };

  const removeReceipt = () => {
    setReceiptPreview(null);
    setFormData(prev => ({
      ...prev,
      receipt_file: null
    }));
    setOcrResults(null);
    setErrors(prev => ({
      ...prev,
      receipt: null
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.original_amount || parseFloat(formData.original_amount) <= 0) {
      newErrors.original_amount = 'Valid amount is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.date_of_expense) {
      newErrors.date_of_expense = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Create New Expense
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter expense details..."
            />
          </Grid>

          {/* Date and Category */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Date of Expense"
              value={formData.date_of_expense}
              onChange={(e) => handleInputChange('date_of_expense', e.target.value)}
              error={!!errors.date_of_expense}
              helperText={errors.date_of_expense}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth error={!!errors.category_id}>
              <InputLabel>Category *</InputLabel>
              <Select
                value={formData.category_id}
                onChange={(e) => handleInputChange('category_id', e.target.value)}
                label="Category *"
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
                <Divider />
                {user?.role_id === 1 && (
                  <MenuItem onClick={() => setShowAddCategory(true)}>
                    <Add sx={{ mr: 1 }} />
                    Add Custom Category
                  </MenuItem>
                )}
              </Select>
              {errors.category_id && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                  {errors.category_id}
                </Typography>
              )}
            </FormControl>
          </Grid>

          {/* Amount and Currency */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Amount"
              value={formData.original_amount}
              onChange={(e) => handleInputChange('original_amount', e.target.value)}
              error={!!errors.original_amount}
              helperText={errors.original_amount}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.original_currency}
                onChange={(e) => handleInputChange('original_currency', e.target.value)}
                label="Currency"
              >
                {currencies.map((currency) => (
                  <MenuItem key={currency} value={currency}>
                    {currency}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Payment Method */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.payment_method}
                onChange={(e) => handleInputChange('payment_method', e.target.value)}
                label="Payment Method"
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Receipt Upload */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Receipt
            </Typography>
            
            {!receiptPreview ? (
              <Card 
                variant="outlined" 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  border: '2px dashed #ccc',
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'primary.main' }
                }}
                onClick={() => document.getElementById('receipt-upload').click()}
              >
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload Receipt
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Supported formats: JPG, PNG, PDF (max 5MB)
                </Typography>
                <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                  🤖 AI will automatically extract expense details
                </Typography>
              </Card>
            ) : (
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6">
                      Receipt Preview
                    </Typography>
                    <IconButton onClick={removeReceipt} color="error">
                      <Close />
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" gap={2}>
                    <Box>
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        style={{ 
                          maxWidth: 200, 
                          maxHeight: 200, 
                          objectFit: 'contain',
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </Box>
                    
                    {ocrProcessing && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={20} />
                        <Typography variant="body2">
                          Processing with AI...
                        </Typography>
                      </Box>
                    )}
                    
                    {ocrResults && (
                      <Box flex={1}>
                        <Typography variant="subtitle2" gutterBottom>
                          AI Extracted Data
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          {ocrResults.confidence > 80 ? (
                            <CheckCircle color="success" fontSize="small" />
                          ) : ocrResults.confidence > 60 ? (
                            <ErrorIcon color="warning" fontSize="small" />
                          ) : (
                            <ErrorIcon color="error" fontSize="small" />
                          )}
                          <Typography variant="body2">
                            Confidence: {ocrResults.confidence}%
                          </Typography>
                        </Box>
                        
                        <Grid container spacing={1}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Amount: {ocrResults.amount} {ocrResults.currency}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Date: {ocrResults.date}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              Vendor: {ocrResults.merchant}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            )}

            <input
              id="receipt-upload"
              type="file"
              accept="image/*"
              onChange={handleReceiptUpload}
              style={{ display: 'none' }}
            />
            
            {errors.receipt && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {errors.receipt}
              </Alert>
            )}
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button 
                variant="outlined" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || ocrProcessing}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? 'Creating...' : submitLabel}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>

      {/* Add Category Modal */}
      <Dialog open={showAddCategory} onClose={() => setShowAddCategory(false)}>
        <DialogTitle>Add Custom Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            margin="dense"
            error={!!errors.category}
            helperText={errors.category}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddCategory(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddCategory}
            variant="contained"
            disabled={addingCategory || !newCategoryName.trim()}
          >
            {addingCategory ? <CircularProgress size={20} /> : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ExpenseForm;