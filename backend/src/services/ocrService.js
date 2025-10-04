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
  async extractExpenseData(imagePath) {
    try {
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Prepare the prompt for expense data extraction
      const prompt = `
        Analyze this receipt image and extract the following information in JSON format:
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

      // Call Gemini Vision API
      const response = await axios.post(
        `${this.geminiApiUrl}/models/gemini-pro-vision:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }]
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      // Parse the response
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!generatedText) {
        throw new Error('No response from Gemini API');
      }

      // Try to parse JSON from the response
      let extractedData;
      try {
        // Clean the response text (remove markdown formatting if present)
        const jsonString = generatedText.replace(/```json\n?|\n?```/g, '').trim();
        extractedData = JSON.parse(jsonString);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', generatedText);
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
      console.error('OCR extraction error:', error.message);
      
      // Return fallback OCR using basic text recognition
      return this.fallbackOCR(imagePath);
    }
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
  async fallbackOCR(imagePath) {
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