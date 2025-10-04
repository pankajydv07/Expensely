// OCR service for receipt processing using Google Gemini Vision API
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class OCRService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.geminiApiUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta';
  }

  /**
   * Extract expense data from receipt image using Gemini Vision API
   * @param {string} imagePath - Path to the uploaded image
   * @returns {Object} Extracted expense data
   */
  async extractExpenseData(filePath) {
    try {
      console.log('🔍 OCR Service: Starting extraction for file:', filePath);
      
      // Check if API key exists
      if (!this.geminiApiKey) {
        console.error('❌ OCR Service: GEMINI_API_KEY not found in environment variables');
        throw new Error('Gemini API key not configured');
      }
      
      console.log('✅ OCR Service: API key found, length:', this.geminiApiKey.length);
      
      // Read the file
      const fileBuffer = fs.readFileSync(filePath);
      const base64File = fileBuffer.toString('base64');
      
      // Determine MIME type based on file extension
      const mimeType = this.getMimeType(filePath);
      
      console.log(`📄 OCR Service: Processing file - Path: ${filePath}, MIME type: ${mimeType}, Buffer size: ${fileBuffer.length} bytes`);

      // Prepare the prompt for expense data extraction
      const fileType = mimeType.includes('pdf') ? 'PDF document' : 'image';
      const prompt = `
        Analyze this receipt ${fileType} and extract the following information in JSON format:
        {
          "amount": number (total amount),
          "currency": string (currency code like USD, EUR, INR),
          "date": string (date in YYYY-MM-DD format),
          "merchant": string (vendor/merchant name),
          "description": string (brief description of items/service),
          "category": string (one of: Travel, Meals, Office Supplies, Software, Training, Miscellaneous),
          "items": array of strings (individual items if multiple),
          "confidence": number (0-100, your confidence in the extraction)
        }
        
        Instructions:
        - If you can't clearly read something, use null for that field
        - For category, choose the most appropriate from the list
        - Be accurate with amounts and dates
        - Include currency symbol analysis
        - Return only valid JSON, no additional text
      `;

      // Test API connectivity first
      console.log('🔍 OCR Service: Testing API connectivity...');
      try {
        const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.geminiApiKey}`;
        const testResponse = await axios.get(testUrl);
        console.log('✅ OCR Service: API connectivity successful');
        console.log('📋 Available models:', testResponse.data.models?.map(m => m.name).slice(0, 3) || 'No models found');
      } catch (testError) {
        console.log('❌ OCR Service: API connectivity test failed:', testError.message);
        if (testError.response) {
          console.log('📋 Test error details:', testError.response.data);
        }
      }

      // Prepare API request - Using available Gemini model with vision capabilities
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${this.geminiApiKey}`;
      const requestPayload = {
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64File
              }
            }
          ]
        }]
      };
      
      console.log('🌐 OCR Service: Making API request to:', apiUrl.replace(this.geminiApiKey, 'API_KEY_HIDDEN'));
      console.log('📤 OCR Service: Request payload structure:', {
        contents: [{
          parts: [
            { text: 'PROMPT_TEXT' },
            { inline_data: { mime_type: mimeType, data: `BASE64_DATA_${base64File.length}_CHARS` } }
          ]
        }]
      });

      // Call Gemini Vision API
      const response = await axios.post(apiUrl, requestPayload, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📥 OCR Service: API Response Status:', response.status);
      console.log('📥 OCR Service: Full API Response:', JSON.stringify(response.data, null, 2));

      // Parse the response
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      console.log('🔄 OCR Service: Parsing response...');
      console.log('📝 OCR Service: Generated text from Gemini:', generatedText);
      
      if (!generatedText) {
        console.error('❌ OCR Service: No generated text in response');
        console.error('📋 OCR Service: Response structure:', JSON.stringify({
          candidates: response.data?.candidates?.length || 0,
          candidatesStructure: response.data?.candidates?.map(c => ({
            content: !!c.content,
            parts: c.content?.parts?.length || 0
          }))
        }, null, 2));
        throw new Error('No response from Gemini API');
      }

      // Try to parse JSON from the response
      let extractedData;
      try {
        // Clean the response text (remove markdown formatting if present)
        const jsonString = generatedText.replace(/```json\n?|\n?```/g, '').trim();
        console.log('✂️ OCR Service: Cleaned JSON string:', jsonString);
        extractedData = JSON.parse(jsonString);
        console.log('✅ OCR Service: Successfully parsed JSON:', extractedData);
      } catch (parseError) {
        console.error('❌ OCR Service: Failed to parse JSON');
        console.error('📝 OCR Service: Original text:', generatedText);
        console.error('✂️ OCR Service: Cleaned text:', jsonString);
        console.error('🚫 OCR Service: Parse error:', parseError.message);
        throw new Error('Invalid JSON response from OCR service');
      }

      // Validate and clean the extracted data
      const cleanedData = this.validateAndCleanData(extractedData);
      
      return {
        success: true,
        data: cleanedData,
        confidence: cleanedData.confidence || 75,
        originalResponse: generatedText
      };

    } catch (error) {
      console.error('❌ OCR Service: Extraction error occurred');
      console.error('🚫 OCR Service: Error message:', error.message);
      console.error('📋 OCR Service: Error details:', {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3),
        isAxiosError: !!error.isAxiosError,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'No response data'
      });
      
      // Return fallback OCR using basic text recognition
      console.log('🔄 OCR Service: Falling back to basic OCR');
      return this.fallbackOCR(filePath);
    }
  }

  /**
   * Get MIME type based on file extension
   * @private
   */
  getMimeType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'webp': 'image/webp'
    };
    
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Validate and clean extracted OCR data
   * @private
   */
  validateAndCleanData(data) {
    const validCategories = [
      'Travel', 'Meals', 'Office Supplies', 'Software', 'Training', 'Miscellaneous'
    ];

    return {
      amount: this.parseAmount(data.amount),
      currency: this.validateCurrency(data.currency) || 'USD',
      date: this.validateDate(data.date) || new Date().toISOString().split('T')[0],
      merchant: data.merchant || 'Unknown Vendor',
      description: data.description || 'Expense from receipt',
      category: validCategories.includes(data.category) ? data.category : 'Miscellaneous',
      items: Array.isArray(data.items) ? data.items : [],
      confidence: Math.min(Math.max(data.confidence || 75, 0), 100)
    };
  }

  /**
   * Parse amount ensuring it's a valid number
   * @private
   */
  parseAmount(amount) {
    if (typeof amount === 'number' && !isNaN(amount) && amount >= 0) {
      return parseFloat(amount.toFixed(2));
    }
    
    if (typeof amount === 'string') {
      // Remove currency symbols and extract number
      const cleaned = amount.replace(/[^0-9.,]/g, '');
      const parsed = parseFloat(cleaned.replace(',', '.'));
      return !isNaN(parsed) && parsed >= 0 ? parseFloat(parsed.toFixed(2)) : 0;
    }
    
    return 0;
  }

  /**
   * Validate currency code
   * @private
   */
  validateCurrency(currency) {
    const commonCurrencies = [
      'USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SGD'
    ];
    
    if (typeof currency === 'string' && currency.length === 3) {
      return currency.toUpperCase();
    }
    
    return null;
  }

  /**
   * Validate date format
   * @private
   */
  validateDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    // Ensure date is not in the future
    if (date > new Date()) return new Date().toISOString().split('T')[0];
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Fallback OCR using simpler text extraction
   * @private
   */
  async fallbackOCR(filePath) {
    // Simple fallback that returns default values
    // In a production environment, you might use Tesseract.js or another OCR library
    
    return {
      success: false,
      data: {
        amount: 0,
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Unknown Vendor',
        description: 'Please fill in expense details',
        category: 'Miscellaneous',
        items: [],
        confidence: 25
      },
      confidence: 25,
      error: 'OCR extraction failed, please enter details manually'
    };
  }

  /**
   * Process multiple receipts in batch
   */
  async processMultipleReceipts(imagePaths) {
    const results = await Promise.allSettled(
      imagePaths.map(path => this.extractExpenseData(path))
    );

    return results.map((result, index) => ({
      imagePath: imagePaths[index],
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason.message : null
    }));
  }
}

module.exports = new OCRService();