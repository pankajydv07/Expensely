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
  Divider,
} from '@mui/material';
import { CloudUpload, Close, Description, Add } from '@mui/icons-material';
import { fetchCategories } from '../../store/expenseSlice';
import * as categoryService from '../../services/categoryService';

const ExpenseForm = ({ initialData, onSubmit, onCancel, submitLabel = 'Create Expense' }) => {
  const dispatch = useDispatch();
  const { categories, isLoading: categoriesLoading } = useSelector((state) => state.expense);
  const { user } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date_of_expense: new Date().toISOString().split('T')[0],
    original_amount: '',
    original_currency: 'USD',
    category_id: '',
    category_name: '',
    receipt_file: null,
  });

  const [receiptPreview, setReceiptPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  
  // Add Category Modal states
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  // Debug categories
  useEffect(() => {
    console.log('ExpenseForm: Categories available:', categories.length);
    if (categories.length === 0) {
      console.log('ExpenseForm: Categories not loaded, dispatching fetch...');
      dispatch(fetchCategories());
    }
  }, [dispatch, categories.length]);

  // Debug categories
  useEffect(() => {
    console.log('ExpenseForm: categories updated =', categories);
    console.log('ExpenseForm: categoriesLoading =', categoriesLoading);
    console.log('ExpenseForm: selected category_id =', formData.category_id);
  }, [categories, categoriesLoading, formData.category_id]);

  const retryLoadCategories = () => {
    console.log('ExpenseForm: Retrying to load categories...');
    dispatch(fetchCategories());
  };

  // Populate form with initial data (for editing)
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        date_of_expense: initialData.date_of_expense?.split('T')[0] || '',
        original_amount: initialData.original_amount || '',
        original_currency: initialData.original_currency || 'USD',
        category_id: initialData.category_id || '',
        receipt_file: null,
      });
      
      // If there's an existing receipt URL, show it
      if (initialData.receipt_url) {
        setReceiptPreview(initialData.receipt_url);
      }
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('ExpenseForm: Input changed -', name, '=', value, typeof value);
    
    // Convert category_id to number for proper matching
    const processedValue = name === 'category_id' ? (value === '' ? '' : Number(value)) : value;
    
    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        receipt_file: 'Please upload a valid image (JPG, PNG) or PDF file',
      }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors((prev) => ({
        ...prev,
        receipt_file: 'File size must be less than 5MB',
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      receipt_file: file,
    }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview('pdf');
    }

    // Clear any previous file errors
    setErrors((prev) => ({
      ...prev,
      receipt_file: null,
    }));

    // Optionally trigger OCR processing
    if (file.type.startsWith('image/')) {
      await processOCR(file);
    }
  };

  const processOCR = async (file) => {
    setOcrProcessing(true);
    try {
      // TODO: Implement OCR API call
      // const formData = new FormData();
      // formData.append('receipt', file);
      // const response = await api.post('/ocr/extract', formData);
      // 
      // setFormData((prev) => ({
      //   ...prev,
      //   original_amount: response.data.amount || prev.original_amount,
      //   date_of_expense: response.data.date || prev.date_of_expense,
      //   description: response.data.description || prev.description,
      // }));
      
      console.log('OCR processing would happen here with file:', file.name);
    } catch (error) {
      console.error('OCR processing failed:', error);
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({
      ...prev,
      receipt_file: null,
    }));
    setReceiptPreview(null);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setErrors(prev => ({
        ...prev,
        category: 'Category name is required'
      }));
      return;
    }

    setAddingCategory(true);
    try {
      const response = await categoryService.addCategory({
        name: newCategoryName.trim()
      });

      if (response.success) {
        // Refresh categories to include the new one
        dispatch(fetchCategories());
        
        // Select the new category
        setFormData(prev => ({
          ...prev,
          category_id: response.data.id
        }));

        // Close modal and reset
        setShowAddCategory(false);
        setNewCategoryName('');
        setErrors(prev => ({
          ...prev,
          category: null
        }));

        console.log('Category added successfully:', response.data);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add category';
      
      // Show different messages based on the error
      if (errorMessage.includes('already exists')) {
        setErrors(prev => ({
          ...prev,
          category: 'This category already exists. Please choose a different name.'
        }));
      } else {
        setErrors(prev => ({
          ...prev,
          category: errorMessage
        }));
      }
    } finally {
      setAddingCategory(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.date_of_expense) {
      newErrors.date_of_expense = 'Date is required';
    }

    if (!formData.original_amount || parseFloat(formData.original_amount) <= 0) {
      newErrors.original_amount = 'Amount must be greater than 0';
    }

    if (!formData.category_id && !formData.category_name?.trim()) {
      newErrors.category_id = 'Category is required';
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
      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('date_of_expense', formData.date_of_expense);
      submitData.append('original_amount', formData.original_amount);
      submitData.append('original_currency', formData.original_currency);
      
      // Handle category - either by ID (dropdown) or by name (text input)
      if (formData.category_id) {
        submitData.append('category_id', formData.category_id);
        console.log('ExpenseForm: Submitting expense with category_id:', formData.category_id);
      } else if (formData.category_name?.trim()) {
        submitData.append('category_name', formData.category_name.trim());
        console.log('ExpenseForm: Submitting expense with category_name:', formData.category_name);
      }
      
      if (formData.receipt_file) {
        submitData.append('receipt_file', formData.receipt_file);
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];

  return (
    <Paper sx={{ p: 3 }}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          {/* Title */}
          <Grid item xs={12}>
            <TextField
              required
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              error={Boolean(errors.title)}
              helperText={errors.title}
              placeholder="e.g., Client dinner, Flight to NYC"
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
              placeholder="Add any additional details..."
            />
          </Grid>

          {/* Date and Category */}
          <Grid item xs={12} sm={6}>
            <TextField
              required
              fullWidth
              type="date"
              label="Date of Expense"
              name="date_of_expense"
              value={formData.date_of_expense}
              onChange={handleInputChange}
              error={Boolean(errors.date_of_expense)}
              helperText={errors.date_of_expense}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            {categories.length > 0 && !categoriesLoading ? (
              // Dropdown when categories are available
              <FormControl 
                fullWidth 
                required 
                error={Boolean(errors.category_id)}
              >
                <InputLabel>Category</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id || ''}
                  onChange={handleInputChange}
                  label="Category"
                  displayEmpty
                >
                  <MenuItem value="" disabled>
                    <em>Select a category</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem 
                    onClick={() => setShowAddCategory(true)}
                    sx={{ color: 'primary.main', fontWeight: 'bold' }}
                  >
                    <Add sx={{ mr: 1 }} />
                    Add New Category
                  </MenuItem>
                </Select>
                {errors.category_id && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.category_id}
                  </Typography>
                )}
              </FormControl>
            ) : (
              // Text input fallback when categories aren't available
              <Box>
                <TextField
                  required
                  fullWidth
                  label="Category"
                  name="category_name"
                  value={formData.category_name || ''}
                  onChange={handleInputChange}
                  error={Boolean(errors.category_id)}
                  helperText={errors.category_id || "Categories couldn't load. Enter category manually."}
                  placeholder="e.g., Travel, Meals, Office Supplies"
                />
                <Button
                  size="small"
                  onClick={retryLoadCategories}
                  sx={{ mt: 1 }}
                  startIcon={categoriesLoading ? <CircularProgress size={16} /> : null}
                  disabled={categoriesLoading}
                >
                  {categoriesLoading ? 'Loading...' : 'Retry Loading Categories'}
                </Button>
              </Box>
            )}
          </Grid>

          {/* Amount and Currency */}
          <Grid item xs={12} sm={8}>
            <TextField
              required
              fullWidth
              type="number"
              label="Amount"
              name="original_amount"
              value={formData.original_amount}
              onChange={handleInputChange}
              error={Boolean(errors.original_amount)}
              helperText={errors.original_amount}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                name="original_currency"
                value={formData.original_currency}
                onChange={handleInputChange}
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

          {/* Receipt Upload */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Receipt
              </Typography>
              
              {!receiptPreview ? (
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ py: 2 }}
                >
                  Upload Receipt
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                    onChange={handleFileChange}
                  />
                </Button>
              ) : (
                <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  {receiptPreview === 'pdf' ? (
                    <Box
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Description color="primary" />
                      <Typography variant="body2">{formData.receipt_file?.name}</Typography>
                    </Box>
                  ) : (
                    <Box
                      component="img"
                      src={receiptPreview}
                      alt="Receipt preview"
                      sx={{
                        maxWidth: '100%',
                        maxHeight: 300,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={handleRemoveFile}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.main', color: 'white' },
                    }}
                  >
                    <Close />
                  </IconButton>
                </Box>
              )}

              {ocrProcessing && (
                <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mt: 1 }}>
                  Processing receipt with OCR...
                </Alert>
              )}

              {errors.receipt_file && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {errors.receipt_file}
                </Alert>
              )}

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                Supported formats: JPG, PNG, PDF (max 5MB)
              </Typography>
            </Box>
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting || ocrProcessing}
                startIcon={isSubmitting && <CircularProgress size={20} />}
              >
                {isSubmitting ? 'Saving...' : submitLabel}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Add Category Modal */}
      <Dialog 
        open={showAddCategory} 
        onClose={() => setShowAddCategory(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              fullWidth
              label="Category Name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              error={!!errors.category}
              helperText={errors.category}
              placeholder="e.g., Equipment, Marketing, Travel"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddCategory();
                }
              }}
            />
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              You can add new categories that will be available for all users in your organization.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowAddCategory(false);
              setNewCategoryName('');
              setErrors(prev => ({ ...prev, category: null }));
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddCategory}
            variant="contained"
            disabled={addingCategory || !newCategoryName.trim()}
            startIcon={addingCategory && <CircularProgress size={20} />}
          >
            {addingCategory ? 'Adding...' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ExpenseForm;

