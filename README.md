# 📊 Finance Dashboard - Real-Time Stock & Mutual Fund Tracker

A comprehensive full-stack financial dashboard built with React, Node.js, and MongoDB that provides real-time stock and mutual fund tracking with advanced features like watchlists, charts, and personalized alerts.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)

## 🎯 Features

### 📈 Real-Time Data
- Live stock and mutual fund price updates via WebSockets
- Real-time price alerts and notifications
- Market data from IEX Cloud and Alpha Vantage APIs
- Automatic reconnection and fallback mechanisms

### 👤 User Management
- Secure authentication with Clerk.dev
- User preferences and settings
- Subscription management (free/premium tiers)
- Activity tracking and analytics

### 📋 Watchlist Management
- Create and manage multiple watchlists
- Add/remove stocks with drag-and-drop reordering
- Export/import watchlists as CSV
- Share watchlists with other users
- Price alerts and notifications

### 📊 Data Visualization
- Interactive charts with Chart.js and Recharts
- Multiple timeframe support (1D, 1W, 1M, 1Y)
- Historical price data and trends
- Performance analytics and metrics

### 🎨 Modern UI/UX
- Dark/light theme support with system preference detection
- Fully responsive design for all devices
- ShadCN UI components with Tailwind CSS
- Smooth animations and transitions

### 🔧 Advanced Features
- Search functionality for stocks and funds
- Real-time market news and updates
- Portfolio tracking and performance metrics
- API rate limiting and caching
- Error monitoring and logging

## 🏗️ Architecture

### Frontend
- **React 18** with modern hooks and context
- **ShadCN UI** for consistent, accessible components
- **Tailwind CSS** for utility-first styling
- **Vite** for fast development and building
- **Socket.IO** for real-time communication

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Redis** for caching (with memory fallback)
- **Clerk.dev** for authentication
- **Socket.IO** for WebSocket connections

### Development Workflow
- **Unified server** - Single Express server for both frontend and API
- **Hot Module Replacement** via Vite middleware in development
- **Environment-based configuration** for dev/production
- **ESLint** and **Prettier** for code quality

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB instance (local or cloud)
- Redis instance (optional, uses memory cache fallback)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/finance-dashboard.git
cd finance-dashboard

# Install all dependencies (root + client)
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment templates
cp env.example .env
cp client/env.example client/.env

# Edit .env files with your configuration
nano .env
nano client/.env
```

### 3. Required API Keys

1. **Clerk Authentication**
   - Sign up at [clerk.dev](https://clerk.dev)
   - Create a new application
   - Copy `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

2. **Stock Data APIs**
   - [IEX Cloud](https://iexcloud.io) - Preferred for real-time data
   - [Alpha Vantage](https://www.alphavantage.co) - Free tier alternative

3. **Database**
   - MongoDB URI (local: `mongodb://localhost:27017/finance-dashboard`)
   - Redis URL (optional: `redis://localhost:6379`)

### 4. Start Development

```bash
# Start the unified development server
npm run dev
```

Visit `http://localhost:3000` to see your application!

## 📁 Project Structure

```
finance-dashboard/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/         # ShadCN UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API service functions
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── routes/                 # Express API routes
│   ├── auth.js            # Authentication routes
│   ├── stocks.js          # Stock data routes
│   └── watchlist.js       # Watchlist management
├── middleware/             # Express middleware
│   ├── auth.js            # Authentication middleware
│   ├── clerk.js           # Clerk integration
│   └── errorHandler.js    # Error handling
├── db/                     # Database configuration
│   ├── connection.js      # MongoDB connection
│   └── models/            # Mongoose models
├── utils/                  # Utility modules
│   └── cache.js           # Caching implementation
├── config/                 # Configuration files
├── server.js              # Main server file
└── package.json           # Backend dependencies
```

## 🔧 Configuration

### Environment Variables

#### Server (.env)
```bash
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/finance-dashboard
REDIS_URL=redis://localhost:6379
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
IEX_CLOUD_API_KEY=pk_...
ALPHA_VANTAGE_API_KEY=demo
```

#### Client (client/.env)
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

### Database Setup

#### MongoDB
```bash
# Local MongoDB
mongod --dbpath /path/to/data

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env with your Atlas connection string
```

#### Redis (Optional)
```bash
# Local Redis
redis-server

# Or use Redis Cloud
# Update REDIS_URL in .env with your Redis connection string
```

## 📋 Available Scripts

### Root Level
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run install:all  # Install all dependencies
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Client Level
```bash
cd client
npm run dev          # Start Vite dev server
npm run build        # Build client for production
npm run preview      # Preview production build
npm run lint         # Lint client code
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/webhook` - Clerk webhook handler
- `GET /api/auth/user` - Get current user
- `PUT /api/auth/user/preferences` - Update user preferences

### Stocks
- `GET /api/stocks/quote/:symbol` - Get stock quote
- `GET /api/stocks/search?q=query` - Search stocks
- `GET /api/stocks/history/:symbol` - Get historical data
- `GET /api/stocks/trending` - Get trending stocks

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist/add` - Add stock to watchlist
- `DELETE /api/watchlist/remove/:symbol` - Remove stock
- `PUT /api/watchlist/reorder` - Reorder watchlist
- `GET /api/watchlist/export` - Export as CSV

### System
- `GET /api/health` - Health check endpoint

## 🚀 Deployment

### Build for Production

```bash
# Build the client
npm run build

# Start production server
npm start
```

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database URLs
3. Set up proper SSL certificates
4. Configure reverse proxy (Nginx/Apache)

### Deployment Platforms

#### Render
```bash
# Build command
npm run build

# Start command
npm start
```

#### Railway
```bash
# Dockerfile included for containerized deployment
```

#### Vercel (Serverless)
```bash
# Configure for serverless deployment
# See vercel.json for configuration
```

## 🛠️ Development

### Code Style
- ESLint configuration with React and Node.js rules
- Prettier for consistent formatting
- Husky for pre-commit hooks

### Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Debugging
```bash
# Debug server
npm run dev:debug

# Debug client
cd client && npm run dev -- --debug
```

## 📊 Performance

### Caching Strategy
- Redis for API response caching
- Memory cache fallback
- CDN for static assets
- Browser caching headers

### Optimization
- Code splitting with Vite
- Lazy loading of components
- Image optimization
- Bundle analysis

### Monitoring
- Error tracking with Sentry
- Performance monitoring
- API rate limiting
- Health checks

## 🔒 Security

### Authentication
- Clerk.dev for secure user authentication
- JWT token validation
- Session management
- Role-based access control

### Data Protection
- Environment variable validation
- Input sanitization
- Rate limiting
- CORS configuration
- Helmet.js security headers

### API Security
- API key validation
- Request rate limiting
- Error message sanitization
- Audit logging

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Test on multiple devices/browsers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [IEX Cloud](https://iexcloud.io) for financial data API
- [Alpha Vantage](https://www.alphavantage.co) for free stock API
- [Clerk.dev](https://clerk.dev) for authentication
- [ShadCN](https://ui.shadcn.com) for UI components
- [Tailwind CSS](https://tailwindcss.com) for styling

## 📞 Support

- 📧 Email: support@finance-dashboard.com
- 💬 Discord: [Join our community](https://discord.gg/finance-dashboard)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/finance-dashboard/issues)
- 📖 Docs: [Documentation](https://docs.finance-dashboard.com)

---

**Built with ❤️ by [Anil Bhimwal](https://github.com/anilbhimwal)**
