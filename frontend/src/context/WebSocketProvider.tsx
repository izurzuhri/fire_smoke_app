import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { DetectionMessage } from '../types'

const WebSocketContext = createContext<DetectionMessage[]>([])

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/detections'

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<DetectionMessage[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<number | undefined>()

  useEffect(() => {
    function connect() {
      const ws = new WebSocket(WS_URL)
      socketRef.current = ws

      ws.onmessage = (event) => {
        const parsed: DetectionMessage = JSON.parse(event.data)
        setMessages((prev) => [parsed, ...prev].slice(0, 200))
      }

      ws.onclose = () => {
        if (reconnectTimeout.current) {
          window.clearTimeout(reconnectTimeout.current)
        }
        reconnectTimeout.current = window.setTimeout(connect, 2000)
      }
    }

    connect()

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
      if (reconnectTimeout.current) {
        window.clearTimeout(reconnectTimeout.current)
      }
    }
  }, [])

  return <WebSocketContext.Provider value={messages}>{children}</WebSocketContext.Provider>
}

export const useDetections = () => useContext(WebSocketContext)
