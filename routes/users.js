import express from 'express';
import User from '../db/models/User.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get user profile (for authenticated users)
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update user preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;
    
    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get user API usage stats
router.get('/usage', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const usageStats = user.checkApiLimit();

    res.json({
      subscription: user.subscription,
      usage: usageStats,
      lastReset: user.apiUsage.lastResetDate
    });
  } catch (error) {
    console.error('Error fetching user usage:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// For development/demo purposes - get or create a demo user
router.post('/demo', async (req, res) => {
  try {
    const demoEmail = 'demo@financedashboard.com';
    
    let user = await User.findOne({ email: demoEmail });
    
    if (!user) {
      user = new User({
        email: demoEmail,
        password: 'demo123', // In production, this would be hashed
        firstName: 'Demo',
        lastName: 'User',
        isEmailVerified: true,
        preferences: {
          theme: 'dark',
          currency: 'USD',
          refreshInterval: 30,
          notifications: {
            priceAlerts: true,
            dailySummary: false,
            weeklyReport: false
          },
          defaultChartPeriod: '1D',
          displayColumns: ['symbol', 'name', 'price', 'change', 'changePercent', 'volume']
        }
      });
      
      await user.save();
    }

    // In a real app, you'd generate a JWT token here
    res.json({
      user,
      token: 'demo-token-123', // Placeholder token
      message: 'Demo user created/retrieved successfully'
    });
  } catch (error) {
    console.error('Error creating demo user:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email } = req.body;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
      user.isEmailVerified = false; // Would trigger email verification in production
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get user dashboard stats
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // In a real app, you'd calculate these from user's watchlists and activities
    const stats = {
      totalWatchlists: 1, // Placeholder
      totalStocks: 0,     // Would come from watchlist count
      alertsActive: 0,    // Count of active price alerts
      lastLogin: new Date(),
      apiCallsToday: 0,   // From user.apiUsage
      favoriteStocks: [] // Most viewed/traded stocks
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

export default router;
