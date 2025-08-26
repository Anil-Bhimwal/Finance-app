import { getStockPrice, getMultipleStockPrices } from './stockApi.js';
import Stock from '../db/models/Stock.js';
import Watchlist from '../db/models/Watchlist.js';

// Store active connections and their subscriptions
const connections = new Map();
const subscriptions = new Map(); // symbol -> Set of socket IDs
let updateInterval = null;

// Configuration
const UPDATE_INTERVAL = 30000; // 30 seconds
const MAX_SUBSCRIPTIONS_PER_CLIENT = 50;

export const setupWebSocket = (io) => {
  console.log('🔌 Setting up WebSocket server');

  io.on('connection', (socket) => {
    const clientId = socket.id;
    connections.set(clientId, {
      socket,
      subscriptions: new Set(),
      userId: null,
      connectedAt: new Date()
    });

    console.log(`📱 Client connected: ${clientId}`);

    // Handle user authentication
    socket.on('authenticate', (data) => {
      try {
        const { userId, token } = data;
        
        // In production, verify the JWT token here
        // For now, we'll accept any userId
        if (userId) {
          const connection = connections.get(clientId);
          if (connection) {
            connection.userId = userId;
            socket.emit('authenticated', { success: true, userId });
            console.log(`🔐 Client ${clientId} authenticated as user ${userId}`);
          }
        } else {
          socket.emit('authentication_error', { error: 'Invalid credentials' });
        }
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('authentication_error', { error: 'Authentication failed' });
      }
    });

    // Handle stock subscriptions
    socket.on('subscribe', (data) => {
      try {
        const { symbols } = data;
        
        if (!symbols || !Array.isArray(symbols)) {
          socket.emit('subscription_error', { error: 'Invalid symbols array' });
          return;
        }

        const connection = connections.get(clientId);
        if (!connection) {
          socket.emit('subscription_error', { error: 'Connection not found' });
          return;
        }

        // Check subscription limits
        if (connection.subscriptions.size + symbols.length > MAX_SUBSCRIPTIONS_PER_CLIENT) {
          socket.emit('subscription_error', { 
            error: `Maximum ${MAX_SUBSCRIPTIONS_PER_CLIENT} subscriptions allowed per client` 
          });
          return;
        }

        const subscribedSymbols = [];
        const errors = [];

        symbols.forEach(symbol => {
          try {
            const cleanSymbol = symbol.toUpperCase().trim();
            
            if (!cleanSymbol) {
              errors.push({ symbol, error: 'Invalid symbol' });
              return;
            }

            // Add to client's subscriptions
            connection.subscriptions.add(cleanSymbol);

            // Add to global subscriptions
            if (!subscriptions.has(cleanSymbol)) {
              subscriptions.set(cleanSymbol, new Set());
            }
            subscriptions.get(cleanSymbol).add(clientId);

            subscribedSymbols.push(cleanSymbol);
          } catch (error) {
            errors.push({ symbol, error: error.message });
          }
        });

        socket.emit('subscribed', { symbols: subscribedSymbols, errors });
        
        if (subscribedSymbols.length > 0) {
          console.log(`📊 Client ${clientId} subscribed to: ${subscribedSymbols.join(', ')}`);
          
          // Send initial data for subscribed symbols
          sendInitialStockData(socket, subscribedSymbols);
        }

        // Start update interval if this is the first subscription
        if (subscriptions.size > 0 && !updateInterval) {
          startUpdateInterval(io);
        }
      } catch (error) {
        console.error('Subscription error:', error);
        socket.emit('subscription_error', { error: 'Subscription failed' });
      }
    });

    // Handle unsubscription
    socket.on('unsubscribe', (data) => {
      try {
        const { symbols } = data;
        
        if (!symbols || !Array.isArray(symbols)) {
          socket.emit('unsubscription_error', { error: 'Invalid symbols array' });
          return;
        }

        const connection = connections.get(clientId);
        if (!connection) {
          return;
        }

        const unsubscribedSymbols = [];

        symbols.forEach(symbol => {
          const cleanSymbol = symbol.toUpperCase().trim();
          
          // Remove from client's subscriptions
          connection.subscriptions.delete(cleanSymbol);

          // Remove from global subscriptions
          if (subscriptions.has(cleanSymbol)) {
            subscriptions.get(cleanSymbol).delete(clientId);
            
            // If no clients are subscribed to this symbol, remove it
            if (subscriptions.get(cleanSymbol).size === 0) {
              subscriptions.delete(cleanSymbol);
            }
          }

          unsubscribedSymbols.push(cleanSymbol);
        });

        socket.emit('unsubscribed', { symbols: unsubscribedSymbols });
        console.log(`📊 Client ${clientId} unsubscribed from: ${unsubscribedSymbols.join(', ')}`);

        // Stop update interval if no more subscriptions
        if (subscriptions.size === 0 && updateInterval) {
          stopUpdateInterval();
        }
      } catch (error) {
        console.error('Unsubscription error:', error);
        socket.emit('unsubscription_error', { error: 'Unsubscription failed' });
      }
    });

    // Handle watchlist subscription (convenience method)
    socket.on('subscribe_watchlist', async (data) => {
      try {
        const { userId } = data;
        
        if (!userId) {
          socket.emit('subscription_error', { error: 'User ID required for watchlist subscription' });
          return;
        }

        // Get user's default watchlist
        const watchlist = await Watchlist.findDefaultWatchlist(userId);
        
        if (!watchlist || !watchlist.items.length) {
          socket.emit('watchlist_subscribed', { symbols: [], message: 'No watchlist found or empty' });
          return;
        }

        const symbols = watchlist.items.map(item => item.symbol);
        
        // Subscribe to watchlist symbols
        socket.emit('subscribe', { symbols });
        
      } catch (error) {
        console.error('Watchlist subscription error:', error);
        socket.emit('subscription_error', { error: 'Failed to subscribe to watchlist' });
      }
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`📱 Client disconnected: ${clientId} (${reason})`);
      
      const connection = connections.get(clientId);
      if (connection) {
        // Remove all subscriptions for this client
        connection.subscriptions.forEach(symbol => {
          if (subscriptions.has(symbol)) {
            subscriptions.get(symbol).delete(clientId);
            
            if (subscriptions.get(symbol).size === 0) {
              subscriptions.delete(symbol);
            }
          }
        });
      }

      connections.delete(clientId);

      // Stop update interval if no more subscriptions
      if (subscriptions.size === 0 && updateInterval) {
        stopUpdateInterval();
      }
    });
  });
};

// Send initial stock data for newly subscribed symbols
const sendInitialStockData = async (socket, symbols) => {
  try {
    const stockData = [];
    const errors = [];

    // Fetch data for each symbol
    for (const symbol of symbols) {
      try {
        let stock = await Stock.findOne({ 
          symbol: symbol.toUpperCase(), 
          isActive: true 
        });

        // If not in database or stale, fetch from API
        const fiveMinutesAgo = new Date(Date.now() - 300000);
        
        if (!stock || stock.lastUpdated < fiveMinutesAgo) {
          try {
            const apiData = await getStockPrice(symbol);
            
            if (apiData) {
              stock = await Stock.findOneAndUpdate(
                { symbol: symbol.toUpperCase() },
                {
                  ...apiData,
                  lastUpdated: new Date()
                },
                { 
                  upsert: true, 
                  new: true,
                  runValidators: true
                }
              );
            }
          } catch (apiError) {
            console.error(`API error for initial data ${symbol}:`, apiError);
          }
        }

        if (stock) {
          stockData.push(stock);
        } else {
          errors.push({ symbol, error: 'Unable to fetch initial data' });
        }
      } catch (error) {
        errors.push({ symbol, error: error.message });
      }
    }

    socket.emit('initial_data', { stocks: stockData, errors });
  } catch (error) {
    console.error('Error sending initial stock data:', error);
    socket.emit('initial_data_error', { error: 'Failed to fetch initial data' });
  }
};

// Start the update interval for real-time data
const startUpdateInterval = (io) => {
  console.log('🔄 Starting real-time update interval');
  
  updateInterval = setInterval(async () => {
    try {
      await broadcastStockUpdates(io);
    } catch (error) {
      console.error('Error in update interval:', error);
    }
  }, UPDATE_INTERVAL);
};

// Stop the update interval
const stopUpdateInterval = () => {
  if (updateInterval) {
    console.log('⏹️ Stopping real-time update interval');
    clearInterval(updateInterval);
    updateInterval = null;
  }
};

// Broadcast stock updates to all subscribed clients
const broadcastStockUpdates = async (io) => {
  if (subscriptions.size === 0) {
    return;
  }

  const symbols = Array.from(subscriptions.keys());
  console.log(`🔄 Broadcasting updates for ${symbols.length} symbols`);

  try {
    // Fetch updated data for all subscribed symbols
    const batchSize = 10; // Process in batches to avoid API limits
    const allUpdates = [];
    const allErrors = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      try {
        const { stocks, errors } = await getMultipleStockPrices(batch);
        allUpdates.push(...stocks);
        allErrors.push(...errors);

        // Update database
        for (const stockData of stocks) {
          try {
            await Stock.findOneAndUpdate(
              { symbol: stockData.symbol },
              {
                ...stockData,
                lastUpdated: new Date()
              },
              { 
                upsert: true, 
                new: true,
                runValidators: true
              }
            );
          } catch (dbError) {
            console.error(`Database update error for ${stockData.symbol}:`, dbError);
          }
        }
      } catch (batchError) {
        console.error(`Batch update error:`, batchError);
        batch.forEach(symbol => {
          allErrors.push({ symbol, error: batchError.message });
        });
      }

      // Small delay between batches to respect API limits
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Broadcast updates to relevant clients
    allUpdates.forEach(stock => {
      const symbol = stock.symbol;
      const subscribedClients = subscriptions.get(symbol);
      
      if (subscribedClients) {
        subscribedClients.forEach(clientId => {
          const connection = connections.get(clientId);
          if (connection && connection.socket.connected) {
            connection.socket.emit('stock_update', {
              symbol,
              data: stock,
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    });

    // Broadcast errors if any
    if (allErrors.length > 0) {
      allErrors.forEach(error => {
        const symbol = error.symbol;
        const subscribedClients = subscriptions.get(symbol);
        
        if (subscribedClients) {
          subscribedClients.forEach(clientId => {
            const connection = connections.get(clientId);
            if (connection && connection.socket.connected) {
              connection.socket.emit('stock_error', {
                symbol,
                error: error.error,
                timestamp: new Date().toISOString()
              });
            }
          });
        }
      });
    }
  } catch (error) {
    console.error('Error broadcasting stock updates:', error);
  }
};

// Get WebSocket statistics
export const getWebSocketStats = () => {
  return {
    activeConnections: connections.size,
    totalSubscriptions: Array.from(subscriptions.values()).reduce((total, clients) => total + clients.size, 0),
    uniqueSymbols: subscriptions.size,
    updateIntervalActive: !!updateInterval,
    updateInterval: UPDATE_INTERVAL
  };
};

// Force update for specific symbols
export const forceStockUpdate = async (io, symbols) => {
  if (!symbols || !Array.isArray(symbols)) {
    throw new Error('Symbols array is required');
  }

  try {
    const { stocks, errors } = await getMultipleStockPrices(symbols);

    // Update database and broadcast
    for (const stock of stocks) {
      await Stock.findOneAndUpdate(
        { symbol: stock.symbol },
        {
          ...stock,
          lastUpdated: new Date()
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      // Broadcast to subscribed clients
      const subscribedClients = subscriptions.get(stock.symbol);
      if (subscribedClients) {
        subscribedClients.forEach(clientId => {
          const connection = connections.get(clientId);
          if (connection && connection.socket.connected) {
            connection.socket.emit('stock_update', {
              symbol: stock.symbol,
              data: stock,
              timestamp: new Date().toISOString(),
              forced: true
            });
          }
        });
      }
    }

    return { stocks, errors };
  } catch (error) {
    console.error('Error in forced stock update:', error);
    throw error;
  }
};
