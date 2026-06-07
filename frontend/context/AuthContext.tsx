'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '@/types'
import { authApi } from '@/lib/api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [token, setToken]         = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser  = localStorage.getItem('user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    const { access_token, user_id, email: userEmail } = res.data
    const userData: User = { id: user_id, email: userEmail, is_active: true, is_admin: false }
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
  }

  const register = async (email: string, password: string) => {
    const res = await authApi.register(email, password)
    const { access_token, user_id, email: userEmail } = res.data
    const userData: User = { id: user_id, email: userEmail, is_active: true, is_admin: false }
    localStorage.setItem('token', access_token)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(access_token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
