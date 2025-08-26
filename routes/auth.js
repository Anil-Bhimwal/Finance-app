import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../db/models/User.js';

const router = express.Router();

/**
 * POST /api/auth/webhook
 * Clerk webhook to handle user events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const evt = req.body;
    
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log(`Unhandled webhook event type: ${evt.type}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      error: 'Failed to process webhook',
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/user
 * Get current user profile
 */
router.get('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    
    let user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      // Create user if doesn't exist (fallback)
      user = new User({
        clerkId: userId,
        email: req.auth.sessionClaims?.email || '',
        firstName: req.auth.sessionClaims?.firstName || '',
        lastName: req.auth.sessionClaims?.lastName || '',
        preferences: {
          theme: 'light',
          notifications: {
            priceAlerts: true,
            marketNews: true,
            emailUpdates: false
          },
          defaultCurrency: 'USD'
        }
      });
      await user.save();
    }

    res.json({
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile',
      message: error.message 
    });
  }
});

/**
 * PUT /api/auth/user/preferences
 * Update user preferences
 */
router.put('/user/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({ error: 'Preferences are required' });
    }

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences (merge with existing)
    user.preferences = {
      ...user.preferences,
      ...preferences
    };

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences',
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/user/activity
 * Log user activity (login, page views, etc.)
 */
router.post('/user/activity', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { action, metadata } = req.body;

    const user = await User.findOne({ clerkId: userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last login time for login events
    if (action === 'login') {
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Log activity (could be expanded to store in separate collection)
    console.log(`User activity - ${userId}: ${action}`, metadata);

    res.json({ message: 'Activity logged successfully' });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ 
      error: 'Failed to log activity',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/auth/user
 * Delete user account and all associated data
 */
router.delete('/user', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;

    // Delete user and all associated data
    await Promise.all([
      User.deleteOne({ clerkId: userId }),
      // Add other cleanup operations here (watchlists, alerts, etc.)
    ]);

    res.json({ message: 'User account deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      error: 'Failed to delete user account',
      message: error.message 
    });
  }
});

/**
 * Helper function to handle user creation
 */
async function handleUserCreated(userData) {
  try {
    const user = new User({
      clerkId: userData.id,
      email: userData.email_addresses[0]?.email_address || '',
      firstName: userData.first_name || '',
      lastName: userData.last_name || '',
      imageUrl: userData.image_url || '',
      preferences: {
        theme: 'light',
        notifications: {
          priceAlerts: true,
          marketNews: true,
          emailUpdates: false
        },
        defaultCurrency: 'USD'
      },
      createdAt: new Date(userData.created_at)
    });

    await user.save();
    console.log(`User created: ${user.email}`);
  } catch (error) {
    console.error('Error creating user:', error);
  }
}

/**
 * Helper function to handle user updates
 */
async function handleUserUpdated(userData) {
  try {
    const user = await User.findOne({ clerkId: userData.id });
    
    if (user) {
      user.email = userData.email_addresses[0]?.email_address || user.email;
      user.firstName = userData.first_name || user.firstName;
      user.lastName = userData.last_name || user.lastName;
      user.imageUrl = userData.image_url || user.imageUrl;
      
      await user.save();
      console.log(`User updated: ${user.email}`);
    }
  } catch (error) {
    console.error('Error updating user:', error);
  }
}

/**
 * Helper function to handle user deletion
 */
async function handleUserDeleted(userData) {
  try {
    await User.deleteOne({ clerkId: userData.id });
    console.log(`User deleted: ${userData.id}`);
  } catch (error) {
    console.error('Error deleting user:', error);
  }
}

export default router;
