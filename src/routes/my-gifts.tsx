import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { Gift, Heart } from 'lucide-react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { SITE_NAME } from '../lib/seo'

export const Route = createFileRoute('/my-gifts')({
  head: () => ({
    meta: [{ title: `Meus presentes | ${SITE_NAME}` }],
  }),
  component: MyGiftsPage,
})

const STATUS_LABEL: Record<'available' | 'reserved' | 'received', string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  received: 'Recebido',
}

function MyGiftsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const { signIn } = useAuthActions()
  const reservations = useQuery(
    api.gifts.listMyReservations,
    isAuthenticated ? {} : 'skip',
  )

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center space-y-4">
        <Gift className="size-10 text-muted-rose/55 mx-auto" />
        <h1 className="font-display italic text-3xl text-espresso">
          Meus presentes
        </h1>
        <p className="text-warm-gray">
          Entre com sua conta para ver os presentes que você reservou.
        </p>
        <Button
          onClick={() => void signIn('google', { redirectTo: '/my-gifts' })}
        >
          Entrar com Google
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      <div className="text-center mb-8">
        <p className="font-accent text-2xl text-muted-rose">sua área</p>
        <h1 className="font-display italic text-3xl md:text-4xl text-espresso mt-1">
          Meus presentes reservados
        </h1>
        <p className="text-warm-gray/70 mt-3 text-sm">
          Tudo o que você já escolheu presentear, num só lugar.
        </p>
      </div>

      {reservations === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-blush/20 animate-pulse"
            />
          ))}
        </div>
      ) : reservations.length === 0 ? (
        <div className="text-center py-20">
          <Heart className="size-10 text-warm-gray/15 mx-auto mb-4" />
          <p className="text-warm-gray/60">
            Você ainda não reservou nenhum presente.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to="/">Procurar eventos</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reservations.map((reservation) => (
            <li key={reservation._id}>
              <Link
                to="/events/$slug"
                params={{ slug: reservation.eventSlug }}
                className="group flex gap-3 rounded-2xl border border-border/50 bg-warm-white/80 p-3 transition-all duration-200 hover:shadow-dreamy hover:border-muted-rose/30"
              >
                <div className="size-20 rounded-xl overflow-hidden bg-blush/15 shrink-0 flex items-center justify-center">
                  {reservation.imageUrl ? (
                    <img
                      src={reservation.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Gift className="size-7 text-muted-rose/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display italic text-sm text-espresso truncate">
                      {reservation.name}
                    </p>
                    <Badge
                      variant={reservation.status}
                      className={cn('shrink-0 text-[10px]')}
                    >
                      {STATUS_LABEL[reservation.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-warm-gray/75 truncate">
                    {reservation.eventName}
                  </p>
                  {reservation.reservedAt && (
                    <p className="text-[10px] text-warm-gray/55">
                      {new Date(reservation.reservedAt).toLocaleDateString(
                        'pt-BR',
                        { day: '2-digit', month: 'short', year: 'numeric' },
                      )}
                    </p>
                  )}
                  {reservation.reservationMessage && (
                    <p className="text-xs text-warm-gray italic line-clamp-2 mt-1">
                      “{reservation.reservationMessage}”
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
