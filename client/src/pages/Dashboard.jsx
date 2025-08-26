import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { TrendingUp, TrendingDown, Plus, Search } from 'lucide-react'

const Dashboard = () => {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data for now - will be replaced with real API calls
  useEffect(() => {
    const mockStocks = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 175.25,
        change: 2.85,
        changePercent: 1.65,
        volume: '64.2M',
        marketCap: '2.75T'
      },
      {
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        price: 2825.50,
        change: -15.20,
        changePercent: -0.53,
        volume: '28.1M',
        marketCap: '1.85T'
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        price: 420.10,
        change: 8.75,
        changePercent: 2.13,
        volume: '45.8M',
        marketCap: '3.12T'
      },
      {
        symbol: 'TSLA',
        name: 'Tesla, Inc.',
        price: 245.80,
        change: -12.40,
        changePercent: -4.81,
        volume: '95.2M',
        marketCap: '780B'
      }
    ]

    // Simulate API loading delay
    setTimeout(() => {
      setStocks(mockStocks)
      setLoading(false)
    }, 1000)
  }, [])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const formatChange = (change, changePercent) => {
    const isPositive = change >= 0
    const prefix = isPositive ? '+' : ''
    return {
      change: `${prefix}${change.toFixed(2)}`,
      changePercent: `${prefix}${changePercent.toFixed(2)}%`,
      isPositive
    }
  }

  const filteredStocks = stocks.filter(stock =>
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your favorite stocks and mutual funds in real-time
          </p>
        </div>
        <Button className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add to Watchlist
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search stocks..."
          className="w-full pl-8 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Market Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-profit">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Change</CardTitle>
            <TrendingUp className="h-4 w-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-profit">+$1,234.56</div>
            <p className="text-xs text-profit">
              +2.8% today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Watchlist Items</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              4 stocks, 8 funds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <TrendingDown className="h-4 w-4 text-loss" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-loss">
              2 price alerts triggered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stocks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Market Overview</CardTitle>
          <CardDescription>
            Real-time stock prices and market data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="skeleton h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="skeleton h-4 w-1/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStocks.map((stock) => {
                const { change, changePercent, isPositive } = formatChange(
                  stock.change,
                  stock.changePercent
                )
                
                return (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {stock.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{stock.symbol}</h3>
                        <p className="text-sm text-muted-foreground">
                          {stock.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {formatPrice(stock.price)}
                      </div>
                      <div
                        className={`text-sm flex items-center justify-end ${
                          isPositive ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {change} ({changePercent})
                      </div>
                    </div>

                    <div className="text-right text-sm text-muted-foreground">
                      <div>Vol: {stock.volume}</div>
                      <div>MCap: {stock.marketCap}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard
