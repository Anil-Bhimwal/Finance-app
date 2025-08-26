import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Watchlist } from '../db/models/Watchlist.js';

const router = express.Router();

// Apply authentication middleware to all watchlist routes
router.use(requireAuth);

/**
 * GET /api/watchlist
 * Get user's watchlist
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    let watchlist = await Watchlist.findOne({ userId }).populate('stocks.stockId');
    
    if (!watchlist) {
      // Create empty watchlist if doesn't exist
      watchlist = new Watchlist({
        userId,
        stocks: []
      });
      await watchlist.save();
    }

    res.json({
      watchlist: watchlist.stocks,
      totalCount: watchlist.stocks.length
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to fetch watchlist',
      message: error.message 
    });
  }
});

/**
 * POST /api/watchlist/add
 * Add stock to watchlist
 */
router.post('/add', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { symbol, name, exchange } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    let watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      watchlist = new Watchlist({
        userId,
        stocks: []
      });
    }

    // Check if stock already exists in watchlist
    const existingStock = watchlist.stocks.find(
      stock => stock.symbol.toLowerCase() === symbol.toLowerCase()
    );

    if (existingStock) {
      return res.status(400).json({ 
        error: 'Stock already exists in watchlist' 
      });
    }

    // Add stock to watchlist
    watchlist.stocks.push({
      symbol: symbol.toUpperCase(),
      name: name || symbol,
      exchange: exchange || 'UNKNOWN',
      addedAt: new Date()
    });

    await watchlist.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`watchlist-${userId}`).emit('watchlist-update', {
        action: 'add',
        stock: { symbol, name, exchange }
      });
    }

    res.json({
      message: 'Stock added to watchlist successfully',
      stock: { symbol, name, exchange }
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to add stock to watchlist',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/watchlist/remove/:symbol
 * Remove stock from watchlist
 */
router.delete('/remove/:symbol', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { symbol } = req.params;

    const watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Find and remove the stock
    const stockIndex = watchlist.stocks.findIndex(
      stock => stock.symbol.toLowerCase() === symbol.toLowerCase()
    );

    if (stockIndex === -1) {
      return res.status(404).json({ error: 'Stock not found in watchlist' });
    }

    const removedStock = watchlist.stocks[stockIndex];
    watchlist.stocks.splice(stockIndex, 1);
    
    await watchlist.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`watchlist-${userId}`).emit('watchlist-update', {
        action: 'remove',
        stock: { symbol: removedStock.symbol }
      });
    }

    res.json({
      message: 'Stock removed from watchlist successfully',
      stock: { symbol: removedStock.symbol }
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to remove stock from watchlist',
      message: error.message 
    });
  }
});

/**
 * PUT /api/watchlist/reorder
 * Reorder stocks in watchlist
 */
router.put('/reorder', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { stockOrder } = req.body; // Array of symbols in new order

    if (!Array.isArray(stockOrder)) {
      return res.status(400).json({ error: 'Stock order must be an array' });
    }

    const watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    // Reorder stocks based on the provided order
    const reorderedStocks = [];
    
    for (const symbol of stockOrder) {
      const stock = watchlist.stocks.find(
        s => s.symbol.toLowerCase() === symbol.toLowerCase()
      );
      if (stock) {
        reorderedStocks.push(stock);
      }
    }

    // Add any stocks that weren't in the order array
    for (const stock of watchlist.stocks) {
      if (!reorderedStocks.find(s => s.symbol === stock.symbol)) {
        reorderedStocks.push(stock);
      }
    }

    watchlist.stocks = reorderedStocks;
    await watchlist.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`watchlist-${userId}`).emit('watchlist-update', {
        action: 'reorder',
        stockOrder
      });
    }

    res.json({
      message: 'Watchlist reordered successfully',
      stocks: watchlist.stocks
    });
  } catch (error) {
    console.error('Error reordering watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to reorder watchlist',
      message: error.message 
    });
  }
});

/**
 * GET /api/watchlist/export
 * Export watchlist as CSV
 */
router.get('/export', async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    const watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist || watchlist.stocks.length === 0) {
      return res.status(404).json({ error: 'No watchlist data to export' });
    }

    // Generate CSV content
    const csvHeader = 'Symbol,Name,Exchange,Added Date\n';
    const csvRows = watchlist.stocks.map(stock => 
      `${stock.symbol},${stock.name},${stock.exchange},${stock.addedAt.toISOString().split('T')[0]}`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=watchlist.csv');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to export watchlist',
      message: error.message 
    });
  }
});

/**
 * POST /api/watchlist/import
 * Import watchlist from CSV
 */
router.post('/import', async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    const lines = csvData.trim().split('\n');
    const stocks = [];

    // Skip header row and parse data
    for (let i = 1; i < lines.length; i++) {
      const [symbol, name, exchange] = lines[i].split(',');
      if (symbol && symbol.trim()) {
        stocks.push({
          symbol: symbol.trim().toUpperCase(),
          name: name?.trim() || symbol.trim(),
          exchange: exchange?.trim() || 'UNKNOWN',
          addedAt: new Date()
        });
      }
    }

    if (stocks.length === 0) {
      return res.status(400).json({ error: 'No valid stocks found in CSV data' });
    }

    let watchlist = await Watchlist.findOne({ userId });
    
    if (!watchlist) {
      watchlist = new Watchlist({
        userId,
        stocks: []
      });
    }

    // Add new stocks (avoid duplicates)
    let addedCount = 0;
    for (const newStock of stocks) {
      const exists = watchlist.stocks.find(
        existing => existing.symbol.toLowerCase() === newStock.symbol.toLowerCase()
      );
      if (!exists) {
        watchlist.stocks.push(newStock);
        addedCount++;
      }
    }

    await watchlist.save();

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`watchlist-${userId}`).emit('watchlist-update', {
        action: 'import',
        addedCount
      });
    }

    res.json({
      message: `Successfully imported ${addedCount} stocks`,
      addedCount,
      totalStocks: stocks.length
    });
  } catch (error) {
    console.error('Error importing watchlist:', error);
    res.status(500).json({ 
      error: 'Failed to import watchlist',
      message: error.message 
    });
  }
});

export default router;