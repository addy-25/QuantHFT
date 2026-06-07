'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { api, ordersApi } from '@/lib/api'
import Navbar from '@/components/ui/Navbar'
import { Order } from '@/types'

export default function OrdersPage() {
  const { user, isLoading } = useAuth()
  const router              = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      try {
        const res = await api.get(`/api/v1/orders?user_id=${user.id}`)
        setOrders(res.data)
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [user])

  const handleCancel = async (orderId: string) => {
    try {
      await ordersApi.cancel(orderId)
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
      )
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to cancel order')
    }
  }

  const statusColor = (status: Order['status']) => {
    switch (status) {
      case 'filled':      return 'text-green-400 bg-green-950'
      case 'new':         return 'text-blue-400 bg-blue-950'
      case 'partial_fill':return 'text-yellow-400 bg-yellow-950'
      case 'cancelled':   return 'text-gray-400 bg-gray-800'
      case 'rejected':    return 'text-red-400 bg-red-950'
    }
  }

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
        <h1 className="text-xl font-semibold text-white mb-6">Orders</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-xl">
          {loading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm">
              No orders yet — go to the trading dashboard to place orders
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                  <th className="text-left px-6 py-3">Symbol</th>
                  <th className="text-left px-6 py-3">Side</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-right px-6 py-3">Price</th>
                  <th className="text-right px-6 py-3">Qty</th>
                  <th className="text-right px-6 py-3">Filled</th>
                  <th className="text-center px-6 py-3">Status</th>
                  <th className="text-center px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-3 font-semibold text-white">{order.symbol}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-semibold ${
                        order.side === 'buy' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-sm capitalize">
                      {order.type}
                    </td>
                    <td className="px-6 py-3 text-right mono text-gray-300">
                      {order.price ? `$${order.price.toFixed(2)}` : 'Market'}
                    </td>
                    <td className="px-6 py-3 text-right mono text-gray-300">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-3 text-right mono text-gray-300">
                      {order.filled}/{order.quantity}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {order.status === 'new' || order.status === 'partial_fill' ? (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="text-xs text-red-400 hover:text-red-300
                                     border border-red-900 hover:border-red-700
                                     px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
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