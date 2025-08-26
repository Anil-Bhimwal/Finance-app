import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'

// Pages
import Dashboard from './pages/Dashboard'
import Watchlist from './pages/Watchlist'
import StockDetail from './pages/StockDetail'
import Profile from './pages/Profile'

// Components
import Navbar from './components/Navbar'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <SignedOut>
          <RedirectToSignIn />
        </SignedOut>
        
        <SignedIn>
          <SocketProvider>
            <Navbar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/stock/:symbol" element={<StockDetail />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                },
              }}
            />
          </SocketProvider>
        </SignedIn>
      </div>
    </ThemeProvider>
  )
}

export default App
