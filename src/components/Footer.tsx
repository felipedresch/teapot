import { Link, useRouterState } from '@tanstack/react-router'
import { useEventBySlug } from '../hooks/useEvents'
import { getDisplayHostNames } from '../lib/presentation'

export default function Footer() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const slug =
    pathname.startsWith('/events/') && pathname.split('/').length >= 3
      ? pathname.split('/')[2]
      : undefined

  const { event } = useEventBySlug(slug)

  const isEventPage = Boolean(event)
  const hostNames =
    getDisplayHostNames(event?.hosts ?? []).join(' • ') || 'anfitriões'

  return (
    <footer className="py-12 px-6 text-center">
      <div className="max-w-5xl mx-auto">
        {!isEventPage && (
          <nav
            aria-label="Explore o MyWish"
            className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8 text-sm text-warm-gray"
          >
            <Link to="/lista-de-presentes" className="hover:text-primary">
              Listas por ocasião
            </Link>
            <Link to="/precos" className="hover:text-primary">
              Preços
            </Link>
            <Link to="/how-it-works" className="hover:text-primary">
              Como funciona
            </Link>
            <Link to="/faq" className="hover:text-primary">
              Dúvidas frequentes
            </Link>
            <Link to="/blog" className="hover:text-primary">
              Guias e dicas
            </Link>
          </nav>
        )}
        {/* Decorative divider */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-px bg-muted-rose/30" />
          <svg
            width="16"
            height="14"
            viewBox="0 0 16 14"
            fill="none"
            className="text-muted-rose/40"
            aria-hidden="true"
          >
            <path
              d="M8 14s-5.5-4.2-7-7.5C-.2 3.5 1.2.5 4 .5c1.5 0 3 1 4 2.5C9 1.5 10.5.5 12 .5c2.8 0 4.2 3 2.9 6C13.5 9.8 8 14 8 14z"
              fill="currentColor"
            />
          </svg>
          <div className="w-8 h-px bg-muted-rose/30" />
        </div>

        {isEventPage ? (
          <p className="text-sm text-warm-gray leading-relaxed">
            Feito com carinho por{' '}
            <span className="font-display italic text-espresso">
              {hostNames}
            </span>
          </p>
        ) : (
          <p className="text-sm text-warm-gray leading-relaxed">
            Feito com carinho para celebrar momentos especiais
          </p>
        )}

        <p className="text-warm-gray/50 mt-4 font-accent text-2xl">
          com amor, sempre
        </p>
      </div>
    </footer>
  )
}
