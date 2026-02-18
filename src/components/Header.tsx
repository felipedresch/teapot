import { Link, useLocation } from '@tanstack/react-router'
import { Menu, LogOut } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useCallback, useEffect, useState } from 'react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { Button } from './ui/button'
import BrandWordmark from './BrandWordmark'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet'

const NAV_LINK_BASE =
  'text-sm transition-colors duration-200 relative py-1'
const NAV_LINK_INACTIVE = `${NAV_LINK_BASE} text-warm-gray hover:text-espresso`
const NAV_LINK_ACTIVE = `${NAV_LINK_BASE} text-espresso font-medium`

const MOBILE_LINK_BASE =
  'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 text-base'
const MOBILE_LINK_INACTIVE = `${MOBILE_LINK_BASE} text-espresso hover:bg-blush/20`
const MOBILE_LINK_ACTIVE = `${MOBILE_LINK_BASE} text-espresso font-medium bg-blush/20`

// Route paths stay in English; labels stay in Portuguese for users.
const desktopNavItems = [
  { label: 'Início', href: '/' as const },
  { label: 'FAQ', href: '/faq' as const },
  { label: 'Como funciona', href: '/how-it-works' as const },
]

export default function Header() {
  const { signIn, signOut } = useAuthActions()
  const { user, isLoading, isAuthenticated } = useCurrentUser()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignIn = useCallback(async () => {
    const returnPath = `${location.pathname}${location.searchStr}${location.hash}`
    await signIn('google', { redirectTo: returnPath })
  }, [location.hash, location.pathname, location.searchStr, signIn])

  const handleMobileSignIn = useCallback(async () => {
    setIsMobileMenuOpen(false)
    await handleSignIn()
  }, [handleSignIn])

  const handleMobileSignOut = useCallback(async () => {
    setIsMobileMenuOpen(false)
    await signOut()
  }, [signOut])

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return
    }

    const currentUrl = new URL(window.location.href)
    const hasOAuthParams =
      currentUrl.searchParams.has('code') || currentUrl.searchParams.has('state')
    if (!hasOAuthParams) {
      return
    }

    currentUrl.searchParams.delete('code')
    currentUrl.searchParams.delete('state')
    const nextUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
    window.history.replaceState({}, '', nextUrl)
  }, [isAuthenticated, isLoading])

  return (
    <header className="sticky top-0 z-40 bg-warm-white/70 backdrop-blur-xl border-b border-border/30">
      <div className="relative max-w-5xl mx-auto px-6 h-16 flex items-center">
        {/* ── Couple Name / Logo ── */}
        <Link
          to="/"
          className="group font-display text-lg italic tracking-tight transition-colors duration-200"
        >
          <BrandWordmark casing="lower" />
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
          {desktopNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={NAV_LINK_INACTIVE}
              activeProps={{ className: NAV_LINK_ACTIVE }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop Auth ── */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {!isLoading &&
            (isAuthenticated ? (
              <>
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user?.name ?? ''}
                    className="size-7 rounded-full object-cover ring-1 ring-border"
                  />
                ) : null}
                <span className="text-sm text-warm-gray max-w-[120px] truncate">
                  {user?.name ?? 'Conta conectada'}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void signOut()}
                  aria-label="Sair"
                >
                  <LogOut className="size-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleSignIn()}
              >
                Entrar
              </Button>
            ))}
        </div>

        {/* ── Mobile Menu Trigger ── */}
        <div className="md:hidden ml-auto flex items-center gap-1.5">
          {!isLoading &&
            (isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Abrir menu da conta"
                className="inline-flex items-center justify-center rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {user?.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="size-7 rounded-full object-cover ring-1 ring-border mr-1"
                  />
                ) : (
                  <div className="size-7 rounded-full bg-blush/35 ring-1 ring-border" />
                )}
              </button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="px-2.5 text-sm"
                onClick={() => void handleSignIn()}
              >
                Login
              </Button>
            ))}

          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[72vw] max-w-[18rem] sm:max-w-[18rem]">
              <SheetHeader>
                <SheetTitle className="font-display italic text-lg">
                  <BrandWordmark casing="lower" />
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-2 mt-2">
                {desktopNavItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={MOBILE_LINK_INACTIVE}
                    activeProps={{ className: MOBILE_LINK_ACTIVE }}
                  >
                    {item.label}
                  </Link>
                ))}

                <div className="mx-4 my-2 h-px bg-border/85" />

                <a
                  href="/events/create"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={MOBILE_LINK_INACTIVE}
                >
                  Criar meu evento
                </a>

                <a
                  href="/#public-events-search"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={MOBILE_LINK_INACTIVE}
                >
                  Procurar eventos públicos
                </a>
              </nav>

              {/* Auth — mobile */}
              <div className="mt-auto p-6 pt-4 border-t border-border/30">
                {!isLoading &&
                  (isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {user?.image && (
                          <img
                            src={user.image}
                            alt={user?.name ?? ''}
                            className="size-8 rounded-full object-cover ring-1 ring-border"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-espresso">
                            {user?.name ?? 'Conta conectada'}
                          </p>
                          {user?.email && (
                            <p className="text-xs text-warm-gray truncate max-w-[180px]">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleMobileSignOut()}
                        className="w-full justify-start"
                      >
                        <LogOut className="size-4" />
                        Sair
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="default"
                      onClick={() => void handleMobileSignIn()}
                      className="w-full"
                    >
                      Entrar com Google
                    </Button>
                  ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
