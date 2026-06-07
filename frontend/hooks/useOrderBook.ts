import { useState, useEffect, useRef, useCallback } from 'react'
import { OrderBookData, TradeEvent } from '@/types'

interface UseOrderBookReturn {
  orderBook: OrderBookData | null
  recentTrades: TradeEvent[]
  connected: boolean
}

export function useOrderBook(symbol: string): UseOrderBookReturn {
  const [orderBook, setOrderBook]       = useState<OrderBookData | null>(null)
  const [recentTrades, setRecentTrades] = useState<TradeEvent[]>([])
  const [connected, setConnected]       = useState(false)
  const wsRef                           = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/ws/${symbol}`
    const ws    = new WebSocket(wsUrl)

    ws.onopen    = () => setConnected(true)
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'orderbook') setOrderBook(data as OrderBookData)
      else if (data.type === 'trade')
        setRecentTrades(prev => [data as TradeEvent, ...prev].slice(0, 50))
    }
    ws.onclose = () => {
      setConnected(false)
      setTimeout(connect, 2000)
    }
    ws.onerror = () => ws.close()
    wsRef.current = ws
  }, [symbol])

  useEffect(() => {
    connect()
    return () => wsRef.current?.close()
  }, [connect])

  return { orderBook, recentTrades, connected }
}
