export interface User {
  id: string
  email: string
  is_active: boolean
  is_admin: boolean
}

export interface Order {
  id: string
  user_id: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  price: number | null
  quantity: number
  filled: number
  remaining: number
  status: 'new' | 'partial_fill' | 'filled' | 'cancelled' | 'rejected'
}

export interface Position {
  symbol: string
  quantity: number
  avg_price: number
  realised_pnl: number
}

export interface TradeHistoryItem {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  price: number
  quantity: number
  realised_pnl: number
  executed_at: string
}

export interface PortfolioSummary {
  user_id: string
  open_positions: number
  total_position_value: number
  total_realised_pnl: number
  total_trades: number
}

export interface OrderBookLevel {
  price: number
  quantity: number
}

export interface OrderBookData {
  type: 'orderbook'
  symbol: string
  bids: OrderBookLevel[]
  asks: OrderBookLevel[]
}

export interface TradeEvent {
  type: 'trade'
  trade_id: string
  symbol: string
  price: number
  quantity: number
  executed_at: string
}

export type WebSocketMessage = OrderBookData | TradeEvent | { type: 'ping' }
