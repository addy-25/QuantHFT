'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useOrderBook } from '@/hooks/useOrderBook'
import Navbar from '@/components/ui/Navbar'
import OrderBook from '@/components/trading/OrderBook'
import OrderForm from '@/components/trading/OrderForm'
import TradeTape from '@/components/trading/TradeTape'

const SYMBOLS = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'NVDA']

export default function Dashboard() {
  const { user, isLoading } = useAuth()
  const router              = useRouter()
  const [symbol, setSymbol] = useState('AAPL')
  const [refresh, setRefresh] = useState(0)

  const { orderBook, recentTrades, connected } = useOrderBook(symbol)

  // redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* symbol selector */}
        <div className="flex items-center gap-2 mb-6">
          {SYMBOLS.map(s => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                symbol === s
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {connected ? 'Live' : 'Reconnecting...'}
            </span>
          </div>
        </div>

        {/* main grid */}
        <div className="grid grid-cols-12 gap-4">

          {/* order book — left */}
          <div className="col-span-3">
            <OrderBook data={orderBook} connected={connected} />
          </div>

          {/* middle — order form + trade tape */}
          <div className="col-span-3 space-y-4">
            <OrderForm
              symbol={symbol}
              onOrderPlaced={() => setRefresh(r => r + 1)}
            />
            <TradeTape trades={recentTrades} />
          </div>

          {/* right — stats */}
          <div className="col-span-6 space-y-4">

            {/* market stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Best Bid</div>
                <div className="text-xl font-mono font-semibold text-green-400">
                  {orderBook?.bids[0]
                    ? `$${orderBook.bids[0].price.toFixed(2)}`
                    : '—'}
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Best Ask</div>
                <div className="text-xl font-mono font-semibold text-red-400">
                  {orderBook?.asks[0]
                    ? `$${orderBook.asks[0].price.toFixed(2)}`
                    : '—'}
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 mb-1">Spread</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {orderBook?.bids[0] && orderBook?.asks[0]
                    ? `$${(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(2)}`
                    : '—'}
                </div>
              </div>
            </div>

            {/* instructions panel */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                How to trade
              </h3>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-3">
                  <span className="text-green-400 font-mono">1.</span>
                  Select a symbol above (AAPL, TSLA, etc.)
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-mono">2.</span>
                  Choose Buy or Sell in the order form
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-mono">3.</span>
                  Set price (limit) or use market order
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-mono">4.</span>
                  Watch the order book update live
                </li>
                <li className="flex gap-3">
                  <span className="text-green-400 font-mono">5.</span>
                  Trades appear in the tape when matched
                </li>
              </ol>
            </div>

            {/* recent trades summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Trade Summary — {symbol}
              </h3>
              {recentTrades.length > 0 ? (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Trades</div>
                    <div className="text-2xl font-mono font-semibold text-white">
                      {recentTrades.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Last Price</div>
                    <div className="text-2xl font-mono font-semibold text-green-400">
                      ${recentTrades[0].price.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Volume</div>
                    <div className="text-2xl font-mono font-semibold text-white">
                      {recentTrades.reduce((sum, t) => sum + t.quantity, 0)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600 text-sm">
                  No trades yet — place matching buy and sell orders
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}