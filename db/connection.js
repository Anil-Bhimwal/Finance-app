import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/finance-dashboard";

    const options = {
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds

      // Additional options for production
      ...(process.env.NODE_ENV === "production" && {
        ssl: true,
        sslValidate: true,
      }),
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      try {
        await mongoose.connection.close();
        console.log(
          "📴 MongoDB connection closed due to application termination"
        );
        process.exit(0);
      } catch (error) {
        console.error("Error closing MongoDB connection:", error);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log("📴 MongoDB connection closed");
  } catch (error) {
    console.error("Error disconnecting from MongoDB:", error);
  }
};

/**
 * Check if database connection is ready
 */
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get database connection status
 */
export const getConnectionStatus = () => {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    state: states[mongoose.connection.readyState] || "unknown",
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    models: Object.keys(mongoose.connection.models),
  };
};

/**
 * Database health check
 */
export const healthCheck = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();

    return {
      status: "healthy",
      message: "Database is responding",
      ping: result,
      connection: getConnectionStatus(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: "Database is not responding",
      error: error.message,
      connection: getConnectionStatus(),
    };
  }
};
