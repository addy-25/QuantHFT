'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const [isLogin, setIsLogin]     = useState(true)
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const { login, register }       = useAuth()
  const router                    = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password)
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Quant<span className="text-green-400">Flow</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            High Frequency Trading Platform
          </p>
        </div>

        {/* card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">

          {/* tabs */}
          <div className="flex mb-6 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isLogin
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                !isLogin
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="adi@quantflow.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg
                           px-4 py-2.5 text-white text-sm placeholder-gray-500
                           focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="minimum 8 characters"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg
                           px-4 py-2.5 text-white text-sm placeholder-gray-500
                           focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {/* error message */}
            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg px-4 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900
                         disabled:text-green-700 text-black font-semibold py-2.5 rounded-lg
                         transition-colors text-sm"
            >
              {loading
                ? 'Please wait...'
                : isLogin ? 'Login' : 'Create Account'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          QuantFlow — built with Go, FastAPI, Kafka, and Next.js
        </p>
      </div>
    </div>
  )
}