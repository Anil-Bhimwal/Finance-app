import mongoose from 'mongoose';

const stockItemSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  exchange: {
    type: String,
    trim: true,
    uppercase: true
  },
  
  type: {
    type: String,
    enum: ['stock', 'etf', 'mutual_fund', 'crypto', 'index'],
    default: 'stock'
  },
  
  // Price alert settings
  alerts: {
    enabled: {
      type: Boolean,
      default: false
    },
    priceTarget: {
      type: Number,
      min: 0
    },
    condition: {
      type: String,
      enum: ['above', 'below'],
      default: 'above'
    },
    triggered: {
      type: Boolean,
      default: false
    },
    lastTriggered: {
      type: Date
    }
  },
  
  // User notes
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Position information (optional)
  position: {
    shares: {
      type: Number,
      min: 0
    },
    avgCost: {
      type: Number,
      min: 0
    },
    totalValue: {
      type: Number,
      min: 0
    }
  },
  
  // Tracking metadata
  addedAt: {
    type: Date,
    default: Date.now
  },
  
  lastViewedAt: {
    type: Date,
    default: Date.now
  },
  
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  _id: true
});

const watchlistSchema = new mongoose.Schema({
  // User reference (Clerk ID)
  userId: {
    type: String,
    required: true,
    index: true
  },
  
  // Watchlist name (for multiple watchlists per user)
  name: {
    type: String,
    default: 'My Watchlist',
    trim: true,
    maxlength: 100
  },
  
  // Description
  description: {
    type: String,
    maxlength: 500
  },
  
  // Array of stocks
  stocks: [stockItemSchema],
  
  // Watchlist settings
  settings: {
    isDefault: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    autoSort: {
      type: String,
      enum: ['none', 'alphabetical', 'performance', 'volume', 'market_cap'],
      default: 'none'
    },
    sortDirection: {
      type: String,
      enum: ['asc', 'desc'],
      default: 'asc'
    }
  },
  
  // Sharing information
  sharing: {
    isShared: {
      type: Boolean,
      default: false
    },
    shareToken: {
      type: String,
      unique: true,
      sparse: true
    },
    sharedWith: [{
      userId: String,
      permission: {
        type: String,
        enum: ['view', 'edit'],
        default: 'view'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Performance tracking
  performance: {
    totalValue: {
      type: Number,
      default: 0
    },
    totalChange: {
      type: Number,
      default: 0
    },
    totalChangePercent: {
      type: Number,
      default: 0
    },
    lastCalculated: {
      type: Date
    }
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
watchlistSchema.index({ userId: 1, 'settings.isDefault': 1 });
watchlistSchema.index({ userId: 1, name: 1 });
watchlistSchema.index({ 'sharing.shareToken': 1 });
watchlistSchema.index({ 'stocks.symbol': 1 });
watchlistSchema.index({ createdAt: -1 });

// Compound index for user's watchlists
watchlistSchema.index({ userId: 1, createdAt: -1 });

// Virtual for stock count
watchlistSchema.virtual('stockCount').get(function() {
  return this.stocks.length;
});

// Virtual for unique symbols
watchlistSchema.virtual('symbols').get(function() {
  return this.stocks.map(stock => stock.symbol);
});

// Instance methods
watchlistSchema.methods.addStock = function(stockData) {
  // Check if stock already exists
  const existingStock = this.stocks.find(
    stock => stock.symbol.toLowerCase() === stockData.symbol.toLowerCase()
  );
  
  if (existingStock) {
    throw new Error('Stock already exists in watchlist');
  }
  
  this.stocks.push({
    ...stockData,
    symbol: stockData.symbol.toUpperCase(),
    addedAt: new Date()
  });
  
  return this.save();
};

watchlistSchema.methods.removeStock = function(symbol) {
  const stockIndex = this.stocks.findIndex(
    stock => stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
  
  if (stockIndex === -1) {
    throw new Error('Stock not found in watchlist');
  }
  
  this.stocks.splice(stockIndex, 1);
  return this.save();
};

watchlistSchema.methods.updateStock = function(symbol, updates) {
  const stock = this.stocks.find(
    stock => stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
  
  if (!stock) {
    throw new Error('Stock not found in watchlist');
  }
  
  Object.assign(stock, updates);
  return this.save();
};

watchlistSchema.methods.recordView = function(symbol) {
  const stock = this.stocks.find(
    stock => stock.symbol.toLowerCase() === symbol.toLowerCase()
  );
  
  if (stock) {
    stock.lastViewedAt = new Date();
    stock.viewCount += 1;
    return this.save();
  }
  
  return Promise.resolve(this);
};

watchlistSchema.methods.reorderStocks = function(symbolOrder) {
  const reorderedStocks = [];
  
  // Add stocks in the specified order
  for (const symbol of symbolOrder) {
    const stock = this.stocks.find(
      s => s.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (stock) {
      reorderedStocks.push(stock);
    }
  }
  
  // Add any stocks not in the order array
  for (const stock of this.stocks) {
    if (!reorderedStocks.find(s => s.symbol === stock.symbol)) {
      reorderedStocks.push(stock);
    }
  }
  
  this.stocks = reorderedStocks;
  return this.save();
};

watchlistSchema.methods.generateShareToken = function() {
  if (!this.sharing.shareToken) {
    this.sharing.shareToken = mongoose.Types.ObjectId().toString();
    this.sharing.isShared = true;
  }
  return this.save();
};

watchlistSchema.methods.revokeSharing = function() {
  this.sharing.isShared = false;
  this.sharing.shareToken = undefined;
  this.sharing.sharedWith = [];
  return this.save();
};

// Static methods
watchlistSchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ 'settings.isDefault': -1, createdAt: -1 });
};

watchlistSchema.statics.findDefaultByUserId = function(userId) {
  return this.findOne({ userId, 'settings.isDefault': true });
};

watchlistSchema.statics.findByShareToken = function(shareToken) {
  return this.findOne({ 
    'sharing.shareToken': shareToken,
    'sharing.isShared': true 
  });
};

watchlistSchema.statics.findPublicWatchlists = function(limit = 10) {
  return this.find({ 'settings.isPublic': true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Pre-save middleware
watchlistSchema.pre('save', function(next) {
  // Ensure only one default watchlist per user
  if (this.settings.isDefault && this.isModified('settings.isDefault')) {
    this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { $set: { 'settings.isDefault': false } }
    ).exec();
  }
  
  // Remove duplicate stocks
  const uniqueStocks = [];
  const seenSymbols = new Set();
  
  for (const stock of this.stocks) {
    const symbolKey = stock.symbol.toLowerCase();
    if (!seenSymbols.has(symbolKey)) {
      seenSymbols.add(symbolKey);
      uniqueStocks.push(stock);
    }
  }
  
  this.stocks = uniqueStocks;
  
  next();
});

// Post-save middleware
watchlistSchema.post('save', function(doc) {
  console.log(`Watchlist ${doc.name} for user ${doc.userId} has been saved`);
});

export const Watchlist = mongoose.model('Watchlist', watchlistSchema);