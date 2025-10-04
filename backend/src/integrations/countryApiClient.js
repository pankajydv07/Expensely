const axios = require('axios');

const API_URL = process.env.RESTCOUNTRIES_API_URL || 'https://restcountries.com/v3.1';

// Cache for countries data
let countriesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch all countries with currency information
 */
const fetchCountries = async () => {
  try {
    // Check cache
    if (countriesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
      return countriesCache;
    }

    const response = await axios.get(`${API_URL}/all?fields=name,cca2,currencies`);
    
    // Transform data for easier use
    const countries = response.data.map(country => ({
      code: country.cca2,
      name: country.name.common,
      currencies: country.currencies ? Object.keys(country.currencies) : [],
    }));

    // Update cache
    countriesCache = countries;
    cacheTimestamp = Date.now();

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error.message);
    
    // Return fallback data if API fails
    return getFallbackCountries();
  }
};

/**
 * Get currency code for a specific country
 */
const getCurrencyForCountry = async (countryCode) => {
  try {
    const countries = await fetchCountries();
    const country = countries.find(c => c.code === countryCode);
    
    if (!country || !country.currencies || country.currencies.length === 0) {
      return null;
    }

    // Return the first currency (most countries have one primary currency)
    return country.currencies[0];
  } catch (error) {
    console.error('Error getting currency for country:', error.message);
    return null;
  }
};

/**
 * Fallback country data when API is unavailable
 */
const getFallbackCountries = () => {
  return [
    { code: 'US', name: 'United States', currencies: ['USD'] },
    { code: 'GB', name: 'United Kingdom', currencies: ['GBP'] },
    { code: 'IN', name: 'India', currencies: ['INR'] },
    { code: 'CA', name: 'Canada', currencies: ['CAD'] },
    { code: 'AU', name: 'Australia', currencies: ['AUD'] },
    { code: 'DE', name: 'Germany', currencies: ['EUR'] },
    { code: 'FR', name: 'France', currencies: ['EUR'] },
    { code: 'JP', name: 'Japan', currencies: ['JPY'] },
    { code: 'CN', name: 'China', currencies: ['CNY'] },
    { code: 'SG', name: 'Singapore', currencies: ['SGD'] },
  ];
};

module.exports = {
  fetchCountries,
  getCurrencyForCountry,
};

