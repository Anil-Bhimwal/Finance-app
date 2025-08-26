import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Clerk user ID (primary identifier)
  clerkId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Basic user information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  firstName: {
    type: String,
    trim: true
  },
  
  lastName: {
    type: String,
    trim: true
  },
  
  imageUrl: {
    type: String
  },
  
  // User preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    
    defaultCurrency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    
    notifications: {
      priceAlerts: {
        type: Boolean,
        default: true
      },
      marketNews: {
        type: Boolean,
        default: true
      },
      emailUpdates: {
        type: Boolean,
        default: false
      },
      pushNotifications: {
        type: Boolean,
        default: true
      }
    },
    
    dashboard: {
      defaultView: {
        type: String,
        enum: ['grid', 'list', 'cards'],
        default: 'cards'
      },
      autoRefresh: {
        type: Boolean,
        default: true
      },
      refreshInterval: {
        type: Number,
        default: 30, // seconds
        min: 10,
        max: 300
      }
    }
  },
  
  // Subscription information
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'trial'],
      default: 'active'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    stripeCustomerId: {
      type: String
    },
    stripeSubscriptionId: {
      type: String
    }
  },
  
  // API usage tracking
  apiUsage: {
    requests: {
      type: Number,
      default: 0
    },
    lastReset: {
      type: Date,
      default: Date.now
    },
    monthlyLimit: {
      type: Number,
      default: 1000 // Free tier limit
    }
  },
  
  // Activity tracking
  lastLoginAt: {
    type: Date,
    default: Date.now
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
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
userSchema.index({ email: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ 'subscription.status': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Instance methods
userSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

userSchema.methods.incrementApiUsage = function() {
  const now = new Date();
  const lastReset = new Date(this.apiUsage.lastReset);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Reset counter if it's a new month
  if (lastReset < monthStart) {
    this.apiUsage.requests = 1;
    this.apiUsage.lastReset = now;
  } else {
    this.apiUsage.requests += 1;
  }
  
  return this.save();
};

userSchema.methods.canMakeApiRequest = function() {
  const now = new Date();
  const lastReset = new Date(this.apiUsage.lastReset);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Reset counter if it's a new month
  if (lastReset < monthStart) {
    return true;
  }
  
  return this.apiUsage.requests < this.apiUsage.monthlyLimit;
};

userSchema.methods.getRemainingApiRequests = function() {
  const now = new Date();
  const lastReset = new Date(this.apiUsage.lastReset);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Reset counter if it's a new month
  if (lastReset < monthStart) {
    return this.apiUsage.monthlyLimit;
  }
  
  return Math.max(0, this.apiUsage.monthlyLimit - this.apiUsage.requests);
};

// Static methods
userSchema.statics.findByClerkId = function(clerkId) {
  return this.findOne({ clerkId });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

userSchema.statics.findBySubscriptionStatus = function(status) {
  return this.find({ 'subscription.status': status });
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

// Post-save middleware
userSchema.post('save', function(doc) {
  console.log(`User ${doc.email} has been saved`);
});

export const User = mongoose.model('User', userSchema);