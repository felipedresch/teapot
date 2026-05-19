import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { ArrowRight, MapPin } from 'lucide-react'
import { useRecentPublicEvents } from '../hooks/useEvents'
import { capitalizeFirst, formatDatePtBrFromIso } from '../lib/presentation'

const ease = [0.22, 1, 0.36, 1] as const

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Casamento',
  'bridal-shower': 'Chá de panela',
  birthday: 'Aniversário',
  'baby-shower': 'Chá de bebê',
  housewarming: 'Chá de casa nova',
  graduation: 'Formatura',
  other: 'Evento',
}

const CARD_ROTATIONS = [-2.2, 1.6, -1.4, 2.1, -1.8]

export function PublicEventsCarousel() {
  const { events, isLoading } = useRecentPublicEvents(5)

  if (isLoading) {
    return (
      <div className="px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-flow-col auto-cols-[16rem] sm:auto-cols-[18rem] gap-6 overflow-x-auto pb-4 md:grid-flow-row md:auto-cols-auto md:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-72 rounded-2xl bg-blush/10 animate-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return null
  }

  return (
    <section className="px-6 pb-20 md:pb-28">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="font-accent text-2xl text-muted-rose">
            celebrações em andamento
          </p>
          <h2 className="font-display italic text-3xl md:text-4xl text-espresso mt-1">
            Eventos reais da comunidade
          </h2>
          <p className="text-sm text-warm-gray/65 mt-3 max-w-md mx-auto">
            Listas públicas criadas por pessoas como você. Clique para conhecer.
          </p>
        </motion.div>

        <div
          className="
            flex gap-5 sm:gap-6 overflow-x-auto pb-6 px-2 -mx-2 snap-x snap-mandatory
            md:grid md:grid-cols-3 lg:grid-cols-5 md:gap-6 md:overflow-visible md:pb-2 md:px-0 md:mx-0 md:snap-none
            scrollbar-hide
          "
        >
          {events.map((event, index) => {
            const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length]
            const eventTypeLabel =
              event.customEventType ||
              EVENT_TYPE_LABELS[event.eventType] ||
              'Evento'
            const hostsLine = event.hosts.join(' • ')

            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  duration: 0.55,
                  ease,
                  delay: 0.08 * index,
                }}
                className="snap-center shrink-0 w-[16rem] sm:w-[17rem] md:w-auto md:shrink"
              >
                <Link
                  to="/events/$slug"
                  params={{ slug: event.slug }}
                  className="group block"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                >
                  <div
                    className="photo-print relative p-2.5 pb-8 sm:p-3 sm:pb-10 transition-transform duration-500 group-hover:rotate-0 group-hover:-translate-y-1"
                    style={{
                      boxShadow:
                        '0 2px 4px rgba(61,53,48,0.10), 0 6px 18px rgba(61,53,48,0.10), 0 14px 36px rgba(61,53,48,0.10)',
                    }}
                  >
                    <div className="relative overflow-hidden aspect-[4/5]">
                      <img
                        src={event.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                        style={{
                          filter:
                            'saturate(0.92) contrast(1.03) brightness(1.01)',
                        }}
                      />
                      <div
                        className="photo-print-grain absolute inset-0"
                        aria-hidden="true"
                      />
                      <div
                        className="photo-vignette absolute inset-0"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="font-accent text-base sm:text-lg text-espresso/65 text-center mt-3 tracking-wide leading-tight line-clamp-1">
                      {capitalizeFirst(event.name)}
                    </p>
                  </div>

                  <div className="mt-3 text-center space-y-1">
                    <p className="text-xs text-muted-rose/85 font-medium tracking-wide">
                      {eventTypeLabel}
                    </p>
                    {hostsLine && (
                      <p className="text-xs text-warm-gray/65 line-clamp-1">
                        {hostsLine}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-[11px] text-warm-gray/55">
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-2.5" />
                          <span className="line-clamp-1">
                            {capitalizeFirst(event.location)}
                          </span>
                        </span>
                      )}
                      {event.date && (
                        <span>{formatDatePtBrFromIso(event.date)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/"
            hash="public-events-search"
            className="inline-flex items-center gap-1.5 text-sm text-muted-rose hover:text-espresso transition-colors underline underline-offset-4 decoration-muted-rose/40 hover:decoration-muted-rose"
          >
            buscar mais eventos públicos
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
