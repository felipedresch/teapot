import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import type {
  PaymentStatus,
  PaymentTier,
  PaywallCategory,
} from '../lib/paywall'

export type PaywallState = {
  eventId: Id<'events'>
  isHost: boolean
  isUnlocked: boolean
  canPublish: boolean
  isPublic: boolean
  monetizationStatus: 'grandfathered' | 'requires_payment' | 'paid'
  category: PaywallCategory
  prices: { single: number; lifetime: number; currency: string }
  hasLifetimeAccess: boolean
  activePayment: {
    _id: Id<'payments'>
    tier: PaymentTier
    category: PaywallCategory
    amount: number
    currency: string
    status: PaymentStatus
    brCode?: string
    brCodeBase64?: string
    expiresAt?: number
    providerCheckoutId?: string
  } | null
}

export function usePaywallState(eventId: Id<'events'> | undefined) {
  const data = useQuery(
    api.payments.getPaywallState,
    eventId ? { eventId } : 'skip',
  ) as PaywallState | undefined | null

  return {
    paywall: data ?? null,
    isLoading: eventId !== undefined && data === undefined,
  }
}

export function usePaywallActions(eventId: Id<'events'> | undefined) {
  const createPixPayment = useAction(api.payments.createPixPayment)
  const refreshPixPaymentStatus = useAction(
    api.payments.refreshPixPaymentStatus,
  )
  const publishEvent = useMutation(api.payments.publishEvent)

  const createPix = useCallback(
    async (tier: PaymentTier) => {
      if (!eventId) throw new Error('eventId requerido')
      return await createPixPayment({ eventId, tier })
    },
    [createPixPayment, eventId],
  )

  const refresh = useCallback(
    async (paymentId: Id<'payments'>) => {
      return await refreshPixPaymentStatus({ paymentId })
    },
    [refreshPixPaymentStatus],
  )

  const publish = useCallback(async () => {
    if (!eventId) throw new Error('eventId requerido')
    await publishEvent({ eventId })
  }, [publishEvent, eventId])

  return { createPix, refresh, publish }
}

/**
 * Polls the Convex action `refreshPixPaymentStatus` as a fallback when the
 * webhook is delayed. The realtime query (`getPaywallState`) is the primary
 * channel — this is belt-and-suspenders.
 */
export function usePixStatusPolling(
  paymentId: Id<'payments'> | undefined,
  status: PaymentStatus | undefined,
  refresh: (paymentId: Id<'payments'>) => Promise<{ status: PaymentStatus }>,
) {
  const isActive = paymentId !== undefined && status === 'pending'
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    if (!isActive || !paymentId) return
    let cancelled = false
    const tick = async () => {
      try {
        await refreshRef.current(paymentId)
      } catch {
        // swallow — realtime query will pick up actual state
      }
    }
    const interval = window.setInterval(() => {
      if (!cancelled) void tick()
    }, 5000)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [isActive, paymentId])
}

/** Live countdown until `expiresAt` (ms epoch). */
export function useCountdown(expiresAt: number | undefined) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!expiresAt) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [expiresAt])

  return useMemo(() => {
    if (!expiresAt) return undefined
    return Math.max(0, expiresAt - now)
  }, [expiresAt, now])
}
