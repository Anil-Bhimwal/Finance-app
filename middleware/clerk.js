import { clerkClient } from "@clerk/clerk-sdk-node";

/**
 * Clerk middleware for authentication
 * This middleware adds Clerk's authentication context to all requests
 */
export const clerkMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      // Verify the session token with Clerk
      const session = await clerkClient.sessions.verifySession(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      if (session) {
        req.auth = {
          userId: session.userId,
          sessionId: session.id,
          session,
        };
      }
    }

    next();
  } catch (error) {
    console.error("Clerk authentication error:", error);
    next();
  }
};

/**
 * Middleware to require authentication
 * Use this on routes that require a logged-in user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required",
        message: "You must be logged in to access this resource",
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
      });
    }

    req.auth = {
      userId: session.userId,
      sessionId: session.id,
      session,
    };

    next();
  } catch (error) {
    console.error("Authentication required error:", error);
    res.status(401).json({
      error: "Authentication required",
      message: "You must be logged in to access this resource",
    });
  }
};
