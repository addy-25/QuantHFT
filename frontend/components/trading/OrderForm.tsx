'use client'

import { useState } from 'react'
import { ordersApi } from '@/lib/api'

interface Props {
  symbol: string
  onOrderPlaced: () => void
}

export default function OrderForm({ symbol, onOrderPlaced }: Props) {
  const [side, setSide]         = useState<'buy' | 'sell'>('buy')
  const [type, setType]         = useState<'limit' | 'market'>('limit')
  const [price, setPrice]       = useState('')
  const [quantity, setQuantity] = useState('')
  const [loading, setLoading]   = useState(false)
  const [message, setMessage]   = useState<{ text: string; ok: boolean } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      await ordersApi.place({
        symbol,
        side,
        type,
        price: type === 'limit' ? parseFloat(price) : undefined,
        quantity: parseInt(quantity),
      })

      setMessage({ text: `${side.toUpperCase()} order placed successfully`, ok: true })
      setQuantity('')
      if (type === 'limit') setPrice('')
      onOrderPlaced()

    } catch (err: any) {
      setMessage({
        text: err.response?.data?.detail || 'Failed to place order',
        ok: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Place Order — {symbol}
      </h2>

      {/* buy / sell toggle */}
      <div className="flex mb-4 bg-gray-800 rounded-lg p-1 gap-1">
        <button
          onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === 'buy'
              ? 'bg-green-500 text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
            side === 'sell'
              ? 'bg-red-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* order type */}
      <div className="flex gap-2 mb-4">
        {(['limit', 'market'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              type === t
                ? 'border-gray-500 text-white bg-gray-700'
                : 'border-gray-700 text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* price — only for limit orders */}
        {type === 'limit' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              required
              placeholder="150.00"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg
                         px-3 py-2 text-white text-sm mono placeholder-gray-600
                         focus:outline-none focus:border-green-500"
            />
          </div>
        )}

        {/* quantity */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Quantity (shares)</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            required
            placeholder="10"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg
                       px-3 py-2 text-white text-sm mono placeholder-gray-600
                       focus:outline-none focus:border-green-500"
          />
        </div>

        {/* notional value preview */}
        {price && quantity && (
          <div className="bg-gray-800 rounded-lg px-3 py-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total value</span>
              <span className="text-white mono">
                ${(parseFloat(price) * parseInt(quantity)).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* message */}
        {message && (
          <div className={`rounded-lg px-3 py-2 text-xs ${
            message.ok
              ? 'bg-green-950 text-green-400 border border-green-800'
              : 'bg-red-950 text-red-400 border border-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors
            disabled:opacity-50 ${
            side === 'buy'
              ? 'bg-green-500 hover:bg-green-400 text-black'
              : 'bg-red-500 hover:bg-red-400 text-white'
          }`}
        >
          {loading ? 'Placing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
        </button>
      </form>
    </div>
  )
}