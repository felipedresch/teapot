import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { BarChart, Globe, Home, Menu, X } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useCurrentUser } from '../hooks/useCurrentUser'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { signIn, signOut } = useAuthActions()
  const { user, isLoading, isAuthenticated } = useCurrentUser()

  return (
    <>
      <header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
        <div className="flex items-center">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <h1 className="ml-4 text-xl font-semibold">
            <Link to="/">
              <img
                src="/tanstack-word-logo-white.svg"
                alt="TanStack Logo"
                className="h-10"
              />
            </Link>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {!isLoading && isAuthenticated && user ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {user.name ?? user.email ?? 'Convidado'}
                </span>
                {user.isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-gray-900">
                    Admin
                  </span>
                )}
              </div>
              <button
                onClick={() => void signOut()}
                className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => void signIn('google')}
              className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-sm font-medium transition-colors"
            >
              Entrar com Google
            </button>
          )}
        </div>
      </header>

      <aside
        className={`fixed top-0 left-0 h-full w-80 bg-gray-900 text-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Navigation</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Home size={20} />
            <span className="font-medium">Home</span>
          </Link>

          {/* Demo Links Start */}

          <Link
            to="/demo/convex"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <Globe size={20} />
            <span className="font-medium">Convex</span>
          </Link>

          <Link
            to="/demo/posthog"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors mb-2"
            activeProps={{
              className:
                'flex items-center gap-3 p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors mb-2',
            }}
          >
            <BarChart size={20} />
            <span className="font-medium">PostHog</span>
          </Link>

          {/* Demo Links End */}
        </nav>
      </aside>
    </>
  )
}
