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
import expenseService from '../../services/expenseService';

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
  
  // Entry Mode Selection states
  const [entryMode, setEntryMode] = useState(null); // null, 'ocr', 'manual'
  const [showModeSelection, setShowModeSelection] = useState(!initialData);
  
  // OCR Preview states
  const [ocrData, setOcrData] = useState(null);
  const [showOcrPreview, setShowOcrPreview] = useState(false);
  
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
      console.log('ExpenseForm: Initializing with data:', initialData);
      console.log('ExpenseForm: Setting currency to:', initialData.original_currency || 'USD');
      
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        date_of_expense: initialData.date_of_expense?.split('T')[0] || '',
        original_amount: initialData.original_amount || '',
        original_currency: initialData.original_currency || 'USD',
        category_id: initialData.category_id || '',
        receipt_file: null,
      });
      
      // For editing, use manual mode
      setEntryMode('manual');
      setShowModeSelection(false);
      
      // If there's an existing receipt URL, show it
      if (initialData.receipt_url) {
        setReceiptPreview(initialData.receipt_url);
      }
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('ExpenseForm: Input changed -', name, '=', value, typeof value);
    
    // Special handling for currency changes
    if (name === 'original_currency') {
      console.log('ExpenseForm: Currency changed from', formData.original_currency, 'to', value);
    }
    
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
    console.log('📁 File selected:', file ? file.name : 'No file', 'Entry mode:', entryMode);
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

    // Clear any previous file errors and OCR messages
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.receipt_file;
      delete newErrors.ocr_success;
      delete newErrors.ocr_warning;
      delete newErrors.ocr_error;
      return newErrors;
    });

    // Trigger OCR processing in OCR mode for both images and PDFs
    if (entryMode === 'ocr' && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      console.log('✅ OCR conditions met, starting processing...');
      await processOCR(file);
    } else {
      console.log('❌ OCR not triggered. Mode:', entryMode, 'File type:', file.type);
    }
  };

  const processOCR = async (file) => {
    console.log('🔍 Starting OCR processing for:', file.name, 'Type:', file.type, 'Mode:', entryMode);
    setOcrProcessing(true);
    try {
      console.log('🔍 Processing receipt with OCR:', file.name);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('receipt', file);
      
      console.log('📤 Calling OCR API...');
      // Call the OCR API
      const response = await expenseService.uploadReceipt(formData);
      
      if (response.success && response.data.ocrData) {
        const extractedData = response.data.ocrData;
        
        console.log('✅ OCR processing successful:', extractedData);
        
        if (entryMode === 'ocr') {
          // In OCR mode, show preview first
          setOcrData(extractedData);
          setShowOcrPreview(true);

          // Show success message with confidence
          if (extractedData.confidence && extractedData.confidence > 60) {
            setErrors(prev => ({
              ...prev,
              ocr_success: `Receipt processed successfully! Confidence: ${extractedData.confidence}%. Review the extracted data below.`
            }));
          } else {
            setErrors(prev => ({
              ...prev,
              ocr_warning: `Receipt processed with ${extractedData.confidence}% confidence. Please verify the extracted data below.`
            }));
          }
        } else {
          // In manual mode (shouldn't happen), just store the data
          setOcrData(extractedData);
        }
      } else {
        throw new Error(response.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('❌ OCR processing failed:', error);
      setErrors(prev => ({
        ...prev,
        ocr_error: `OCR processing failed: ${error.message}. Please enter details manually.`
      }));
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
    setOcrData(null);
    setShowOcrPreview(false);
  };

  const handleAcceptOcrData = () => {
    if (!ocrData) return;

    // Update form with extracted data
    setFormData((prev) => ({
      ...prev,
      original_amount: ocrData.amount?.toString() || prev.original_amount,
      date_of_expense: ocrData.date || prev.date_of_expense,
      description: ocrData.description || prev.description,
      title: ocrData.merchant ? `Expense from ${ocrData.merchant}` : (ocrData.description || prev.title),
      original_currency: ocrData.currency || prev.original_currency,
      // Try to match category name with existing categories
      category_name: ocrData.category || prev.category_name,
    }));

    // Try to match category with existing categories
    if (ocrData.category && categories.length > 0) {
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(ocrData.category.toLowerCase()) ||
        ocrData.category.toLowerCase().includes(cat.name.toLowerCase())
      );
      if (matchingCategory) {
        setFormData(prev => ({
          ...prev,
          category_id: matchingCategory.id,
          category_name: ''
        }));
      }
    }

    // Hide OCR preview
    setShowOcrPreview(false);
    
    // Clear OCR success/warning messages since data is now accepted
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.ocr_success;
      delete newErrors.ocr_warning;
      return newErrors;
    });

    // Show success message
    setErrors(prev => ({
      ...prev,
      form_success: 'Form has been auto-filled with extracted data. Please review and submit.'
    }));
  };

  const handleRejectOcrData = () => {
    // Hide OCR preview but keep the receipt
    setShowOcrPreview(false);
    setOcrData(null);
    
    // Clear OCR messages
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.ocr_success;
      delete newErrors.ocr_warning;
      return newErrors;
    });
  };

  const handleModeSelection = (mode) => {
    setEntryMode(mode);
    setShowModeSelection(false);
    
    if (mode === 'manual') {
      // For manual mode, hide OCR-related elements
      setShowOcrPreview(false);
      setOcrData(null);
    }
  };

  const handleBackToModeSelection = () => {
    setEntryMode(null);
    setShowModeSelection(true);
    // Reset form and OCR states
    setFormData({
      title: '',
      description: '',
      date_of_expense: new Date().toISOString().split('T')[0],
      original_amount: '',
      original_currency: 'USD',
      category_id: '',
      category_name: '',
      receipt_file: null,
    });
    setReceiptPreview(null);
    setOcrData(null);
    setShowOcrPreview(false);
    setErrors({});
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
      {/* Entry Mode Selection */}
      {showModeSelection && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" gutterBottom>
            Create New Expense
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Choose how you want to add your expense:
          </Typography>
          
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={6} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  cursor: 'pointer', 
                  border: '2px solid transparent',
                  '&:hover': { 
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50'
                  }
                }}
                onClick={() => handleModeSelection('ocr')}
              >
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Upload Receipt (OCR)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Upload a receipt and let AI extract the details automatically
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Paper 
                sx={{ 
                  p: 3, 
                  cursor: 'pointer', 
                  border: '2px solid transparent',
                  '&:hover': { 
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50'
                  }
                }}
                onClick={() => handleModeSelection('manual')}
              >
                <Add sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Manual Entry
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enter expense details manually without uploading a receipt
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Expense Form */}
      {!showModeSelection && (
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* Back Button */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="text"
              onClick={handleBackToModeSelection}
              startIcon={<Close />}
              size="small"
            >
              Back to Mode Selection
            </Button>
            <Typography variant="h6" color="primary">
              {entryMode === 'ocr' ? '📄 OCR Entry' : '✏️ Manual Entry'}
            </Typography>
          </Box>

          <Grid container spacing={3}>
          
          {/* Success Message */}
          {errors.form_success && (
            <Grid item xs={12}>
              <Alert severity="success" onClose={() => setErrors(prev => ({ ...prev, form_success: null }))}>
                {errors.form_success}
              </Alert>
            </Grid>
          )}

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

          {/* Receipt Upload - Only show in OCR mode */}
          {entryMode === 'ocr' && (
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
                  Attach Receipt
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

              {errors.ocr_success && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  {errors.ocr_success}
                </Alert>
              )}

              {errors.ocr_warning && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {errors.ocr_warning}
                </Alert>
              )}

              {errors.ocr_error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {errors.ocr_error}
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
          )}

          {/* OCR Preview Card - Only show in OCR mode */}
          {entryMode === 'ocr' && showOcrPreview && ocrData && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, border: '2px solid', borderColor: 'primary.main', bgcolor: 'primary.50' }}>
                <Typography variant="h6" gutterBottom color="primary">
                  📄 Receipt Data Extracted
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Review the automatically extracted information from your receipt:
                </Typography>
                
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h6">
                        {ocrData.currency || 'USD'} {ocrData.amount || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="h6">
                        {ocrData.date || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Merchant
                      </Typography>
                      <Typography variant="h6">
                        {ocrData.merchant || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Category
                      </Typography>
                      <Typography variant="h6">
                        {ocrData.category || 'N/A'}
                      </Typography>
                    </Box>
                  </Grid>
                  {ocrData.description && (
                    <Grid item xs={12}>
                      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Description
                        </Typography>
                        <Typography variant="body1">
                          {ocrData.description}
                        </Typography>
                      </Box>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAcceptOcrData}
                    sx={{ minWidth: 120 }}
                  >
                    Accept & Fill Form
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleRejectOcrData}
                    sx={{ minWidth: 120 }}
                  >
                    Enter Manually
                  </Button>
                </Box>

                {ocrData.confidence && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ textAlign: 'center', mt: 1 }}>
                    Confidence: {ocrData.confidence}%
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}

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
                disabled={isSubmitting || ocrProcessing || showOcrPreview}
                startIcon={isSubmitting && <CircularProgress size={20} />}
              >
                {showOcrPreview 
                  ? 'Review OCR Data Above'
                  : isSubmitting 
                    ? 'Saving...' 
                    : submitLabel
                }
              </Button>
            </Box>
            {showOcrPreview && (
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1, display: 'block' }}>
                Please review and accept/reject the extracted data before creating the expense
              </Typography>
            )}
          </Grid>
          </Grid>
        </Box>
      )}

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

