import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, Copy, Heart, Loader2, Lock, Sparkles } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import { cn } from '../../lib/utils'
import { Dialog, DialogContent } from '../ui/dialog'
import { Button } from '../ui/button'
import { OrnamentDivider } from '../OrnamentDivider'
import {
  formatBRL,
  formatTimeRemaining,
  getCategoryCopy,
  type PaymentTier,
} from '../../lib/paywall'
import {
  usePaywallActions,
  usePaywallState,
  usePixStatusPolling,
  useCountdown,
} from '../../hooks/usePaywall'
import { track } from '../../integrations/posthog/events'

const ease = [0.22, 1, 0.36, 1] as const

type GiftPreview = {
  _id: Id<'gifts'>
  name: string
  imageUrl?: string | null
}

export type PaywallDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: Id<'events'> | undefined
  gifts: Array<GiftPreview>
  totalGifts: number
  onPaid?: () => void
  /**
   * When provided, after a successful payment the paywall closes and the
   * parent's share flow can run. Called with no args once we've shown the
   * success state for a beat.
   */
  onContinueToShare?: () => void
}

type Step = 'select' | 'pix' | 'success'

type LastPaymentSnapshot = {
  tier: PaymentTier
  category: 'common' | 'premium'
  amount: number
}

export function PaywallDialog({
  open,
  onOpenChange,
  eventId,
  gifts,
  totalGifts,
  onPaid,
  onContinueToShare,
}: PaywallDialogProps) {
  const { paywall } = usePaywallState(eventId)
  const { createPix, refresh } = usePaywallActions(eventId)

  const [step, setStep] = useState<Step>('select')
  const [selectedTier, setSelectedTier] = useState<PaymentTier | null>(null)
  const [isCreatingPix, setIsCreatingPix] = useState(false)
  const [pixError, setPixError] = useState<string | null>(null)
  const [copiedPix, setCopiedPix] = useState(false)
  const paywallShownRef = useRef(false)
  const paymentStartedAtRef = useRef<number | null>(null)
  const successFiredRef = useRef(false)
  const lastPaymentRef = useRef<LastPaymentSnapshot | null>(null)

  const activePayment = paywall?.activePayment ?? null
  const remainingMs = useCountdown(activePayment?.expiresAt)
  const timer = formatTimeRemaining(remainingMs ?? 0)
  usePixStatusPolling(activePayment?._id, activePayment?.status, refresh)

  // Reset internal state on open/close
  useEffect(() => {
    if (!open) {
      paywallShownRef.current = false
      successFiredRef.current = false
      paymentStartedAtRef.current = null
      lastPaymentRef.current = null
      setStep('select')
      setSelectedTier(null)
      setPixError(null)
      setCopiedPix(false)
      return
    }
    // Track paywall_shown once per open
    if (!paywallShownRef.current && paywall) {
      paywallShownRef.current = true
      track.paywallShown({
        eventId: String(eventId),
        category: paywall.category,
        totalGifts,
        trigger: 'share',
      })
    }
  }, [open, paywall, eventId, totalGifts])

  // If user opens with an existing pending Pix, jump to pix step
  useEffect(() => {
    if (!open || !paywall) return
    if (activePayment && activePayment.status === 'pending') {
      lastPaymentRef.current = {
        tier: activePayment.tier,
        category: activePayment.category,
        amount: activePayment.amount,
      }
      setStep('pix')
      setSelectedTier(activePayment.tier)
    } else if (paywall.isUnlocked || activePayment?.status === 'paid') {
      // already paid — show success briefly, then continue
      setStep('success')
    }
  }, [open, paywall, activePayment])

  // Trigger success state when Convex realtime detects 'paid'
  useEffect(() => {
    if (!open) return
    if (activePayment?.status === 'paid' && !successFiredRef.current) {
      successFiredRef.current = true
      setStep('success')
      const secondsToPay = paymentStartedAtRef.current
        ? Math.round((Date.now() - paymentStartedAtRef.current) / 1000)
        : undefined
      track.paymentSucceeded({
        tier: activePayment.tier,
        category: activePayment.category,
        price: activePayment.amount,
        eventId: String(eventId),
        secondsToPay,
      })
      onPaid?.()
    }
  }, [open, activePayment, eventId, onPaid])

  // Also handle the common path where the backend flips to unlocked and the
  // pending payment disappears from paywall state before the UI sees `paid`.
  useEffect(() => {
    if (!open) return
    if (paywall?.isUnlocked && !successFiredRef.current && step !== 'success') {
      successFiredRef.current = true
      setStep('success')
      const lastPayment = lastPaymentRef.current
      if (lastPayment) {
        const secondsToPay = paymentStartedAtRef.current
          ? Math.round((Date.now() - paymentStartedAtRef.current) / 1000)
          : undefined
        track.paymentSucceeded({
          tier: lastPayment.tier,
          category: lastPayment.category,
          price: lastPayment.amount,
          eventId: String(eventId),
          secondsToPay,
        })
      }
      onPaid?.()
    }
  }, [open, paywall?.isUnlocked, step, eventId, onPaid])

  const handleSelectTier = useCallback(
    async (tier: PaymentTier) => {
      if (!paywall) return
      setSelectedTier(tier)
      setPixError(null)
      const price =
        tier === 'single' ? paywall.prices.single : paywall.prices.lifetime
      track.paywallTierSelected({
        tier,
        category: paywall.category,
        price,
      })
      try {
        setIsCreatingPix(true)
        const result = await createPix(tier)
        if (result.status === 'paid') {
          // lifetime granted from prior purchase
          setStep('success')
          onPaid?.()
          return
        }
        paymentStartedAtRef.current = Date.now()
        lastPaymentRef.current = {
          tier,
          category: paywall.category,
          amount: result.amount,
        }
        track.pixQrGenerated({
          tier,
          category: paywall.category,
          price,
          eventId: String(eventId),
        })
        setStep('pix')
      } catch (caught) {
        setPixError(
          caught instanceof Error
            ? caught.message
            : 'Não conseguimos gerar o Pix agora. Tente de novo.',
        )
      } finally {
        setIsCreatingPix(false)
      }
    },
    [paywall, createPix, eventId, onPaid],
  )

  const handleCopyPix = useCallback(async () => {
    if (!activePayment?.brCode) return
    try {
      await navigator.clipboard.writeText(activePayment.brCode)
      setCopiedPix(true)
      window.setTimeout(() => setCopiedPix(false), 2000)
    } catch {
      setPixError('Não foi possível copiar agora. Copie manualmente abaixo.')
    }
  }, [activePayment?.brCode])

  const handleDismiss = useCallback(
    (way: 'talvez_depois' | 'fechou_modal') => {
      if (paywall) {
        track.paywallDismissed({
          eventId: String(eventId),
          category: paywall.category,
          wayOut: way,
          lastStep: step,
        })
        if (step === 'pix' && activePayment) {
          track.paymentAbandoned({
            tier: activePayment.tier,
            category: activePayment.category,
            price: activePayment.amount,
            eventId: String(eventId),
            lastStep: step,
          })
        }
      }
      onOpenChange(false)
    },
    [paywall, eventId, step, activePayment, onOpenChange],
  )

  const previewGifts = useMemo(() => gifts.slice(0, 3), [gifts])

  if (!paywall) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md text-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-rose mx-auto" />
          <p className="text-sm text-warm-gray/70 mt-3 font-display italic">
            preparando sua lista…
          </p>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleDismiss('fechou_modal')
        else onOpenChange(next)
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          'max-w-[min(640px,calc(100%-1.5rem))] sm:max-w-[640px]',
          'p-0 overflow-visible border-none bg-transparent shadow-none',
          'max-h-[calc(100svh-1.5rem)]',
        )}
      >
        <div className="relative">
          <div
            className={cn(
              'relative paper-card paper-card-bright deckled-edge',
              'max-h-[calc(100svh-1.5rem)]',
            )}
            style={{
              filter:
                'drop-shadow(0 4px 10px rgba(61,53,48,0.10)) drop-shadow(0 18px 50px rgba(61,53,48,0.16))',
            }}
          >
          <div
            className={cn(
              'scrollbar-hide overflow-y-auto max-h-[calc(100svh-1.5rem)]',
              'px-5 pt-8 pb-6 sm:px-10 sm:pt-12 sm:pb-10',
            )}
          >
            {/* Hidden a11y title */}
            <h2 className="sr-only">Sua lista está quase pronta</h2>

            <AnimatePresence mode="wait">
              {step === 'select' && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <SelectStep
                    paywall={paywall}
                    previewGifts={previewGifts}
                    totalGifts={totalGifts}
                    isCreatingPix={isCreatingPix}
                    selectedTier={selectedTier}
                    pixError={pixError}
                    onSelectTier={handleSelectTier}
                    onDismiss={() => handleDismiss('talvez_depois')}
                  />
                </motion.div>
              )}

              {step === 'pix' && activePayment && (
                <motion.div
                  key="pix"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <PixStep
                    brCode={activePayment.brCode}
                    brCodeBase64={activePayment.brCodeBase64}
                    amount={activePayment.amount}
                    timerLabel={timer.label}
                    isExpired={
                      timer.expired && Boolean(activePayment.expiresAt)
                    }
                    copied={copiedPix}
                    onCopy={() => void handleCopyPix()}
                    onDismiss={() => handleDismiss('talvez_depois')}
                  />
                </motion.div>
              )}

              {step === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <SuccessStep
                    hasLifetime={paywall.hasLifetimeAccess}
                    onContinue={() => {
                      onOpenChange(false)
                      onContinueToShare?.()
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>

          {/* Washi tapes — outside the clipped paper so they straddle the
              top edge like real tape holding the card to a surface. */}
          <div
            className="washi-tape-rose pointer-events-none"
            style={{
              top: '-0.55rem',
              left: '11%',
              transform: 'rotate(-9deg)',
            }}
            aria-hidden
          />
          <div
            className="washi-tape pointer-events-none"
            style={{
              top: '-0.45rem',
              right: '13%',
              transform: 'rotate(7deg)',
            }}
            aria-hidden
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────────
// STEP 1 — Choose tier
// ─────────────────────────────────────────────────────────
function SelectStep({
  paywall,
  previewGifts,
  totalGifts,
  isCreatingPix,
  selectedTier,
  pixError,
  onSelectTier,
  onDismiss,
}: {
  paywall: NonNullable<ReturnType<typeof usePaywallState>['paywall']>
  previewGifts: Array<GiftPreview>
  totalGifts: number
  isCreatingPix: boolean
  selectedTier: PaymentTier | null
  pixError: string | null
  onSelectTier: (tier: PaymentTier) => void
  onDismiss: () => void
}) {
  const copy = getCategoryCopy(paywall.category)

  return (
    <div className="relative text-center">
      <OrnamentDivider className="w-20 mx-auto text-muted-rose/30" />

      <p className="font-accent text-lg sm:text-2xl text-muted-rose mt-3 sm:mt-4 tracking-wide">
        {copy.eyebrow}
      </p>

      <h3 className="font-display italic text-[1.65rem] sm:text-[2.25rem] text-espresso mt-1 sm:mt-2 leading-tight">
        {copy.headline}
      </h3>

      {previewGifts.length > 0 && (
        <div className="mt-4 sm:mt-7 flex items-end justify-center gap-2 sm:gap-3">
          {previewGifts.map((gift, i) => (
            <GiftPolaroid
              key={gift._id}
              gift={gift}
              index={i}
              total={previewGifts.length}
            />
          ))}
          {totalGifts > previewGifts.length && (
            <div
              className="self-center font-accent text-muted-rose/80 text-base sm:text-lg pl-1"
              aria-label={`mais ${totalGifts - previewGifts.length}`}
            >
              + {totalGifts - previewGifts.length}
            </div>
          )}
        </div>
      )}

      <p className="text-[13px] sm:text-[15px] text-warm-gray leading-relaxed mt-4 sm:mt-6 max-w-md mx-auto">
        {copy.lead(totalGifts)}
      </p>

      <p className="mt-1.5 sm:mt-2 font-accent text-sm sm:text-lg text-warm-gray/55 tracking-wide max-w-md mx-auto leading-relaxed">
        {copy.sharedFooter}
      </p>

      <div className="mt-5 sm:mt-7 grid gap-3 sm:grid-cols-2 sm:gap-4">
        <TierCard
          title={copy.singleCardTitle}
          eyebrow={copy.singleCardEyebrow}
          subtitle={copy.singleCardSubtitle}
          price={paywall.prices.single}
          tier="single"
          cta={copy.cta}
          isLoading={isCreatingPix && selectedTier === 'single'}
          disabled={isCreatingPix}
          onSelect={() => onSelectTier('single')}
        />
        <TierCard
          title={copy.lifetimeCardTitle}
          eyebrow={copy.lifetimeCardEyebrow}
          subtitle={copy.lifetimeCardSubtitle}
          price={paywall.prices.lifetime}
          tier="lifetime"
          cta={copy.cta}
          highlighted
          isLoading={isCreatingPix && selectedTier === 'lifetime'}
          disabled={isCreatingPix}
          onSelect={() => onSelectTier('lifetime')}
        />
      </div>

      {pixError && (
        <p
          role="alert"
          className="text-xs text-destructive/85 mt-4 font-medium"
        >
          {pixError}
        </p>
      )}

      <div className="mt-5 sm:mt-6">
        {/* Desktop: single line. Mobile: two lines (primary + muted detail). */}
        <div className="hidden sm:flex items-center justify-center gap-2 text-xs text-warm-gray/70 uppercase tracking-[0.18em]">
          <span className="h-px w-6 bg-warm-gray/25" />
          <Lock className="size-3 text-sage" strokeWidth={2.2} aria-hidden />
          Pix · aprovação na hora · pagamento seguro
          <span className="h-px w-6 bg-warm-gray/25" />
        </div>
        <div className="sm:hidden flex flex-col items-center gap-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-warm-gray/80 uppercase tracking-[0.18em]">
            <Lock className="size-3 text-sage" strokeWidth={2.2} aria-hidden />
            pagamento seguro
          </div>
          <p className="text-[10px] text-warm-gray/55 tracking-[0.12em]">
            Pix · aprovação na hora
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        disabled={isCreatingPix}
        className={cn(
          'mt-4 sm:mt-5 inline-block',
          'font-accent text-lg sm:text-xl tracking-wide',
          'text-warm-gray/75 hover:text-espresso',
          'underline decoration-warm-gray/25 hover:decoration-espresso/60',
          'underline-offset-[6px] decoration-[1.5px]',
          'transition-colors duration-200',
          isCreatingPix && 'pointer-events-none opacity-50',
        )}
      >
        talvez depois
      </button>
    </div>
  )
}

function GiftPolaroid({
  gift,
  index,
  total,
}: {
  gift: GiftPreview
  index: number
  total: number
}) {
  // Subtle hand-placed rotation per card
  const rotations = [-4, 1.5, 3.5]
  const rot = rotations[index % rotations.length]
  const sizeClass = total === 1 ? 'w-28' : 'w-20 sm:w-24'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: rot }}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.08, ease }}
      className={cn('relative shrink-0', sizeClass)}
      style={{ transformOrigin: 'center bottom' }}
    >
      <div
        className="photo-print relative p-1.5 pb-5 sm:p-2 sm:pb-6"
        style={{
          boxShadow:
            '0 1px 2px rgba(61,53,48,0.10), 0 6px 14px rgba(61,53,48,0.12)',
        }}
      >
        <div className="relative overflow-hidden aspect-square bg-blush/20">
          {gift.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gift.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: 'saturate(0.92) contrast(1.03)' }}
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-rose/40">
              <Heart className="size-5" strokeWidth={1.5} />
            </div>
          )}
          <div className="photo-print-grain absolute inset-0" aria-hidden />
        </div>
        <p className="font-accent text-[10px] sm:text-[11px] text-espresso/60 text-center mt-1 truncate tracking-wide">
          {gift.name}
        </p>
      </div>
    </motion.div>
  )
}

function TierCard({
  title,
  eyebrow,
  subtitle,
  price,
  tier,
  cta,
  highlighted = false,
  isLoading,
  disabled,
  onSelect,
}: {
  title: string
  eyebrow: string
  subtitle: string
  price: number
  tier: PaymentTier
  cta: string
  highlighted?: boolean
  isLoading: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onFocus={() =>
        track.paywallTierViewed({
          tier,
          category: 'common', // category not strictly needed for hover; UI doesn't know — kept benign
        })
      }
      disabled={disabled}
      className={cn(
        'group relative text-left rounded-2xl px-4 py-4 sm:px-6 sm:py-6',
        'bg-warm-white/85 border transition-all duration-300',
        'shadow-[0_2px_6px_rgba(61,53,48,0.06)]',
        'hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(61,53,48,0.10)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/65',
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:translate-y-0 disabled:shadow-[0_2px_6px_rgba(61,53,48,0.06)]',
        highlighted
          ? 'border-muted-rose/55 ring-1 ring-muted-rose/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(248,238,233,0.85))]'
          : 'border-border/60',
      )}
    >
      {highlighted && (
        <span
          className={cn(
            'absolute -top-3 left-1/2 -translate-x-1/2',
            'inline-flex items-center gap-1 px-3 py-1 rounded-full',
            'bg-muted-rose text-warm-white text-[10px] font-medium uppercase tracking-[0.15em]',
            'shadow-[0_2px_6px_rgba(201,169,166,0.4)]',
          )}
        >
          <Sparkles className="size-2.5" strokeWidth={2} />
          favorita
        </span>
      )}

      <p className="font-display italic text-base sm:text-lg text-espresso leading-tight">
        {title}
      </p>

      <p className="font-accent text-sm sm:text-base text-muted-rose/80 mt-0.5 sm:mt-1 leading-snug">
        {eyebrow}
      </p>

      <p className="font-display text-[1.5rem] sm:text-[1.85rem] text-espresso mt-2 sm:mt-3 leading-none">
        {formatBRL(price)}
      </p>

      <p className="text-[12px] sm:text-[13px] text-warm-gray/85 leading-relaxed mt-2 sm:mt-3">
        {subtitle}
      </p>

      <span
        className={cn(
          'mt-3 sm:mt-4 flex items-center justify-end gap-1.5 text-[13px] font-medium',
          'text-muted-rose group-hover:text-soft-terracotta transition-colors',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            gerando Pix…
          </>
        ) : (
          <>
            {cta}
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </>
        )}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// STEP 2 — Pix QR
// ─────────────────────────────────────────────────────────
function PixStep({
  brCode,
  brCodeBase64,
  amount,
  timerLabel,
  isExpired,
  copied,
  onCopy,
  onDismiss,
}: {
  brCode?: string
  brCodeBase64?: string
  amount: number
  timerLabel: string
  isExpired: boolean
  copied: boolean
  onCopy: () => void
  onDismiss: () => void
}) {
  const qrSrc = brCodeBase64
    ? brCodeBase64.startsWith('data:')
      ? brCodeBase64
      : `data:image/png;base64,${brCodeBase64}`
    : null

  return (
    <div className="relative text-center">
      <div className="flex justify-center">
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-warm-gray/60">
          <Lock className="size-2.5 text-sage" strokeWidth={2.4} aria-hidden />
          pagamento seguro
        </span>
      </div>

      <OrnamentDivider className="w-20 mx-auto text-muted-rose/30 mt-3" />

      <p className="font-accent text-xl sm:text-2xl text-muted-rose mt-4 tracking-wide">
        falta só um passo
      </p>

      <h3 className="font-display italic text-2xl sm:text-[1.8rem] text-espresso mt-2 leading-tight">
        abra seu banco e leia o código
      </h3>

      <div className="mt-6 flex flex-col items-center">
        {qrSrc ? (
          <motion.div
            initial={{ opacity: 0, rotate: -3, y: 10 }}
            animate={{ opacity: 1, rotate: -1.5, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="relative photo-print p-4 sm:p-5 pb-10"
            style={{
              boxShadow:
                '0 2px 6px rgba(61,53,48,0.12), 0 14px 36px rgba(61,53,48,0.16)',
            }}
          >
            <div
              className="washi-tape"
              style={{
                top: '-0.6rem',
                left: '50%',
                transform: 'translateX(-50%) rotate(-3deg)',
              }}
              aria-hidden
            />
            <img
              src={qrSrc}
              alt="QR code Pix"
              className="block w-44 h-44 sm:w-52 sm:h-52 mix-blend-multiply"
            />
            <p className="font-accent text-base text-espresso/55 text-center mt-2 tracking-wide">
              {formatBRL(amount)} · pix
            </p>
          </motion.div>
        ) : (
          <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-xl bg-blush/20 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-rose" />
          </div>
        )}

        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'mt-5 inline-flex items-center gap-2 rounded-full',
            'px-4 py-2 text-sm bg-warm-white border border-muted-rose/35',
            'shadow-[0_2px_6px_rgba(61,53,48,0.08)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(61,53,48,0.1)]',
            'transition-all text-espresso',
          )}
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-sage" />
              copiado!
            </>
          ) : (
            <>
              <Copy className="size-3.5 text-muted-rose" />
              copiar código Pix
            </>
          )}
        </button>

        {brCode && (
          <p className="mt-3 max-w-md mx-auto text-[10px] text-warm-gray/55 break-all leading-relaxed font-mono">
            {brCode.slice(0, 80)}
            {brCode.length > 80 && '…'}
          </p>
        )}
      </div>

      <div
        className={cn(
          'mt-6 inline-flex items-center gap-2 text-xs',
          isExpired ? 'text-destructive/80' : 'text-warm-gray/70',
        )}
      >
        <span
          className={cn(
            'inline-block size-1.5 rounded-full',
            isExpired ? 'bg-destructive/70' : 'bg-sage animate-pulse',
          )}
        />
        {isExpired ? (
          <>esse Pix expirou · feche e gere um novo</>
        ) : (
          <>
            esperando pagamento · expira em{' '}
            <span className="font-medium tabular-nums text-espresso/80">
              {timerLabel}
            </span>
          </>
        )}
      </div>

      <p className="mt-5 text-xs text-warm-gray/65 leading-relaxed max-w-sm mx-auto">
        Assim que o seu banco confirmar, a gente libera sua lista — sem você
        precisar fazer mais nada.
      </p>

      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          'mt-5 inline-block text-warm-gray/55 hover:text-warm-gray',
          'font-accent text-base tracking-wide underline-offset-4 hover:underline',
          'transition-colors duration-200',
        )}
      >
        fechar e voltar depois
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// STEP 3 — Success
// ─────────────────────────────────────────────────────────
function SuccessStep({
  hasLifetime,
  onContinue,
}: {
  hasLifetime: boolean
  onContinue: () => void
}) {
  return (
    <div className="relative text-center py-2">
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.1 }}
        className="mx-auto inline-flex items-center justify-center size-14 rounded-full bg-sage/30 ring-1 ring-sage/40"
      >
        <Check className="size-7 text-espresso/80" strokeWidth={2} />
      </motion.div>

      <p className="font-accent text-xl sm:text-2xl text-muted-rose mt-5 tracking-wide">
        pronta pra o mundo
      </p>

      <h3 className="font-display italic text-3xl sm:text-[2.25rem] text-espresso mt-2 leading-tight">
        agora é só compartilhar
      </h3>

      {hasLifetime && (
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-warm-gray/65">
          acesso pra sempre · qualquer celebração
        </p>
      )}

      <div className="mt-6">
        <OrnamentDivider className="w-20 mx-auto text-muted-rose/30" />
      </div>

      <p className="mt-5 text-sm text-warm-gray leading-relaxed max-w-sm mx-auto">
        Sua lista já está pronta pra ser vista por quem você ama. Quando receber
        um presente, ele aparece reservado aqui.
      </p>

      <Button className="mt-7" size="lg" onClick={onContinue}>
        compartilhar agora
      </Button>
    </div>
  )
}
