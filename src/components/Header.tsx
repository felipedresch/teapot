import { Link } from '@tanstack/react-router'
import { Menu, LogOut } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { Button } from './ui/button'
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

// TODO: Adicionar rotas quando forem criadas:
// { label: 'Lista', href: '/lista' },
// { label: 'Meus Presentes', href: '/meus-presentes' },
const navItems = [{ label: 'Início', href: '/' as const }]

export default function Header() {
  const { signIn, signOut } = useAuthActions()
  const { user, isLoading, isAuthenticated } = useCurrentUser()
  const { partnerOneName, partnerTwoName } = useSiteConfig()

  return (
    <header className="sticky top-0 z-40 bg-warm-white/70 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ── Couple Name / Logo ── */}
        <Link
          to="/"
          className="font-display text-lg italic text-espresso tracking-tight hover:text-soft-terracotta transition-colors duration-200"
        >
          {partnerOneName}{' '}
          <span className="text-muted-rose">&</span>{' '}
          {partnerTwoName}
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={NAV_LINK_INACTIVE}
              activeProps={{ className: NAV_LINK_ACTIVE }}
            >
              {item.label}
            </Link>
          ))}

          {/* Auth */}
          {!isLoading &&
            (isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? ''}
                    className="size-7 rounded-full object-cover ring-1 ring-border"
                  />
                ) : null}
                <span className="text-sm text-warm-gray max-w-[120px] truncate">
                  {user.name ?? 'Convidado'}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void signOut()}
                  aria-label="Sair"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void signIn('google')}
              >
                Entrar
              </Button>
            ))}
        </nav>

        {/* ── Mobile Menu Trigger ── */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="font-display italic text-lg">
                  {partnerOneName[0]}{' '}
                  <span className="text-muted-rose">&</span>{' '}
                  {partnerTwoName[0]}
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-2 mt-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={MOBILE_LINK_INACTIVE}
                    activeProps={{ className: MOBILE_LINK_ACTIVE }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Auth — mobile */}
              <div className="mt-auto p-6 pt-4 border-t border-border/30">
                {!isLoading &&
                  (isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {user.image && (
                          <img
                            src={user.image}
                            alt={user.name ?? ''}
                            className="size-8 rounded-full object-cover ring-1 ring-border"
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium text-espresso">
                            {user.name ?? 'Convidado'}
                          </p>
                          {user.email && (
                            <p className="text-xs text-warm-gray truncate max-w-[180px]">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void signOut()}
                        className="w-full justify-start"
                      >
                        <LogOut className="size-4" />
                        Sair
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="default"
                      onClick={() => void signIn('google')}
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
