import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  PhotoCamera,
  Close,
  CheckCircle,
  Warning,
  Visibility,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const ReceiptUpload = ({ open, onClose, onDataExtracted }) => {
  const [uploading, setUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [confidence, setConfidence] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Create preview URL
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setError(null);
    setUploading(true);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('receipt', file);

      // Get auth token
      const token = localStorage.getItem('token');
      
      // Upload and process receipt
      const response = await axios.post('/api/expenses/upload-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setExtractedData(response.data.data);
        setConfidence(response.data.data.confidence);
      } else {
        throw new Error(response.data.message || 'Failed to process receipt');
      }
    } catch (err) {
      console.error('Receipt upload error:', err);
      setError(err.response?.data?.message || 'Failed to process receipt');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUseData = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted({
        ...extractedData.ocrData,
        currencies: extractedData.currencies,
        categories: extractedData.categories,
        receiptPath: extractedData.receiptPath,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setExtractedData(null);
    setError(null);
    setPreviewUrl(null);
    setConfidence(0);
    setUploading(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 60) return 'warning';
    return 'error';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 80) return 'High confidence';
    if (confidence >= 60) return 'Medium confidence';
    return 'Low confidence - please verify';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Upload Receipt for OCR Processing</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {!extractedData && !uploading && (
          <Box>
            <Paper
              {...getRootProps()}
              sx={{
                p: 4,
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.300',
                borderRadius: 2,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the receipt here' : 'Upload Receipt Image'}
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Drag & drop a receipt image here, or click to select
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Supports: JPEG, PNG, PDF • Max size: 10MB
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PhotoCamera />}
                  component="span"
                >
                  Choose File
                </Button>
              </Box>
            </Paper>

            <Box sx={{ mt: 2 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>AI OCR will automatically extract:</strong>
                  <br />
                  • Expense amount and currency
                  <br />
                  • Date and merchant name
                  <br />
                  • Category and description
                  <br />
                  • Individual items (if multiple)
                </Typography>
              </Alert>
            </Box>
          </Box>
        )}

        {uploading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Processing Receipt...
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              AI is analyzing your receipt and extracting expense data
            </Typography>
            <LinearProgress sx={{ mt: 2, mb: 2 }} />
            <Typography variant="caption" color="textSecondary">
              This may take a few seconds
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}

        {extractedData && (
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6">Extracted Data</Typography>
              <Chip
                icon={confidence >= 80 ? <CheckCircle /> : <Warning />}
                label={`${confidence}% ${getConfidenceText(confidence)}`}
                color={getConfidenceColor(confidence)}
                size="small"
              />
            </Box>

            <Box display="flex" gap={2} sx={{ mb: 2 }}>
              {previewUrl && (
                <Box sx={{ flex: '0 0 200px' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Receipt Preview
                  </Typography>
                  <Paper sx={{ p: 1 }}>
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'contain',
                        borderRadius: 4,
                      }}
                    />
                  </Paper>
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Extracted Information
                </Typography>
                <Paper sx={{ p: 2 }}>
                  <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
                    <Typography variant="body2">
                      <strong>Amount:</strong> {extractedData.ocrData.currency} {extractedData.ocrData.amount}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Date:</strong> {extractedData.ocrData.date}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Merchant:</strong> {extractedData.ocrData.merchant}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Category:</strong> {extractedData.ocrData.category}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Description:</strong> {extractedData.ocrData.description}
                  </Typography>
                  {extractedData.ocrData.items && extractedData.ocrData.items.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2">
                        <strong>Items:</strong>
                      </Typography>
                      <Box sx={{ ml: 1 }}>
                        {extractedData.ocrData.items.map((item, index) => (
                          <Typography key={index} variant="caption" display="block">
                            • {item}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>

            {confidence < 60 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Low confidence detected. Please review and correct the extracted data before using it.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        {extractedData && (
          <>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => window.open(previewUrl, '_blank')}
            >
              View Receipt
            </Button>
            <Button
              variant="contained"
              onClick={handleUseData}
              color="primary"
            >
              Use This Data
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ReceiptUpload;