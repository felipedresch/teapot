import { motion } from 'motion/react'
import { MapPin, Share2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { capitalizeFirst, formatDatePtBrFromIso } from '../lib/presentation'

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

function OrnamentDividerMobile({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 12 C20 4, 40 20, 60 12 C80 4, 100 20, 120 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="12" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

type EventHeroMobileProps = {
  coverImageUrl: string
  eventName: string
  eventTypeLabel: string
  hosts: string[]
  shouldUsePairLayout: boolean
  location?: string
  date?: string
  description?: string
  onShareClick: () => void
}

/**
 * Mobile-only hero layout for events WITH a cover image.
 * Editorial magazine style: full-bleed photo fading into the invitation card.
 * Completely hidden on md+ breakpoints (desktop uses the original layout).
 */
export function EventHeroMobile({
  coverImageUrl,
  eventName,
  eventTypeLabel,
  hosts,
  shouldUsePairLayout,
  location,
  date,
  description,
  onShareClick,
}: EventHeroMobileProps) {
  return (
    <div className="block md:hidden -mx-4 sm:-mx-8">
      {/* ─── FULL-BLEED PHOTO SECTION ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease }}
        className="relative w-full"
      >
        {/* The photo — edge-to-edge, with a cinematic crop ratio */}
        <div className="relative w-full overflow-hidden">
          <img
            src={coverImageUrl}
            alt=""
            className="w-full object-cover"
            style={{
              filter: 'saturate(0.92) contrast(1.03) brightness(1.01)',
              maxHeight: '56vh',
              minHeight: '260px',
            }}
            loading="eager"
          />

          {/* Film grain overlay */}
          <div className="photo-print-grain absolute inset-0" aria-hidden="true" />

          {/* Bottom gradient fade — blends photo into the invitation */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '55%',
              background:
                'linear-gradient(to top, #fffdf9 0%, rgba(255,253,249,0.92) 20%, rgba(255,253,249,0.55) 50%, rgba(255,253,249,0) 100%)',
            }}
            aria-hidden="true"
          />

          {/* Soft vignette on the photo edges */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow:
                'inset 0 0 80px rgba(61,53,48,0.12), inset 0 0 160px rgba(61,53,48,0.04)',
            }}
            aria-hidden="true"
          />

          {/* Share button — anchored top-right over the photo */}
          <button
            type="button"
            className={cn(
              'absolute top-4 right-4 z-20',
              'inline-flex items-center justify-center',
              'size-10 rounded-full',
              'bg-white/80 backdrop-blur-md',
              'border border-white/50',
              'shadow-[0_2px_8px_rgba(61,53,48,0.14),0_8px_24px_rgba(61,53,48,0.10)]',
              'transition-all duration-200',
              'hover:bg-white/95 hover:scale-105',
              'active:scale-95',
            )}
            onClick={onShareClick}
          >
            <Share2 className="size-4 text-espresso/70" />
          </button>
        </div>
      </motion.div>

      {/* ─── INVITATION CARD — emerges from the photo fade ─── */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
        }}
        className="relative -mt-16 z-10 px-6 pb-8"
      >
        {/* The handmade paper card */}
        <div
          className="deckled-edge"
          style={{
            filter:
              'drop-shadow(0 4px 12px rgba(61,53,48,0.10)) drop-shadow(0 16px 40px rgba(61,53,48,0.12))',
          }}
        >
          <div className="paper-card relative text-center px-7 py-10 sm:px-9 sm:py-12">
            {/* Dog-ear fold */}
            <div className="paper-fold-corner" aria-hidden="true" />

            {/* Letterpress top mark */}
            <div
              className="absolute top-5 left-1/2 -translate-x-1/2 w-12 sm:w-14"
              aria-hidden="true"
            >
              <div className="h-px bg-muted-rose/15" />
              <div className="flex justify-center mt-1.5">
                <div className="size-1 rounded-full bg-muted-rose/15" />
              </div>
            </div>

            {/* Top flourish */}
            <motion.div variants={fadeUp} className="mt-4">
              <OrnamentDividerMobile className="w-16 sm:w-20 mx-auto text-muted-rose/18" />
            </motion.div>

            {/* Event type */}
            <motion.p
              variants={fadeUp}
              className="font-accent text-lg sm:text-xl text-muted-rose tracking-wide mt-4 sm:mt-5"
            >
              {eventTypeLabel}
            </motion.p>

            {/* Host names */}
            <motion.div variants={fadeUp} className="mt-4 sm:mt-5">
              {shouldUsePairLayout ? (
                <>
                  <p className="font-display italic text-[1.65rem] sm:text-3xl text-espresso leading-[0.9]">
                    {hosts[0]}
                  </p>
                  <p className="font-accent text-xl sm:text-2xl text-muted-rose/50 my-1 inline-block -rotate-6">
                    &amp;
                  </p>
                  <p className="font-display italic text-[1.65rem] sm:text-3xl text-espresso leading-[0.9]">
                    {hosts[1]}
                  </p>
                </>
              ) : (
                <p className="font-display italic text-[1.65rem] sm:text-3xl text-espresso leading-[0.95]">
                  {hosts.join(' • ')}
                </p>
              )}
            </motion.div>

            {/* Location + date */}
            {(location || date) && (
              <motion.div
                variants={fadeUp}
                className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm text-warm-gray/55"
              >
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-2.5 sm:size-3" />
                    {capitalizeFirst(location)}
                  </span>
                )}
                {date && <span>{formatDatePtBrFromIso(date)}</span>}
              </motion.div>
            )}

            {/* Description */}
            {description && (
              <motion.p
                variants={fadeUp}
                className="mt-3 text-xs sm:text-sm text-warm-gray/65 leading-relaxed max-w-xs mx-auto"
              >
                {capitalizeFirst(description)}
              </motion.p>
            )}

            {/* Handwritten caption — echoing the photo's subject */}
            <motion.p
              variants={fadeUp}
              className="font-accent text-base sm:text-lg text-warm-gray/30 tracking-wide mt-5"
            >
              {capitalizeFirst(eventName)}
            </motion.p>

            {/* Bottom flourish */}
            <motion.div variants={fadeUp} className="mt-4 sm:mt-5">
              <OrnamentDividerMobile className="w-16 sm:w-20 mx-auto text-muted-rose/18" />
            </motion.div>

            {/* Letterpress bottom mark */}
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 w-12 sm:w-14"
              aria-hidden="true"
            >
              <div className="flex justify-center mb-1.5">
                <div className="size-1 rounded-full bg-muted-rose/15" />
              </div>
              <div className="h-px bg-muted-rose/15" />
            </div>
          </div>
        </div>

        {/* Washi tape — decorative, angled on the card edges */}
        <div
          className="washi-tape"
          style={{ top: '0.25rem', left: '12%', transform: 'rotate(-10deg)', position: 'absolute', zIndex: 15 }}
          aria-hidden="true"
        />
        <div
          className="washi-tape-rose"
          style={{ bottom: '1.5rem', right: '5%', transform: 'rotate(14deg)', position: 'absolute', zIndex: 15 }}
          aria-hidden="true"
        />
      </motion.div>
    </div>
  )
}
