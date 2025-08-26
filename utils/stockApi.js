import axios from 'axios';

// API configuration
const IEX_BASE_URL = 'https://cloud.iexapis.com/stable';
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

// Helper function to get API key
const getIEXApiKey = () => {
  const key = process.env.IEX_CLOUD_API_KEY;
  if (!key) {
    throw new Error('IEX_CLOUD_API_KEY is not configured');
  }
  return key;
};

const getAlphaVantageApiKey = () => {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not configured');
  }
  return key;
};

// Helper function to format stock data
const formatStockData = (data, source = 'iex') => {
  if (source === 'iex') {
    return {
      symbol: data.symbol?.toUpperCase(),
      name: data.companyName || data.shortName || 'N/A',
      exchange: data.primaryExchange || 'NASDAQ',
      sector: data.sector || 'N/A',
      industry: data.industry || 'N/A',
      currentPrice: parseFloat(data.latestPrice || data.iexRealtimePrice || 0),
      previousClose: parseFloat(data.previousClose || data.latestPrice || 0),
      change: parseFloat(data.change || 0),
      changePercent: parseFloat((data.changePercent || 0) * 100),
      volume: parseInt(data.latestVolume || data.volume || 0),
      marketCap: parseInt(data.marketCap || 0),
      peRatio: parseFloat(data.peRatio || 0) || null,
      dividendYield: parseFloat(data.dividendYield || 0) || null
    };
  }
  
  if (source === 'alphavantage') {
    const quote = data['Global Quote'] || data;
    return {
      symbol: quote['01. symbol']?.toUpperCase(),
      name: quote['01. symbol'] || 'N/A', // Alpha Vantage doesn't provide company name in quote
      exchange: 'NASDAQ', // Default
      sector: 'N/A',
      industry: 'N/A',
      currentPrice: parseFloat(quote['05. price'] || 0),
      previousClose: parseFloat(quote['08. previous close'] || 0),
      change: parseFloat(quote['09. change'] || 0),
      changePercent: parseFloat(quote['10. change percent']?.replace('%', '') || 0),
      volume: parseInt(quote['06. volume'] || 0),
      marketCap: 0, // Not provided by Alpha Vantage in quote
      peRatio: null,
      dividendYield: null
    };
  }
  
  return null;
};

// Get stock price using IEX Cloud API
export const getStockPriceFromIEX = async (symbol) => {
  try {
    const apiKey = getIEXApiKey();
    const url = `${IEX_BASE_URL}/stock/${symbol}/quote?token=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'FinanceDashboard/1.0'
      }
    });
    
    if (!response.data) {
      throw new Error('No data received from IEX');
    }
    
    return formatStockData(response.data, 'iex');
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(`Stock symbol '${symbol}' not found`);
    }
    
    console.error('IEX API Error:', error.message);
    throw new Error(`Failed to fetch stock data from IEX: ${error.message}`);
  }
};

// Get stock price using Alpha Vantage API (fallback)
export const getStockPriceFromAlphaVantage = async (symbol) => {
  try {
    const apiKey = getAlphaVantageApiKey();
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'FinanceDashboard/1.0'
      }
    });
    
    if (!response.data || response.data['Error Message']) {
      throw new Error(response.data['Error Message'] || 'Invalid API call');
    }
    
    if (response.data['Note']) {
      throw new Error('API call frequency limit reached');
    }
    
    return formatStockData(response.data, 'alphavantage');
  } catch (error) {
    console.error('Alpha Vantage API Error:', error.message);
    throw new Error(`Failed to fetch stock data from Alpha Vantage: ${error.message}`);
  }
};

// Main function to get stock price (tries IEX first, then Alpha Vantage)
export const getStockPrice = async (symbol) => {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Valid stock symbol is required');
  }
  
  const cleanSymbol = symbol.trim().toUpperCase();
  
  try {
    // Try IEX first
    return await getStockPriceFromIEX(cleanSymbol);
  } catch (iexError) {
    console.warn(`IEX failed for ${cleanSymbol}, trying Alpha Vantage:`, iexError.message);
    
    try {
      // Fallback to Alpha Vantage
      return await getStockPriceFromAlphaVantage(cleanSymbol);
    } catch (avError) {
      console.error(`Both APIs failed for ${cleanSymbol}`);
      throw new Error(`Unable to fetch stock data for ${cleanSymbol}: ${avError.message}`);
    }
  }
};

// Get historical stock data
export const getStockHistory = async (symbol, period = '1D', interval = '1m') => {
  try {
    const apiKey = getIEXApiKey();
    
    // Map period to IEX range
    const rangeMap = {
      '1D': '1d',
      '1W': '5d', 
      '1M': '1m',
      '3M': '3m',
      '6M': '6m',
      '1Y': '1y',
      '5Y': '5y'
    };
    
    const range = rangeMap[period] || '1d';
    let endpoint = 'chart';
    
    // For intraday data
    if (period === '1D') {
      endpoint = `chart/${range}`;
    } else {
      endpoint = `chart/${range}`;
    }
    
    const url = `${IEX_BASE_URL}/stock/${symbol}/${endpoint}?token=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'FinanceDashboard/1.0'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid historical data format');
    }
    
    // Format the data for charting
    const formattedData = response.data.map(item => ({
      timestamp: item.date ? new Date(`${item.date}T${item.minute || '16:00'}:00`).toISOString() : new Date(item.date).toISOString(),
      open: parseFloat(item.open || item.price || 0),
      high: parseFloat(item.high || item.price || 0),
      low: parseFloat(item.low || item.price || 0),
      close: parseFloat(item.close || item.price || 0),
      volume: parseInt(item.volume || 0)
    }));
    
    return {
      symbol: symbol.toUpperCase(),
      period,
      interval,
      data: formattedData,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching stock history:', error.message);
    throw new Error(`Failed to fetch historical data: ${error.message}`);
  }
};

// Search stocks
export const searchStocks = async (query) => {
  try {
    const apiKey = getIEXApiKey();
    const url = `${IEX_BASE_URL}/search/${query}?token=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'FinanceDashboard/1.0'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }
    
    // Format search results
    return response.data.map(item => ({
      symbol: item.symbol?.toUpperCase(),
      name: item.securityName || 'N/A',
      exchange: item.exchange || 'N/A',
      region: item.region || 'US',
      currency: item.currency || 'USD',
      type: item.securityType || 'cs'
    })).filter(item => item.symbol); // Filter out items without symbols
  } catch (error) {
    console.error('Error searching stocks:', error.message);
    throw new Error(`Failed to search stocks: ${error.message}`);
  }
};

// Get multiple stock quotes efficiently
export const getMultipleStockPrices = async (symbols) => {
  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    throw new Error('Valid symbols array is required');
  }
  
  if (symbols.length > 100) {
    throw new Error('Maximum 100 symbols allowed per request');
  }
  
  try {
    const apiKey = getIEXApiKey();
    const symbolsParam = symbols.map(s => s.toUpperCase()).join(',');
    const url = `${IEX_BASE_URL}/stock/market/batch?symbols=${symbolsParam}&types=quote&token=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'FinanceDashboard/1.0'
      }
    });
    
    if (!response.data) {
      throw new Error('No data received from batch request');
    }
    
    const results = [];
    const errors = [];
    
    symbols.forEach(symbol => {
      const symbolData = response.data[symbol.toUpperCase()];
      
      if (symbolData && symbolData.quote) {
        try {
          const formattedData = formatStockData(symbolData.quote, 'iex');
          results.push(formattedData);
        } catch (formatError) {
          errors.push({ symbol, error: formatError.message });
        }
      } else {
        errors.push({ symbol, error: 'Stock not found' });
      }
    });
    
    return { stocks: results, errors };
  } catch (error) {
    console.error('Error fetching multiple stock prices:', error.message);
    throw new Error(`Failed to fetch multiple stock prices: ${error.message}`);
  }
};

// Test API connectivity
export const testApiConnection = async () => {
  try {
    // Test with a common stock symbol
    const testSymbol = 'AAPL';
    const data = await getStockPrice(testSymbol);
    
    return {
      status: 'success',
      message: 'API connection successful',
      testData: data
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      testData: null
    };
  }
};
