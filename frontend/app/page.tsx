'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) router.push('/dashboard')
      else router.push('/login')
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 text-sm">Loading...</div>
    </div>
  )
}