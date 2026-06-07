'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { portfolioApiClient } from '@/lib/api'
import { Position, TradeHistoryItem, PortfolioSummary } from '@/types'
import Navbar from '@/components/ui/Navbar'

export default function PortfolioPage() {
  const { user, isLoading } = useAuth()
  const router              = useRouter()

  const [positions, setPositions]   = useState<Position[]>([])
  const [trades, setTrades]         = useState<TradeHistoryItem[]>([])
  const [summary, setSummary]       = useState<PortfolioSummary | null>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return

    const fetchPortfolio = async () => {
      try {
        const [posRes, tradeRes, summaryRes] = await Promise.all([
          portfolioApiClient.getPortfolio(user.id),
          portfolioApiClient.getTrades(user.id),
          portfolioApiClient.getSummary(user.id),
        ])
        setPositions(posRes.data.positions)
        setTrades(tradeRes.data.trades)
        setSummary(summaryRes.data)
      } catch (err) {
        console.error('Failed to fetch portfolio:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolio()
    // refresh every 5 seconds
    const interval = setInterval(fetchPortfolio, 5000)
    return () => clearInterval(interval)
  }, [user])

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
        <h1 className="text-xl font-semibold text-white mb-6">Portfolio</h1>

        {/* summary cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Open Positions</div>
              <div className="text-2xl font-mono font-semibold text-white">
                {summary.open_positions}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Position Value</div>
              <div className="text-2xl font-mono font-semibold text-white">
                ${summary.total_position_value.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Realised P&L</div>
              <div className={`text-2xl font-mono font-semibold ${
                summary.total_realised_pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {summary.total_realised_pnl >= 0 ? '+' : ''}
                ${summary.total_realised_pnl.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Total Trades</div>
              <div className="text-2xl font-mono font-semibold text-white">
                {summary.total_trades}
              </div>
            </div>
          </div>
        )}

        {/* positions table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl mb-6">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Open Positions
            </h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
          ) : positions.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              No open positions — place some orders on the trading dashboard
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-6 py-3">Symbol</th>
                  <th className="text-right px-6 py-3">Quantity</th>
                  <th className="text-right px-6 py-3">Avg Price</th>
                  <th className="text-right px-6 py-3">Position Value</th>
                  <th className="text-right px-6 py-3">Realised P&L</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos.symbol} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-semibold text-white">{pos.symbol}</td>
                    <td className="px-6 py-4 text-right mono text-gray-300">{pos.quantity}</td>
                    <td className="px-6 py-4 text-right mono text-gray-300">
                      ${pos.avg_price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right mono text-white">
                      ${(pos.quantity * pos.avg_price).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 text-right mono font-medium ${
                      pos.realised_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {pos.realised_pnl >= 0 ? '+' : ''}${pos.realised_pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* trade history */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Trade History
            </h2>
          </div>
          {trades.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              No trades yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-6 py-3">Symbol</th>
                  <th className="text-left px-6 py-3">Side</th>
                  <th className="text-right px-6 py-3">Price</th>
                  <th className="text-right px-6 py-3">Quantity</th>
                  <th className="text-right px-6 py-3">Realised P&L</th>
                  <th className="text-right px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => (
                  <tr key={trade.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-3 font-semibold text-white">{trade.symbol}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        trade.side === 'buy'
                          ? 'bg-green-950 text-green-400'
                          : 'bg-red-950 text-red-400'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right mono text-gray-300">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right mono text-gray-300">
                      {trade.quantity}
                    </td>
                    <td className={`px-6 py-3 text-right mono ${
                      trade.realised_pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.realised_pnl >= 0 ? '+' : ''}${trade.realised_pnl.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500 text-xs">
                      {new Date(trade.executed_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}