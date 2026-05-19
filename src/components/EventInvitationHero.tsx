import { motion } from 'motion/react'
import { MapPin, Share2 } from 'lucide-react'
import { cn } from '../lib/utils'
import { capitalizeFirst, formatDatePtBrFromIso } from '../lib/presentation'
import { OrnamentDivider } from './OrnamentDivider'
import { EventHeroMobile } from './EventHeroMobile'

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

const HERO_SHARE_BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-muted-rose/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(251,244,240,0.95)_55%,rgba(237,223,215,0.93))] px-2.5 py-2.5 text-xs sm:text-sm font-medium text-espresso shadow-[0_2px_6px_rgba(61,53,48,0.14),0_8px_20px_rgba(61,53,48,0.12)] transition-all duration-200 hover:translate-y-[-1px] hover:brightness-105 hover:shadow-[0_4px_10px_rgba(61,53,48,0.16),0_14px_28px_rgba(61,53,48,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/65'

type FloatingDecorKind =
  | 'stem'
  | 'sprig'
  | 'flower'
  | 'compass'
  | 'diamond'
  | 'dot'

type FloatingDecorItem = {
  top: string
  drift: 'gentle' | 'slow' | 'drift' | 'sway'
  kind: FloatingDecorKind
  toneClass: string
  sizeClass: string
  appearDelay: number
  animationDelay: number
  rotateDeg?: number
}

type FloatingDecorColumn = {
  side: 'left' | 'right'
  offset: string
  items: Array<FloatingDecorItem>
}

const FLOATING_DECOR_COLUMNS: Array<FloatingDecorColumn> = [
  {
    side: 'left',
    offset: '0.6%',
    items: [
      { top: '4%', drift: 'gentle', kind: 'stem', toneClass: 'text-sage/45', sizeClass: 'w-14 h-20', appearDelay: 0.45, animationDelay: 0.6, rotateDeg: -6 },
      { top: '24%', drift: 'slow', kind: 'flower', toneClass: 'text-blush/52', sizeClass: 'w-10 h-10', appearDelay: 0.9, animationDelay: 2.2, rotateDeg: 10 },
      { top: '52%', drift: 'drift', kind: 'diamond', toneClass: 'text-warm-gray/30', sizeClass: 'w-4 h-4', appearDelay: 1.5, animationDelay: 5.8, rotateDeg: -8 },
      { top: '74%', drift: 'sway', kind: 'sprig', toneClass: 'text-sage/34', sizeClass: 'w-10 h-14', appearDelay: 1.9, animationDelay: 3.4, rotateDeg: 5 },
    ],
  },
  {
    side: 'left',
    offset: '4.2%',
    items: [
      { top: '10%', drift: 'drift', kind: 'dot', toneClass: 'text-soft-terracotta/30', sizeClass: 'w-3.5 h-3.5', appearDelay: 0.8, animationDelay: 4.1 },
      { top: '30%', drift: 'sway', kind: 'compass', toneClass: 'text-muted-rose/42', sizeClass: 'w-10 h-10', appearDelay: 1.1, animationDelay: 1.4, rotateDeg: -6 },
      { top: '57%', drift: 'gentle', kind: 'flower', toneClass: 'text-blush/46', sizeClass: 'w-9 h-9', appearDelay: 1.6, animationDelay: 6.3, rotateDeg: 14 },
      { top: '84%', drift: 'slow', kind: 'dot', toneClass: 'text-sage/26', sizeClass: 'w-4 h-4', appearDelay: 2.2, animationDelay: 8.8 },
    ],
  },
  {
    side: 'left',
    offset: '7.9%',
    items: [
      { top: '6%', drift: 'sway', kind: 'sprig', toneClass: 'text-sage/38', sizeClass: 'w-11 h-[3.75rem]', appearDelay: 0.7, animationDelay: 2.7, rotateDeg: -10 },
      { top: '35%', drift: 'gentle', kind: 'diamond', toneClass: 'text-muted-rose/34', sizeClass: 'w-5 h-5', appearDelay: 1.2, animationDelay: 0.9, rotateDeg: 7 },
      { top: '63%', drift: 'drift', kind: 'stem', toneClass: 'text-sage/30', sizeClass: 'w-10 h-14', appearDelay: 1.7, animationDelay: 4.9, rotateDeg: 4 },
      { top: '80%', drift: 'slow', kind: 'dot', toneClass: 'text-blush/26', sizeClass: 'w-3 h-3', appearDelay: 2.4, animationDelay: 7.5 },
    ],
  },
  {
    side: 'left',
    offset: '11.6%',
    items: [
      { top: '14%', drift: 'gentle', kind: 'flower', toneClass: 'text-muted-rose/46', sizeClass: 'w-8 h-8', appearDelay: 0.9, animationDelay: 3.2, rotateDeg: -12 },
      { top: '40%', drift: 'slow', kind: 'sprig', toneClass: 'text-sage/32', sizeClass: 'w-10 h-14', appearDelay: 1.3, animationDelay: 1.8, rotateDeg: 8 },
      { top: '58%', drift: 'sway', kind: 'dot', toneClass: 'text-warm-gray/26', sizeClass: 'w-3.5 h-3.5', appearDelay: 1.9, animationDelay: 5.1 },
      { top: '88%', drift: 'drift', kind: 'diamond', toneClass: 'text-soft-terracotta/24', sizeClass: 'w-4 h-4', appearDelay: 2.6, animationDelay: 8.2 },
    ],
  },
  {
    side: 'left',
    offset: '15.3%',
    items: [
      { top: '8%', drift: 'drift', kind: 'compass', toneClass: 'text-muted-rose/36', sizeClass: 'w-9 h-9', appearDelay: 1.0, animationDelay: 2.1, rotateDeg: 6 },
      { top: '27%', drift: 'gentle', kind: 'dot', toneClass: 'text-sage/28', sizeClass: 'w-3 h-3', appearDelay: 1.4, animationDelay: 4.4 },
      { top: '50%', drift: 'slow', kind: 'flower', toneClass: 'text-blush/44', sizeClass: 'w-8 h-8', appearDelay: 1.8, animationDelay: 6.7, rotateDeg: 9 },
      { top: '72%', drift: 'sway', kind: 'sprig', toneClass: 'text-sage/30', sizeClass: 'w-9 h-[3.25rem]', appearDelay: 2.3, animationDelay: 3.7, rotateDeg: -5 },
    ],
  },
  {
    side: 'left',
    offset: '18.8%',
    items: [
      { top: '18%', drift: 'slow', kind: 'diamond', toneClass: 'text-warm-gray/24', sizeClass: 'w-4 h-4', appearDelay: 1.2, animationDelay: 1.1, rotateDeg: 12 },
      { top: '37%', drift: 'drift', kind: 'sprig', toneClass: 'text-sage/28', sizeClass: 'w-9 h-12', appearDelay: 1.7, animationDelay: 5.4, rotateDeg: 7 },
      { top: '60%', drift: 'gentle', kind: 'dot', toneClass: 'text-muted-rose/24', sizeClass: 'w-3.5 h-3.5', appearDelay: 2.1, animationDelay: 7.9 },
      { top: '84%', drift: 'sway', kind: 'flower', toneClass: 'text-blush/34', sizeClass: 'w-7 h-7', appearDelay: 2.8, animationDelay: 2.8, rotateDeg: -8 },
    ],
  },
  {
    side: 'right',
    offset: '0.6%',
    items: [
      { top: '6%', drift: 'sway', kind: 'stem', toneClass: 'text-sage/44', sizeClass: 'w-[3.25rem] h-[4.75rem]', appearDelay: 0.55, animationDelay: 0.8, rotateDeg: 8 },
      { top: '28%', drift: 'gentle', kind: 'flower', toneClass: 'text-blush/50', sizeClass: 'w-10 h-10', appearDelay: 1.0, animationDelay: 2.9, rotateDeg: -11 },
      { top: '53%', drift: 'drift', kind: 'diamond', toneClass: 'text-warm-gray/28', sizeClass: 'w-5 h-5', appearDelay: 1.6, animationDelay: 6.1, rotateDeg: 9 },
      { top: '76%', drift: 'slow', kind: 'sprig', toneClass: 'text-sage/34', sizeClass: 'w-10 h-14', appearDelay: 2.0, animationDelay: 4.2, rotateDeg: -6 },
    ],
  },
  {
    side: 'right',
    offset: '4.3%',
    items: [
      { top: '12%', drift: 'drift', kind: 'dot', toneClass: 'text-soft-terracotta/30', sizeClass: 'w-4 h-4', appearDelay: 0.95, animationDelay: 3.6 },
      { top: '33%', drift: 'sway', kind: 'compass', toneClass: 'text-muted-rose/40', sizeClass: 'w-10 h-10', appearDelay: 1.35, animationDelay: 1.7, rotateDeg: 7 },
      { top: '57%', drift: 'gentle', kind: 'flower', toneClass: 'text-blush/44', sizeClass: 'w-9 h-9', appearDelay: 1.85, animationDelay: 6.9, rotateDeg: -13 },
      { top: '86%', drift: 'slow', kind: 'dot', toneClass: 'text-sage/24', sizeClass: 'w-3.5 h-3.5', appearDelay: 2.5, animationDelay: 8.4 },
    ],
  },
  {
    side: 'right',
    offset: '8.0%',
    items: [
      { top: '4%', drift: 'gentle', kind: 'sprig', toneClass: 'text-sage/36', sizeClass: 'w-11 h-[3.75rem]', appearDelay: 0.75, animationDelay: 2.3, rotateDeg: 9 },
      { top: '37%', drift: 'drift', kind: 'diamond', toneClass: 'text-muted-rose/32', sizeClass: 'w-4 h-4', appearDelay: 1.25, animationDelay: 5.3, rotateDeg: -8 },
      { top: '61%', drift: 'sway', kind: 'stem', toneClass: 'text-sage/30', sizeClass: 'w-10 h-14', appearDelay: 1.95, animationDelay: 3.8, rotateDeg: -5 },
      { top: '81%', drift: 'slow', kind: 'dot', toneClass: 'text-blush/26', sizeClass: 'w-3 h-3', appearDelay: 2.35, animationDelay: 7.6 },
    ],
  },
  {
    side: 'right',
    offset: '11.7%',
    items: [
      { top: '16%', drift: 'gentle', kind: 'flower', toneClass: 'text-muted-rose/44', sizeClass: 'w-8 h-8', appearDelay: 0.85, animationDelay: 3.1, rotateDeg: 11 },
      { top: '42%', drift: 'slow', kind: 'sprig', toneClass: 'text-sage/30', sizeClass: 'w-9 h-[3.25rem]', appearDelay: 1.45, animationDelay: 1.5, rotateDeg: -7 },
      { top: '63%', drift: 'drift', kind: 'dot', toneClass: 'text-warm-gray/24', sizeClass: 'w-3.5 h-3.5', appearDelay: 2.05, animationDelay: 5.0 },
      { top: '88%', drift: 'sway', kind: 'diamond', toneClass: 'text-soft-terracotta/24', sizeClass: 'w-4 h-4', appearDelay: 2.75, animationDelay: 8.0 },
    ],
  },
  {
    side: 'right',
    offset: '15.4%',
    items: [
      { top: '9%', drift: 'sway', kind: 'compass', toneClass: 'text-muted-rose/34', sizeClass: 'w-9 h-9', appearDelay: 1.05, animationDelay: 2.0, rotateDeg: -6 },
      { top: '30%', drift: 'drift', kind: 'dot', toneClass: 'text-sage/26', sizeClass: 'w-3 h-3', appearDelay: 1.6, animationDelay: 4.7 },
      { top: '51%', drift: 'gentle', kind: 'flower', toneClass: 'text-blush/42', sizeClass: 'w-8 h-8', appearDelay: 2.0, animationDelay: 6.6, rotateDeg: -9 },
      { top: '73%', drift: 'slow', kind: 'sprig', toneClass: 'text-sage/28', sizeClass: 'w-9 h-[3.25rem]', appearDelay: 2.45, animationDelay: 3.4, rotateDeg: 6 },
    ],
  },
  {
    side: 'right',
    offset: '18.9%',
    items: [
      { top: '20%', drift: 'slow', kind: 'diamond', toneClass: 'text-warm-gray/22', sizeClass: 'w-4 h-4', appearDelay: 1.15, animationDelay: 1.2, rotateDeg: -11 },
      { top: '38%', drift: 'sway', kind: 'sprig', toneClass: 'text-sage/26', sizeClass: 'w-8 h-12', appearDelay: 1.8, animationDelay: 5.6, rotateDeg: -8 },
      { top: '62%', drift: 'drift', kind: 'dot', toneClass: 'text-muted-rose/22', sizeClass: 'w-3.5 h-3.5', appearDelay: 2.2, animationDelay: 7.7 },
      { top: '83%', drift: 'gentle', kind: 'flower', toneClass: 'text-blush/34', sizeClass: 'w-7 h-7', appearDelay: 2.9, animationDelay: 2.6, rotateDeg: 7 },
    ],
  },
]

function FloatingDecorGlyph({
  kind,
  toneClass,
  sizeClass,
  rotateDeg,
}: {
  kind: FloatingDecorKind
  toneClass: string
  sizeClass: string
  rotateDeg?: number
}) {
  const style = rotateDeg ? { transform: `rotate(${rotateDeg}deg)` } : undefined

  switch (kind) {
    case 'stem':
      return (
        <svg viewBox="0 0 60 90" className={cn(sizeClass, toneClass)} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M30 85 Q30 58 26 42 Q22 26 30 8" />
          <path d="M26 42 Q16 36 9 43 Q15 31 26 42" />
          <path d="M28 62 Q19 57 13 65 Q18 53 28 62" />
          <path d="M28 28 Q38 23 44 31 Q36 20 28 28" />
          <path d="M29 52 Q39 47 45 55 Q37 44 29 52" />
          <path d="M27 74 Q18 70 14 78 Q19 67 27 74" />
        </svg>
      )
    case 'sprig':
      return (
        <svg viewBox="0 0 52 66" className={cn(sizeClass, toneClass)} style={style} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round">
          <path d="M26 62 Q26 42 23 30 Q20 18 26 6" />
          <path d="M23 30 Q14 26 9 33 Q15 22 23 30" />
          <path d="M24 45 Q15 41 11 49 Q16 37 24 45" />
          <path d="M25 20 Q34 16 39 24 Q31 13 25 20" />
          <path d="M25 56 Q17 53 14 60 Q18 49 25 56" />
        </svg>
      )
    case 'flower':
      return (
        <svg viewBox="0 0 46 46" className={cn(sizeClass, toneClass)} style={style} fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
          <path d="M23 4 Q28 14 23 23 Q18 14 23 4Z" />
          <path d="M4 23 Q14 18 23 23 Q14 28 4 23Z" />
          <path d="M23 42 Q18 32 23 23 Q28 32 23 42Z" />
          <path d="M42 23 Q32 28 23 23 Q32 18 42 23Z" />
          <circle cx="23" cy="23" r="3" fill="currentColor" opacity="0.42" />
        </svg>
      )
    case 'compass':
      return (
        <svg viewBox="0 0 44 44" className={cn(sizeClass, toneClass)} style={style} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <circle cx="22" cy="22" r="5.2" />
          <path d="M22 16.8 Q22 10.5 22 5.5" />
          <path d="M22 27.2 Q22 33.5 22 38.5" />
          <path d="M16.8 22 Q10.5 22 5.5 22" />
          <path d="M27.2 22 Q33.5 22 38.5 22" />
          <path d="M18.5 18.5 Q14 14 11 11" />
          <path d="M25.5 25.5 Q30 30 33 33" />
          <path d="M25.5 18.5 Q30 14 33 11" />
          <path d="M18.5 25.5 Q14 30 11 33" />
        </svg>
      )
    case 'diamond':
      return (
        <svg viewBox="0 0 20 20" className={cn(sizeClass, toneClass)} style={style} fill="currentColor">
          <path d="M10 1 L13 8 L19 10 L13 12 L10 19 L7 12 L1 10 L7 8Z" />
        </svg>
      )
    case 'dot':
      return (
        <svg viewBox="0 0 16 16" className={cn(sizeClass, toneClass)} style={style} fill="currentColor">
          <circle cx="8" cy="8" r="4.6" />
        </svg>
      )
    default:
      return null
  }
}

export type EventInvitationHeroProps = {
  coverImageUrl?: string | null
  eventName: string
  eventTypeLabel: string
  hosts: Array<string>
  shouldUsePairLayout: boolean
  location?: string
  date?: string
  description?: string
  onShareClick?: () => void
  showFloatingDecor?: boolean
  showBackground?: boolean
}

export function EventInvitationHero({
  coverImageUrl,
  eventName,
  eventTypeLabel,
  hosts,
  shouldUsePairLayout,
  location,
  date,
  description,
  onShareClick,
  showFloatingDecor = true,
  showBackground = true,
}: EventInvitationHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden',
        showBackground && 'hero-invitation-bg',
        coverImageUrl
          ? 'pt-0 pb-0 md:pt-14 md:pb-32'
          : 'pt-12 pb-24 md:pt-18 md:pb-32 px-6',
      )}
    >
      {/* Edge-only side glows */}
      {showBackground && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute top-0 -left-16 w-64 h-full bg-sage/8 rounded-full blur-[100px]" />
          <div className="absolute top-0 -right-16 w-64 h-full bg-blush/10 rounded-full blur-[100px]" />
        </div>
      )}

      {/* Floating decorative elements (desktop only) */}
      {showFloatingDecor && (
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          aria-hidden="true"
        >
          {FLOATING_DECOR_COLUMNS.map((column, columnIndex) => (
            <div
              key={`${column.side}-${column.offset}-${columnIndex}`}
              className="absolute inset-y-0"
              style={
                column.side === 'left'
                  ? { left: column.offset }
                  : { right: column.offset }
              }
            >
              {column.items.map((item, itemIndex) => (
                <motion.div
                  key={`${column.side}-${columnIndex}-${itemIndex}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 2.4, delay: item.appearDelay }}
                  className={cn(
                    'absolute',
                    item.drift === 'gentle' && 'animate-float-gentle',
                    item.drift === 'slow' && 'animate-float-slow',
                    item.drift === 'drift' && 'animate-float-drift',
                    item.drift === 'sway' && 'animate-float-sway',
                  )}
                  style={{
                    top: item.top,
                    animationDelay: `${item.animationDelay}s`,
                  }}
                >
                  <FloatingDecorGlyph
                    kind={item.kind}
                    toneClass={item.toneClass}
                    sizeClass={item.sizeClass}
                    rotateDeg={item.rotateDeg}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
        {coverImageUrl ? (
          <>
            {/* Mobile: editorial full-bleed layout */}
            <EventHeroMobile
              coverImageUrl={coverImageUrl}
              eventName={eventName}
              eventTypeLabel={eventTypeLabel}
              hosts={hosts}
              shouldUsePairLayout={shouldUsePairLayout}
              location={location}
              date={date}
              description={description}
              onShareClick={onShareClick}
            />

            {/* Desktop: photo LEFT + invitation RIGHT */}
            <div className="relative hidden md:flex md:flex-row items-center md:items-center justify-center md:gap-0">
              {/* Polaroid photograph */}
              <motion.div
                initial={{ opacity: 0, y: 24, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: -2.5 }}
                transition={{ duration: 1.1, ease }}
                className="relative w-[85%] sm:w-[70%] md:w-[48%] lg:w-[44%] shrink-0 z-[1] md:mr-[-6%]"
              >
                <div
                  className="washi-tape"
                  style={{ top: '-0.55rem', left: '8%', transform: 'rotate(-14deg)' }}
                  aria-hidden="true"
                />
                <div
                  className="washi-tape-rose"
                  style={{ bottom: '2rem', right: '-1.2rem', transform: 'rotate(18deg)' }}
                  aria-hidden="true"
                />

                <div
                  className="photo-print relative p-3 pb-12 sm:p-4 sm:pb-14 md:p-5 md:pb-16"
                  style={{
                    boxShadow:
                      '0 2px 4px rgba(61,53,48,0.12), 0 8px 24px rgba(61,53,48,0.12), 0 20px 60px rgba(61,53,48,0.16), 0 40px 80px rgba(61,53,48,0.06)',
                  }}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={coverImageUrl}
                      alt=""
                      className="relative w-full object-cover"
                      style={{ filter: 'saturate(0.92) contrast(1.03) brightness(1.01)' }}
                      loading="eager"
                    />
                    <div className="photo-print-grain absolute inset-0" aria-hidden="true" />
                    <div className="photo-vignette absolute inset-0" aria-hidden="true" />
                  </div>

                  <p className="font-accent text-xl sm:text-2xl md:text-[1.6rem] text-espresso/60 text-center mt-4 sm:mt-5 tracking-wide leading-tight">
                    {eventName}
                  </p>
                </div>
              </motion.div>

              {/* Handmade paper invitation */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } },
                }}
                className="relative z-[2] w-[85%] sm:w-[70%] md:w-[48%] lg:w-[44%] md:ml-[-6%]"
                style={{ transform: 'rotate(1.8deg)' }}
              >
                {onShareClick && (
                  <button
                    type="button"
                    className={cn(
                      'absolute -top-8 -right-2 md:-top-10 md:-right-14 z-20',
                      HERO_SHARE_BUTTON_CLASS,
                    )}
                    onClick={onShareClick}
                  >
                    <Share2 className="size-3 text-muted-rose/75" />
                  </button>
                )}

                <div
                  className="washi-tape"
                  style={{ top: '-0.5rem', right: '12%', transform: 'rotate(8deg)' }}
                  aria-hidden="true"
                />
                <div
                  className="washi-tape-rose"
                  style={{ bottom: '1.5rem', left: '-1rem', transform: 'rotate(-12deg)' }}
                  aria-hidden="true"
                />

                <div
                  className="deckled-edge"
                  style={{
                    filter:
                      'drop-shadow(0 4px 8px rgba(61,53,48,0.12)) drop-shadow(0 12px 32px rgba(61,53,48,0.14)) drop-shadow(0 28px 64px rgba(61,53,48,0.10))',
                  }}
                >
                  <div className="paper-card relative text-center px-7 py-10 sm:px-9 sm:py-12 md:px-10 md:py-14">
                    <div
                      className="absolute top-5 left-1/2 -translate-x-1/2 w-12 sm:w-14"
                      aria-hidden="true"
                    >
                      <div className="h-px bg-muted-rose/15" />
                      <div className="flex justify-center mt-1.5">
                        <div className="size-1 rounded-full bg-muted-rose/15" />
                      </div>
                    </div>

                    <motion.div variants={fadeUp} className="mt-4">
                      <OrnamentDivider className="w-16 sm:w-20 mx-auto text-muted-rose/18" />
                    </motion.div>

                    <motion.p
                      variants={fadeUp}
                      className="font-accent text-lg sm:text-xl md:text-2xl text-muted-rose tracking-wide mt-4 sm:mt-5"
                    >
                      {eventTypeLabel}
                    </motion.p>

                    <motion.div variants={fadeUp} className="mt-4 sm:mt-5 md:mt-6">
                      {shouldUsePairLayout ? (
                        <>
                          <p className="font-display italic text-2xl sm:text-3xl md:text-4xl text-espresso leading-[0.9]">
                            {hosts[0]}
                          </p>
                          <p className="font-accent text-xl sm:text-2xl md:text-3xl text-muted-rose/50 my-1 md:my-1.5 inline-block -rotate-6">
                            &amp;
                          </p>
                          <p className="font-display italic text-2xl sm:text-3xl md:text-4xl text-espresso leading-[0.9]">
                            {hosts[1]}
                          </p>
                        </>
                      ) : (
                        <p className="font-display italic text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-espresso leading-[0.95]">
                          {hosts.join(' • ')}
                        </p>
                      )}
                    </motion.div>

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

                    {description && (
                      <motion.p
                        variants={fadeUp}
                        className="mt-3 text-xs sm:text-sm text-warm-gray/65 leading-relaxed max-w-xs mx-auto"
                      >
                        {capitalizeFirst(description)}
                      </motion.p>
                    )}

                    <motion.div variants={fadeUp} className="mt-5 sm:mt-6">
                      <OrnamentDivider className="w-16 sm:w-20 mx-auto text-muted-rose/18" />
                    </motion.div>

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
              </motion.div>
            </div>
          </>
        ) : (
          /* Without cover: centered classic invitation */
          <motion.div
            className="relative max-w-2xl mx-auto text-center px-6"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {onShareClick && (
              <button
                type="button"
                className={cn(
                  'absolute -top-2 -right-2 md:-right-1 z-20',
                  HERO_SHARE_BUTTON_CLASS,
                )}
                onClick={onShareClick}
              >
                <Share2 className="size-3 text-muted-rose/75" />
              </button>
            )}

            <motion.div variants={fadeUp} className="flex justify-center mb-8">
              <OrnamentDivider className="w-28 text-muted-rose/25" />
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="font-accent text-xl md:text-2xl text-muted-rose"
            >
              {eventTypeLabel}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 md:mt-8">
              {shouldUsePairLayout ? (
                <>
                  <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
                    {hosts[0]}
                  </p>
                  <p className="font-accent text-3xl md:text-4xl text-muted-rose/60 my-2 md:my-3 inline-block -rotate-6">
                    &amp;
                  </p>
                  <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
                    {hosts[1]}
                  </p>
                </>
              ) : (
                <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.95]">
                  {hosts.join(' • ')}
                </p>
              )}
            </motion.div>

            <motion.p variants={fadeUp} className="mt-6 text-warm-gray text-lg">
              {eventName}
            </motion.p>

            {(location || date) && (
              <motion.div
                variants={fadeUp}
                className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-warm-gray/70"
              >
                {location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {capitalizeFirst(location)}
                  </span>
                )}
                {date && <span>{formatDatePtBrFromIso(date)}</span>}
              </motion.div>
            )}

            {description && (
              <motion.p
                variants={fadeUp}
                className="mt-4 text-warm-gray leading-relaxed max-w-lg mx-auto"
              >
                {capitalizeFirst(description)}
              </motion.p>
            )}

            <motion.div variants={fadeUp} className="flex justify-center mt-8">
              <OrnamentDivider className="w-28 text-muted-rose/25" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
