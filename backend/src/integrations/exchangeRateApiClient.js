const axios = require('axios');
const { query } = require('../config/db');

const API_URL = process.env.EXCHANGE_RATE_API_URL || 'https://api.exchangerate-api.com/v4/latest';

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Fetch exchange rates for a given base currency
 */
const fetchExchangeRates = async (baseCurrency) => {
  try {
    // Check cache first
    const cached = await getCachedRates(baseCurrency);
    if (cached) {
      return cached;
    }

    // Fetch from API
    console.log(`🌐 Exchange Rate: Fetching rates for ${baseCurrency} from ${API_URL}/${baseCurrency}`);
    const response = await axios.get(`${API_URL}/${baseCurrency}`);
    const rates = response.data.rates;

    console.log(`✅ Exchange Rate: Successfully fetched ${Object.keys(rates).length} rates`);
    
    // Cache the rates
    await cacheRates(baseCurrency, rates);

    return rates;
  } catch (error) {
    console.error('❌ Exchange Rate Error:', error.message);
    console.error('📋 Exchange Rate Error Details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: `${API_URL}/${baseCurrency}`
    });
    
    // Return fallback rates if API fails
    return getFallbackRates(baseCurrency);
  }
};

/**
 * Get cached exchange rates from database
 */
const getCachedRates = async (baseCurrency) => {
  try {
    const result = await query(
      `SELECT rates, fetched_at 
       FROM exchange_rates 
       WHERE base_currency = $1 
       ORDER BY fetched_at DESC 
       LIMIT 1`,
      [baseCurrency]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const { rates, fetched_at } = result.rows[0];
    const age = Date.now() - new Date(fetched_at).getTime();

    // Return cached rates if still fresh
    if (age < CACHE_DURATION) {
      return rates;
    }

    return null;
  } catch (error) {
    console.error('Error getting cached rates:', error.message);
    return null;
  }
};

/**
 * Cache exchange rates in database
 */
const cacheRates = async (baseCurrency, rates) => {
  try {
    await query(
      `INSERT INTO exchange_rates (base_currency, rates, fetched_at)
       VALUES ($1, $2, NOW())`,
      [baseCurrency, JSON.stringify(rates)]
    );
  } catch (error) {
    console.error('Error caching rates:', error.message);
  }
};

/**
 * Convert amount from one currency to another
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return {
      amount,
      rate: 1.0,
      convertedAmount: amount,
    };
  }

  try {
    const rates = await fetchExchangeRates(fromCurrency);
    const rate = rates[toCurrency];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${toCurrency}`);
    }

    const convertedAmount = parseFloat((amount * rate).toFixed(2));

    return {
      amount,
      rate,
      convertedAmount,
    };
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    throw error;
  }
};

/**
 * Fallback exchange rates (approximate, for demo purposes)
 */
const getFallbackRates = (baseCurrency) => {
  const fallbackRates = {
    USD: { USD: 1.0, EUR: 0.92, GBP: 0.79, INR: 83.12, JPY: 149.50, CAD: 1.36, AUD: 1.52 },
    EUR: { USD: 1.09, EUR: 1.0, GBP: 0.86, INR: 90.21, JPY: 162.39, CAD: 1.47, AUD: 1.65 },
    GBP: { USD: 1.27, EUR: 1.16, GBP: 1.0, INR: 105.12, JPY: 189.24, CAD: 1.71, AUD: 1.92 },
    INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, INR: 1.0, JPY: 1.80, CAD: 0.016, AUD: 0.018 },
  };

  return fallbackRates[baseCurrency] || fallbackRates.USD;
};

module.exports = {
  fetchExchangeRates,
  convertCurrency,
};

