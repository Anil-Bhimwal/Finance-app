import { clerkClient } from "@clerk/clerk-sdk-node";

/**
 * Authentication middleware that requires a valid Clerk session
 * This middleware ensures the user is authenticated before accessing protected routes
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to access this resource",
        code: "UNAUTHORIZED",
      });
    }

    const token = authHeader.substring(7);

    // Verify the session token with Clerk
    const session = await clerkClient.sessions.verifySession(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!session) {
      return res.status(401).json({
        error: "Invalid session",
        message: "Your session is invalid or expired",
        code: "INVALID_SESSION",
      });
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      session,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // Send a structured error response
    return res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
      code: "UNAUTHORIZED",
    });
  }
};

/**
 * Optional authentication middleware
 * Adds auth context if available but doesn't require authentication
 */
export const optionalAuth = (req, res, next) => {
  // If there's an authorization header, try to validate it
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    // Apply Clerk auth middleware if token is present
    return requireAuth(req, res, next);
  }

  // Continue without authentication
  next();
};

/**
 * Middleware to extract user information from Clerk auth
 * Should be used after requireAuth middleware
 */
export const extractUserInfo = (req, res, next) => {
  if (req.auth?.userId) {
    req.user = {
      id: req.auth.userId,
      sessionId: req.auth.sessionId,
      ...req.auth.sessionClaims,
    };
  }

  next();
};

/**
 * Middleware to check if user has specific permissions
 * @param {string[]} requiredPermissions - Array of required permissions
 */
export const requirePermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.auth?.userId) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to access this resource",
      });
    }

    // Check if user has required permissions
    const userPermissions = req.auth.sessionClaims?.permissions || [];
    const hasPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermissions) {
      return res.status(403).json({
        error: "Insufficient permissions",
        message: "You do not have permission to access this resource",
        required: requiredPermissions,
        current: userPermissions,
      });
    }

    next();
  };
};

/**
 * Middleware to validate API key for external integrations
 */
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({
      error: "API key required",
      message: "X-API-Key header is required for this endpoint",
    });
  }

  // Validate API key (in production, store these securely)
  const validApiKeys = process.env.VALID_API_KEYS?.split(",") || [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      error: "Invalid API key",
      message: "The provided API key is not valid",
    });
  }

  next();
};

/**
 * Rate limiting middleware for authenticated users
 * Implements a simple in-memory rate limiter
 */
const rateLimitStore = new Map();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.auth?.userId || req.ip,
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore
        .get(key)
        .filter((timestamp) => timestamp > windowStart);
      rateLimitStore.set(key, requests);
    }

    // Get current request count
    const currentRequests = rateLimitStore.get(key) || [];

    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    currentRequests.push(now);
    rateLimitStore.set(key, currentRequests);

    // Add rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": maxRequests - currentRequests.length,
      "X-RateLimit-Reset": new Date(now + windowMs).toISOString(),
    });

    next();
  };
};
