import { useRouterState } from '@tanstack/react-router'
import { useEventBySlug } from '../hooks/useEvents'

export default function Footer() {
  const routerState = useRouterState()
  const pathname = routerState.location.pathname

  const slug =
    pathname.startsWith('/events/') && pathname.split('/').length >= 3
      ? pathname.split('/')[2]
      : undefined

  const { event } = useEventBySlug(slug)

  const isEventPage = Boolean(event)

  return (
    <footer className="py-12 px-6 text-center">
      <div className="max-w-5xl mx-auto">
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
            Feito com carinho para{' '}
            <span className="font-display italic text-espresso">
              {event?.partnerOneName}
            </span>{' '}
            &{' '}
            <span className="font-display italic text-espresso">
              {event?.partnerTwoName}
            </span>
          </p>
        ) : (
          <p className="text-sm text-warm-gray leading-relaxed">
            Feito com carinho para celebrar momentos especiais
          </p>
        )}

        <p className="text-xs text-warm-gray/50 mt-3 font-accent text-base">
          com amor, sempre
        </p>
      </div>
    </footer>
  )
}
