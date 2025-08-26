import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  exchange: {
    type: String,
    required: true,
    trim: true
  },
  sector: {
    type: String,
    trim: true
  },
  industry: {
    type: String,
    trim: true
  },
  currentPrice: {
    type: Number,
    required: true,
    min: 0
  },
  previousClose: {
    type: Number,
    required: true,
    min: 0
  },
  change: {
    type: Number,
    required: true
  },
  changePercent: {
    type: Number,
    required: true
  },
  volume: {
    type: Number,
    min: 0
  },
  marketCap: {
    type: Number,
    min: 0
  },
  peRatio: {
    type: Number
  },
  dividendYield: {
    type: Number,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better performance
stockSchema.index({ symbol: 1, exchange: 1 });
stockSchema.index({ lastUpdated: -1 });
stockSchema.index({ changePercent: -1 }); // For top gainers/losers
stockSchema.index({ volume: -1 });

// Virtual for formatted change
stockSchema.virtual('formattedChange').get(function() {
  const sign = this.change >= 0 ? '+' : '';
  return `${sign}${this.change.toFixed(2)} (${sign}${this.changePercent.toFixed(2)}%)`;
});

// Static method to find top gainers
stockSchema.statics.getTopGainers = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ changePercent: -1 })
    .limit(limit);
};

// Static method to find top losers
stockSchema.statics.getTopLosers = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ changePercent: 1 })
    .limit(limit);
};

// Static method to search stocks
stockSchema.statics.searchStocks = function(query, limit = 20) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    isActive: true,
    $or: [
      { symbol: searchRegex },
      { name: searchRegex }
    ]
  }).limit(limit);
};

export default mongoose.model('Stock', stockSchema);
