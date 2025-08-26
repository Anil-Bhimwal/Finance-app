import { Link, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { Moon, Sun, TrendingUp, Heart, BarChart3, User } from 'lucide-react'
import { Button } from './ui/button'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../context/SocketContext'
import { cn } from '../utils/cn'

const Navbar = () => {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { isConnected } = useSocket()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/watchlist', label: 'Watchlist', icon: Heart },
    { path: '/profile', label: 'Profile', icon: User },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo */}
        <div className="mr-8">
          <Link to="/" className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Finance Dashboard</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Right side items */}
        <div className="ml-auto flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Button */}
          <UserButton 
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
              },
            }}
          />
        </div>
      </div>
    </nav>
  )
}

export default Navbar
