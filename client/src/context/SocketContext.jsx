import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

const SocketContext = createContext({
  socket: null,
  isConnected: false,
  subscribeToStock: () => {},
  unsubscribeFromStock: () => {},
})

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export const SocketProvider = ({ children }) => {
  const { user } = useUser()
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!user) return

    // Initialize socket connection
    const newSocket = io(
      import.meta.env.VITE_API_URL || window.location.origin,
      {
        auth: {
          userId: user.id,
        },
      }
    )

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
      
      // Join user's personal watchlist room
      newSocket.emit('join-watchlist', user.id)
      
      toast.success('Connected to real-time updates')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
      toast.error('Disconnected from real-time updates')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      toast.error('Failed to connect to real-time updates')
    })

    newSocket.on('stock-update', (data) => {
      // Handle real-time stock price updates
      console.log('Stock update received:', data)
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('stock-price-update', {
        detail: data
      }))
    })

    newSocket.on('watchlist-update', (data) => {
      // Handle watchlist changes from other devices/sessions
      console.log('Watchlist update received:', data)
      
      window.dispatchEvent(new CustomEvent('watchlist-update', {
        detail: data
      }))
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user])

  const subscribeToStock = (symbol) => {
    if (socket && isConnected) {
      socket.emit('subscribe-stock', symbol)
      console.log(`Subscribed to ${symbol}`)
    }
  }

  const unsubscribeFromStock = (symbol) => {
    if (socket && isConnected) {
      socket.emit('unsubscribe-stock', symbol)
      console.log(`Unsubscribed from ${symbol}`)
    }
  }

  const value = {
    socket,
    isConnected,
    subscribeToStock,
    unsubscribeFromStock,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}
