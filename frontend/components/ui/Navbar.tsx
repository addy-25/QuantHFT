'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname         = usePathname()
  const router           = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const navLinks = [
    { href: '/dashboard', label: 'Trading' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/orders',    label: 'Orders'   },
  ]

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* logo */}
        <Link href="/dashboard" className="text-xl font-bold text-white">
          Quant<span className="text-green-400">Flow</span>
        </Link>

        {/* nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* user info + logout */}
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white
                       border border-gray-700 hover:border-gray-500
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}