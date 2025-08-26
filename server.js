import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import stockRoutes from './routes/stocks.js';
import watchlistRoutes from './routes/watchlist.js';
import authRoutes from './routes/auth.js';

// Import middleware
import { clerkMiddleware } from './middleware/clerk.js';
import { errorHandler } from './middleware/errorHandler.js';

// Import database connection
import { connectDB } from './db/connection.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

// Connect to database
connectDB();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Clerk authentication middleware
app.use(clerkMiddleware);

// Development mode - Use Vite middleware
if (isDevelopment) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    root: path.join(__dirname, 'client'),
    appType: 'spa'
  });
  
  app.use(vite.ssrFixStacktrace);
  app.use(vite.middlewares);
  console.log('🔥 Development mode: Using Vite middleware with HMR');
} else {
  // Production mode - Serve built static files
  app.use(express.static(path.join(__dirname, 'client/dist')));
  console.log('🚀 Production mode: Serving static build files');
}

// API Routes
app.use('/api/stocks', stockRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Production fallback - serve React app for all non-API routes
if (!isDevelopment) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('join-watchlist', (userId) => {
    socket.join(`watchlist-${userId}`);
    console.log(`User ${userId} joined their watchlist room`);
  });
  
  socket.on('subscribe-stock', (symbol) => {
    socket.join(`stock-${symbol}`);
    console.log(`Client subscribed to ${symbol}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`
🎯 Finance Dashboard Server Running!
📍 Port: ${PORT}
🔧 Mode: ${process.env.NODE_ENV || 'development'}
🌐 URL: http://localhost:${PORT}
⚡ WebSockets: Enabled
${isDevelopment ? '🔥 HMR: Active via Vite' : '🚀 Static: Serving from client/dist'}
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

export { io };