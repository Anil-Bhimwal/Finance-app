/**
 * API Utility Functions
 * Helper functions for handling API responses, errors, and data transformation
 */

/**
 * Standard API response wrapper
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 * @returns {Object} - Standardized response object
 */
export const apiResponse = (data, message = 'Success', meta = {}) => {
  return {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
};

/**
 * Standard API error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} - Standardized error response
 */
export const apiError = (message, code = 'UNKNOWN_ERROR', statusCode = 500, details = {}) => {
  return {
    success: false,
    error: {
      message,
      code,
      statusCode,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Pagination helper
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total item count
 * @returns {Object} - Pagination metadata
 */
export const paginate = (page = 1, limit = 10, total = 0) => {
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);
  
  return {
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      previousPage: page > 1 ? page - 1 : null
    },
    offset
  };
};

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @throws {Error} - Throws error if required field is missing
 */
export const validateRequiredFields = (body, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    return !body || body[field] === undefined || body[field] === null || body[field] === '';
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

/**
 * Sanitize and validate stock symbol
 * @param {string} symbol - Stock symbol
 * @returns {string} - Sanitized symbol
 * @throws {Error} - Throws error if symbol is invalid
 */
export const validateStockSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Stock symbol is required and must be a string');
  }

  const sanitized = symbol.trim().toUpperCase();
  
  // Basic validation: 1-5 characters, letters only
  if (!/^[A-Z]{1,5}$/.test(sanitized)) {
    throw new Error('Invalid stock symbol format');
  }

  return sanitized;
};

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: USD)
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format percentage value
 * @param {number} value - Numeric value (as decimal, e.g., 0.05 for 5%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100);
};

/**
 * Format large numbers with suffixes (K, M, B, T)
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number string
 */
export const formatLargeNumber = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A';
  }

  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const suffixNum = Math.floor(Math.log10(Math.abs(value)) / 3);
  const shortValue = value / Math.pow(1000, suffixNum);

  if (suffixNum === 0) {
    return value.toString();
  }

  return shortValue.toFixed(decimals) + suffixes[suffixNum];
};

/**
 * Debounce function to limit API calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * Throttle function to limit API calls
 * @param {Function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(null, args);
    }
  };
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} - Promise that resolves with function result
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Transform stock data to consistent format
 * @param {Object} stockData - Raw stock data from API
 * @param {string} source - Data source (iex, alphavantage, etc.)
 * @returns {Object} - Normalized stock data
 */
export const normalizeStockData = (stockData, source = 'unknown') => {
  const defaultData = {
    symbol: '',
    name: '',
    price: 0,
    change: 0,
    changePercent: 0,
    volume: 0,
    marketCap: 0,
    high: 0,
    low: 0,
    open: 0,
    previousClose: 0,
    lastUpdate: new Date().toISOString(),
    source
  };

  if (!stockData) {
    return defaultData;
  }

  return {
    ...defaultData,
    ...stockData,
    price: parseFloat(stockData.price || 0),
    change: parseFloat(stockData.change || 0),
    changePercent: parseFloat(stockData.changePercent || 0),
    volume: parseInt(stockData.volume || 0),
    marketCap: parseInt(stockData.marketCap || 0),
    high: parseFloat(stockData.high || 0),
    low: parseFloat(stockData.low || 0),
    open: parseFloat(stockData.open || 0),
    previousClose: parseFloat(stockData.previousClose || 0)
  };
};

/**
 * Generate cache key for API responses
 * @param {string} prefix - Cache key prefix
 * @param {Object} params - Parameters to include in key
 * @returns {string} - Generated cache key
 */
export const generateCacheKey = (prefix, params = {}) => {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${prefix}:${paramString}`;
};

/**
 * Check if market is open (basic US market hours check)
 * @returns {boolean} - True if market is likely open
 */
export const isMarketOpen = () => {
  const now = new Date();
  const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
  const est = new Date(utc.getTime() + (-5 * 3600000)); // EST offset
  
  const day = est.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = est.getHours();
  const minute = est.getMinutes();
  const time = hour * 60 + minute;
  
  // Market closed on weekends
  if (day === 0 || day === 6) {
    return false;
  }
  
  // Market hours: 9:30 AM - 4:00 PM EST
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  return time >= marketOpen && time < marketClose;
};
