'use client'

import { OrderBookData } from '@/types'

interface Props {
  data: OrderBookData | null
  connected: boolean
}

export default function OrderBook({ data, connected }: Props) {
  const maxQty = Math.max(
    ...(data?.bids.map(b => b.quantity) ?? [1]),
    ...(data?.asks.map(a => a.quantity) ?? [1]),
    1
  )

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-full">

      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Order Book
        </h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {connected ? 'live' : 'connecting...'}
          </span>
        </div>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-3 text-xs text-gray-500 mb-2 px-2">
        <span>Price</span>
        <span className="text-center">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* asks — sellers, shown in reverse so lowest ask is closest to spread */}
      <div className="space-y-0.5 mb-2">
        {(data?.asks.slice(0, 8) ?? []).slice().reverse().map((ask, i) => (
          <div key={i} className="relative grid grid-cols-3 text-xs px-2 py-1 rounded">
            {/* depth bar */}
            <div
              className="absolute inset-0 bg-red-950 rounded"
              style={{ width: `${(ask.quantity / maxQty) * 100}%`, opacity: 0.4 }}
            />
            <span className="relative text-red-400 mono font-medium">
              ${ask.price.toFixed(2)}
            </span>
            <span className="relative text-gray-300 mono text-center">
              {ask.quantity}
            </span>
            <span className="relative text-gray-500 mono text-right">
              {(ask.price * ask.quantity).toFixed(0)}
            </span>
          </div>
        ))}
      </div>

      {/* spread */}
      <div className="text-center py-2 border-y border-gray-800 mb-2">
        {data && data.bids.length > 0 && data.asks.length > 0 ? (
          <span className="text-xs text-gray-400 mono">
            spread: ${(data.asks[0].price - data.bids[0].price).toFixed(2)}
          </span>
        ) : (
          <span className="text-xs text-gray-600">— no orders —</span>
        )}
      </div>

      {/* bids — buyers */}
      <div className="space-y-0.5">
        {(data?.bids.slice(0, 8) ?? []).map((bid, i) => (
          <div key={i} className="relative grid grid-cols-3 text-xs px-2 py-1 rounded">
            <div
              className="absolute inset-0 bg-green-950 rounded"
              style={{ width: `${(bid.quantity / maxQty) * 100}%`, opacity: 0.4 }}
            />
            <span className="relative text-green-400 mono font-medium">
              ${bid.price.toFixed(2)}
            </span>
            <span className="relative text-gray-300 mono text-center">
              {bid.quantity}
            </span>
            <span className="relative text-gray-500 mono text-right">
              {(bid.price * bid.quantity).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}