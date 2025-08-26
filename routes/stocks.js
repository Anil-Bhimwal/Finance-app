import express from 'express';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import { cache } from '../utils/cache.js';

const router = express.Router();

// Apply authentication middleware to all stock routes
router.use(requireAuth);

/**
 * GET /api/stocks/quote/:symbol
 * Get current stock quote
 */
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const cacheKey = `quote:${symbol}`;
    
    // Check cache first (cache for 30 seconds)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Fetch from external API (using IEX Cloud or Alpha Vantage)
    const stockData = await fetchStockQuote(symbol);
    
    // Cache the result
    await cache.set(cacheKey, stockData, 30);
    
    res.json(stockData);
  } catch (error) {
    console.error('Error fetching stock quote:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock quote',
      message: error.message 
    });
  }
});

/**
 * GET /api/stocks/search?q=query
 * Search for stocks by symbol or name
 */
router.get('/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ 
        error: 'Query must be at least 2 characters long' 
      });
    }

    const cacheKey = `search:${query.toLowerCase()}`;
    
    // Check cache first (cache for 5 minutes)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Search stocks
    const searchResults = await searchStocks(query);
    
    // Cache the result
    await cache.set(cacheKey, searchResults, 300);
    
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ 
      error: 'Failed to search stocks',
      message: error.message 
    });
  }
});

/**
 * GET /api/stocks/history/:symbol
 * Get historical stock data
 */
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1M' } = req.query; // 1D, 1W, 1M, 3M, 1Y, 5Y
    
    const cacheKey = `history:${symbol}:${range}`;
    
    // Check cache first (cache for 1 hour for historical data)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const historicalData = await fetchHistoricalData(symbol, range);
    
    // Cache the result
    await cache.set(cacheKey, historicalData, 3600);
    
    res.json(historicalData);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch historical data',
      message: error.message 
    });
  }
});

/**
 * GET /api/stocks/trending
 * Get trending/popular stocks
 */
router.get('/trending', async (req, res) => {
  try {
    const cacheKey = 'trending:stocks';
    
    // Check cache first (cache for 10 minutes)
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const trendingStocks = await fetchTrendingStocks();
    
    // Cache the result
    await cache.set(cacheKey, trendingStocks, 600);
    
    res.json(trendingStocks);
  } catch (error) {
    console.error('Error fetching trending stocks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch trending stocks',
      message: error.message 
    });
  }
});

/**
 * Helper function to fetch stock quote from external API
 */
async function fetchStockQuote(symbol) {
  const API_KEY = process.env.IEX_CLOUD_API_KEY || process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!API_KEY) {
    throw new Error('No API key configured for stock data');
  }

  // Try IEX Cloud first
  if (process.env.IEX_CLOUD_API_KEY) {
    const response = await axios.get(
      `https://cloud.iexapis.com/stable/stock/${symbol}/quote`,
      {
        params: {
          token: process.env.IEX_CLOUD_API_KEY
        }
      }
    );

    return {
      symbol: response.data.symbol,
      name: response.data.companyName,
      price: response.data.latestPrice,
      change: response.data.change,
      changePercent: response.data.changePercent * 100,
      volume: response.data.volume,
      marketCap: response.data.marketCap,
      high: response.data.high,
      low: response.data.low,
      open: response.data.open,
      previousClose: response.data.previousClose,
      lastUpdate: new Date().toISOString()
    };
  }

  // Fallback to Alpha Vantage
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    const response = await axios.get(
      'https://www.alphavantage.co/query',
      {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: process.env.ALPHA_VANTAGE_API_KEY
        }
      }
    );

    const quote = response.data['Global Quote'];
    if (!quote) {
      throw new Error('Stock not found');
    }

    return {
      symbol: quote['01. symbol'],
      name: symbol, // Alpha Vantage doesn't provide company name in quote
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      high: parseFloat(quote['03. high']),
      low: parseFloat(quote['04. low']),
      open: parseFloat(quote['02. open']),
      previousClose: parseFloat(quote['08. previous close']),
      lastUpdate: quote['07. latest trading day']
    };
  }

  throw new Error('No stock data API configured');
}

/**
 * Helper function to search stocks
 */
async function searchStocks(query) {
  // Mock implementation - replace with real API calls
  const mockResults = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
  ].filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
    stock.name.toLowerCase().includes(query.toLowerCase())
  );

  return { results: mockResults };
}

/**
 * Helper function to fetch historical data
 */
async function fetchHistoricalData(symbol, range) {
  // Mock implementation - replace with real API calls
  const mockData = {
    symbol,
    range,
    data: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      open: 150 + Math.random() * 20,
      high: 155 + Math.random() * 20,
      low: 145 + Math.random() * 20,
      close: 150 + Math.random() * 20,
      volume: Math.floor(Math.random() * 1000000) + 500000
    })).reverse()
  };

  return mockData;
}

/**
 * Helper function to fetch trending stocks
 */
async function fetchTrendingStocks() {
  // Mock implementation - replace with real API calls
  return {
    trending: [
      { symbol: 'TSLA', name: 'Tesla, Inc.', changePercent: 5.2 },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', changePercent: 3.8 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', changePercent: -2.1 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', changePercent: 1.9 }
    ]
  };
}

export default router;