'use client'

import { TradeEvent } from '@/types'

interface Props {
  trades: TradeEvent[]
}

export default function TradeTape({ trades }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Recent Trades
      </h2>

      {trades.length === 0 ? (
        <div className="text-center py-8 text-gray-600 text-sm">
          Waiting for trades...
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto max-h-64">
          {trades.map((trade, i) => (
            <div
              key={trade.trade_id || i}
              className="flex items-center justify-between py-1.5 px-2
                         border-b border-gray-800 last:border-0"
            >
              <span className="text-green-400 mono text-xs font-medium">
                ${trade.price.toFixed(2)}
              </span>
              <span className="text-gray-400 mono text-xs">
                {trade.quantity} shares
              </span>
              <span className="text-gray-600 text-xs">
                {new Date(trade.executed_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}