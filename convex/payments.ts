import { getAuthUserId } from '@convex-dev/auth/server'
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'
import { getStoredVisibility, getEffectiveVisibility } from './events'

const ABACATEPAY_API_BASE_URL = 'https://api.abacatepay.com/v2'
const PIX_EXPIRES_IN_SECONDS = 60 * 60
const CURRENCY = 'BRL'

const PREMIUM_EVENT_TYPES = new Set([
  'wedding',
  'engagement',
  'wedding-anniversary',
  'bodas',
  'noivado',
])

type PaywallCategory = 'common' | 'premium'
type PaymentTier = 'single' | 'lifetime'
type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'refunded'
  | 'disputed'

type PaymentDoc = {
  _id: Id<'payments'>
  eventId: Id<'events'>
  userId: Id<'users'>
  tier: PaymentTier
  category: PaywallCategory
  amount: number
  currency: string
  status: PaymentStatus
  provider: 'abacatepay'
  providerCheckoutId?: string
  externalId: string
  brCode?: string
  brCodeBase64?: string
  expiresAt?: number
  createdAt: number
  updatedAt: number
  paidAt?: number
  platformFee?: number
  receiptUrl?: string
}

type AbacateTransparentCreateResponse = {
  data?: {
    id?: string
    amount?: number
    status?: string
    devMode?: boolean
    brCode?: string
    brCodeBase64?: string
    platformFee?: number
    createdAt?: string
    updatedAt?: string
    expiresAt?: string
    metadata?: Record<string, unknown>
  }
  success?: boolean
  error?: string | null
}

type AbacateTransparentCheckResponse = {
  data?: {
    id?: string
    status?: string
    expiresAt?: string
  }
  success?: boolean
  error?: string | null
}

type PaymentResponse = {
  paymentId?: Id<'payments'>
  status: PaymentStatus
  amount: number
  currency: string
  brCode?: string
  brCodeBase64?: string
  expiresAt?: number
  providerCheckoutId?: string
}

type PaymentAnalyticsPayload = {
  matched: boolean
  paymentId?: Id<'payments'>
  eventId?: Id<'events'>
  userId?: Id<'users'>
  tier?: PaymentTier
  category?: PaywallCategory
  amount?: number
  createdAt?: number
  paidAt?: number
  status?: PaymentStatus
}

type PaymentCreationContext = {
  eventName: string
  isHost: boolean
  isUnlocked: boolean
  category: PaywallCategory
  prices: {
    single: number
    lifetime: number
  }
  activePayment: {
    _id: Id<'payments'>
    status: PaymentStatus
    amount: number
    currency: string
    brCode?: string
    brCodeBase64?: string
    expiresAt?: number
    providerCheckoutId?: string
  } | null
}

type StatusRefreshPayment = {
  _id: Id<'payments'>
  eventId: Id<'events'>
  userId: Id<'users'>
  tier: PaymentTier
  category: PaywallCategory
  status: PaymentStatus
  amount: number
  createdAt: number
  providerCheckoutId?: string
  platformFee?: number
}

export const getPaywallState = query({
  args: {
    eventId: v.id('events'),
  },
  returns: v.object({
    eventId: v.id('events'),
    isHost: v.boolean(),
    isUnlocked: v.boolean(),
    canPublish: v.boolean(),
    isPublic: v.boolean(),
    visibility: v.union(
      v.literal('draft'),
      v.literal('unlisted'),
      v.literal('public'),
    ),
    storedVisibility: v.union(
      v.literal('draft'),
      v.literal('unlisted'),
      v.literal('public'),
    ),
    monetizationStatus: v.union(
      v.literal('grandfathered'),
      v.literal('requires_payment'),
      v.literal('paid'),
    ),
    category: v.union(v.literal('common'), v.literal('premium')),
    prices: v.object({
      single: v.number(),
      lifetime: v.number(),
      currency: v.string(),
    }),
    hasLifetimeAccess: v.boolean(),
    activePayment: v.union(
      v.null(),
      v.object({
        _id: v.id('payments'),
        tier: v.union(v.literal('single'), v.literal('lifetime')),
        category: v.union(v.literal('common'), v.literal('premium')),
        amount: v.number(),
        currency: v.string(),
        status: v.union(
          v.literal('pending'),
          v.literal('paid'),
          v.literal('expired'),
          v.literal('cancelled'),
          v.literal('failed'),
          v.literal('refunded'),
          v.literal('disputed'),
        ),
        brCode: v.optional(v.string()),
        brCodeBase64: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        providerCheckoutId: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    const isHost = userId ? await isEventHost(ctx, args.eventId, userId) : false
    const category = getPaywallCategory(event.eventType, event.customEventType)
    const prices = getPrices(category)
    const hasLifetimeAccess = userId
      ? await hasActiveLifetimeAccess(ctx, userId)
      : false
    const monetizationStatus = getEventMonetizationStatus(event)
    const isUnlocked =
      monetizationStatus === 'grandfathered' ||
      monetizationStatus === 'paid' ||
      hasLifetimeAccess
    const activePayment = userId
      ? await getActivePendingPayment(ctx, args.eventId, userId)
      : null
    const storedVisibility = getStoredVisibility(event)
    const effectiveVisibility = getEffectiveVisibility(event, isUnlocked)

    return {
      eventId: args.eventId,
      isHost,
      isUnlocked,
      canPublish: isHost && isUnlocked,
      isPublic: effectiveVisibility === 'public',
      visibility: effectiveVisibility,
      storedVisibility,
      monetizationStatus,
      category,
      prices: {
        ...prices,
        currency: CURRENCY,
      },
      hasLifetimeAccess,
      activePayment: activePayment
        ? {
            _id: activePayment._id,
            tier: activePayment.tier,
            category: activePayment.category,
            amount: activePayment.amount,
            currency: activePayment.currency,
            status: activePayment.status,
            brCode: activePayment.brCode,
            brCodeBase64: activePayment.brCodeBase64,
            expiresAt: activePayment.expiresAt,
            providerCheckoutId: activePayment.providerCheckoutId,
          }
        : null,
    }
  },
})

export const publishEvent = mutation({
  args: {
    eventId: v.id('events'),
    visibility: v.optional(
      v.union(v.literal('draft'), v.literal('unlisted'), v.literal('public')),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    if (!(await isEventHost(ctx, args.eventId, userId))) {
      throw new Error('Somente hosts podem publicar o evento')
    }

    const hasLifetimeAccess = await hasActiveLifetimeAccess(ctx, userId)
    const monetizationStatus = getEventMonetizationStatus(event)
    const canPublish =
      monetizationStatus === 'grandfathered' ||
      monetizationStatus === 'paid' ||
      hasLifetimeAccess

    const targetVisibility = args.visibility ?? 'unlisted'

    if (targetVisibility !== 'draft' && !canPublish) {
      throw new Error('Pagamento necessário para compartilhar este evento.')
    }

    await ctx.db.patch(args.eventId, {
      visibility: targetVisibility,
      isPublic: targetVisibility === 'public',
      monetizationStatus: hasLifetimeAccess ? 'paid' : monetizationStatus,
      paidAt: hasLifetimeAccess ? Date.now() : event.paidAt,
    })

    return null
  },
})

export const createPixPayment = action({
  args: {
    eventId: v.id('events'),
    tier: v.union(v.literal('single'), v.literal('lifetime')),
  },
  returns: v.object({
    paymentId: v.optional(v.id('payments')),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
    amount: v.number(),
    currency: v.string(),
    brCode: v.optional(v.string()),
    brCodeBase64: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    providerCheckoutId: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<PaymentResponse> => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const context: PaymentCreationContext = await ctx.runQuery(
      internal.payments.getPaymentCreationContext,
      {
        eventId: args.eventId,
        userId,
      },
    )

    if (!context.isHost) {
      throw new Error('Somente hosts podem iniciar o pagamento')
    }

    if (context.isUnlocked) {
      return {
        status: 'paid' as const,
        amount:
          args.tier === 'single'
            ? context.prices.single
            : context.prices.lifetime,
        currency: CURRENCY,
      }
    }

    if (context.activePayment) {
      return {
        paymentId: context.activePayment._id,
        status: context.activePayment.status,
        amount: context.activePayment.amount,
        currency: context.activePayment.currency,
        brCode: context.activePayment.brCode,
        brCodeBase64: context.activePayment.brCodeBase64,
        expiresAt: context.activePayment.expiresAt,
        providerCheckoutId: context.activePayment.providerCheckoutId,
      }
    }

    const apiKey = getRequiredEnv('ABACATEPAY_API_KEY')
    const amount =
      args.tier === 'single' ? context.prices.single : context.prices.lifetime
    const externalId = `mywish_${crypto.randomUUID()}`
    const paymentId: Id<'payments'> = await ctx.runMutation(
      internal.payments.createPendingPayment,
      {
        eventId: args.eventId,
        userId,
        tier: args.tier,
        category: context.category,
        amount,
        externalId,
      },
    )

    try {
      const checkout = await createAbacatePixCheckout(apiKey, {
        amount,
        externalId,
        description: getPaymentDescription(context.eventName, args.tier),
        eventId: args.eventId,
        userId,
        tier: args.tier,
        category: context.category,
      })

      const attached: Omit<PaymentResponse, 'paymentId'> =
        await ctx.runMutation(internal.payments.attachProviderCheckout, {
          paymentId,
          providerCheckoutId: checkout.providerCheckoutId,
          brCode: checkout.brCode,
          brCodeBase64: checkout.brCodeBase64,
          expiresAt: checkout.expiresAt,
          platformFee: checkout.platformFee,
        })

      await ctx.runAction(internal.analytics.capturePostHogEvent, {
        eventName: 'pix_qr_generated',
        distinctId: String(userId),
        properties: {
          eventId: String(args.eventId),
          paymentId: String(paymentId),
          tier: args.tier,
          category: context.category,
          price: amount / 100,
          amount,
          currency: CURRENCY,
          provider: 'abacatepay',
        },
      })

      return {
        paymentId,
        status: attached.status,
        amount: attached.amount,
        currency: attached.currency,
        brCode: attached.brCode,
        brCodeBase64: attached.brCodeBase64,
        expiresAt: attached.expiresAt,
        providerCheckoutId: attached.providerCheckoutId,
      }
    } catch (error) {
      await ctx.runMutation(internal.payments.markPaymentFailed, {
        paymentId,
        failureReason:
          error instanceof Error ? error.message : 'Erro desconhecido',
      })
      throw error
    }
  },
})

export const refreshPixPaymentStatus = action({
  args: {
    paymentId: v.id('payments'),
  },
  returns: v.object({
    paymentId: v.id('payments'),
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ paymentId: Id<'payments'>; status: PaymentStatus }> => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const payment: StatusRefreshPayment | null = await ctx.runQuery(
      internal.payments.getPaymentForStatusRefresh,
      {
        paymentId: args.paymentId,
        userId,
      },
    )
    if (!payment) {
      throw new Error('Pagamento não encontrado')
    }
    if (!payment.providerCheckoutId) {
      return { paymentId: args.paymentId, status: payment.status }
    }
    if (payment.status !== 'pending') {
      return { paymentId: args.paymentId, status: payment.status }
    }

    const apiKey = getRequiredEnv('ABACATEPAY_API_KEY')
    const providerStatus = await checkAbacatePixStatus(
      apiKey,
      payment.providerCheckoutId,
    )
    const normalizedStatus = normalizeProviderStatus(providerStatus.status)

    if (normalizedStatus === 'paid') {
      await ctx.runMutation(internal.payments.markPaymentPaid, {
        paymentId: payment._id,
        providerCheckoutId: payment.providerCheckoutId,
        paidAmount: payment.amount,
        platformFee: payment.platformFee,
        receiptUrl: undefined,
      })

      const paidAt = Date.now()
      await ctx.runAction(internal.analytics.capturePostHogEvent, {
        eventName: 'payment_succeeded',
        distinctId: String(payment.userId),
        properties: {
          eventId: String(payment.eventId),
          paymentId: String(payment._id),
          tier: payment.tier,
          category: payment.category,
          price: payment.amount / 100,
          amount: payment.amount,
          provider: 'abacatepay',
          providerCheckoutId: payment.providerCheckoutId,
          confirmationSource: 'status_refresh',
          secondsToPay: Math.max(
            0,
            Math.round((paidAt - payment.createdAt) / 1000),
          ),
        },
      })

      return { paymentId: args.paymentId, status: 'paid' }
    }

    if (normalizedStatus === 'expired' || normalizedStatus === 'cancelled') {
      await ctx.runMutation(internal.payments.markPaymentTerminal, {
        paymentId: payment._id,
        status: normalizedStatus,
      })
      return { paymentId: args.paymentId, status: normalizedStatus }
    }

    return { paymentId: args.paymentId, status: payment.status }
  },
})

export const getPaymentCreationContext = internalQuery({
  args: {
    eventId: v.id('events'),
    userId: v.id('users'),
  },
  returns: v.object({
    eventName: v.string(),
    isHost: v.boolean(),
    isUnlocked: v.boolean(),
    category: v.union(v.literal('common'), v.literal('premium')),
    prices: v.object({
      single: v.number(),
      lifetime: v.number(),
    }),
    activePayment: v.union(
      v.null(),
      v.object({
        _id: v.id('payments'),
        status: v.union(
          v.literal('pending'),
          v.literal('paid'),
          v.literal('expired'),
          v.literal('cancelled'),
          v.literal('failed'),
          v.literal('refunded'),
          v.literal('disputed'),
        ),
        amount: v.number(),
        currency: v.string(),
        brCode: v.optional(v.string()),
        brCodeBase64: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        providerCheckoutId: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    const isHost = await isEventHost(ctx, args.eventId, args.userId)
    const hasLifetime = await hasActiveLifetimeAccess(ctx, args.userId)
    const category = getPaywallCategory(event.eventType, event.customEventType)
    const activePayment = await getActivePendingPayment(
      ctx,
      args.eventId,
      args.userId,
    )
    const monetizationStatus = getEventMonetizationStatus(event)

    return {
      eventName: event.name,
      isHost,
      isUnlocked:
        hasLifetime ||
        monetizationStatus === 'grandfathered' ||
        monetizationStatus === 'paid',
      category,
      prices: getPrices(category),
      activePayment: activePayment
        ? {
            _id: activePayment._id,
            status: activePayment.status,
            amount: activePayment.amount,
            currency: activePayment.currency,
            brCode: activePayment.brCode,
            brCodeBase64: activePayment.brCodeBase64,
            expiresAt: activePayment.expiresAt,
            providerCheckoutId: activePayment.providerCheckoutId,
          }
        : null,
    }
  },
})

export const getEventPublishContext = internalQuery({
  args: {
    eventId: v.id('events'),
    userId: v.id('users'),
  },
  returns: v.object({
    isHost: v.boolean(),
    canPublish: v.boolean(),
    monetizationStatus: v.union(
      v.literal('grandfathered'),
      v.literal('requires_payment'),
      v.literal('paid'),
    ),
  }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId)
    if (!event) {
      throw new Error('Evento não encontrado')
    }

    const isHost = await isEventHost(ctx, args.eventId, args.userId)
    const hasLifetime = await hasActiveLifetimeAccess(ctx, args.userId)
    const monetizationStatus = getEventMonetizationStatus(event)

    return {
      isHost,
      canPublish:
        isHost &&
        (hasLifetime ||
          monetizationStatus === 'grandfathered' ||
          monetizationStatus === 'paid'),
      monetizationStatus,
    }
  },
})

export const getPaymentForStatusRefresh = internalQuery({
  args: {
    paymentId: v.id('payments'),
    userId: v.id('users'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('payments'),
      eventId: v.id('events'),
      userId: v.id('users'),
      tier: v.union(v.literal('single'), v.literal('lifetime')),
      category: v.union(v.literal('common'), v.literal('premium')),
      status: v.union(
        v.literal('pending'),
        v.literal('paid'),
        v.literal('expired'),
        v.literal('cancelled'),
        v.literal('failed'),
        v.literal('refunded'),
        v.literal('disputed'),
      ),
      amount: v.number(),
      createdAt: v.number(),
      providerCheckoutId: v.optional(v.string()),
      platformFee: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment || payment.userId !== args.userId) {
      return null
    }

    return {
      _id: payment._id,
      eventId: payment.eventId,
      userId: payment.userId,
      tier: payment.tier,
      category: payment.category,
      status: payment.status,
      amount: payment.amount,
      createdAt: payment.createdAt,
      providerCheckoutId: payment.providerCheckoutId,
      platformFee: payment.platformFee,
    }
  },
})

export const createPendingPayment = internalMutation({
  args: {
    eventId: v.id('events'),
    userId: v.id('users'),
    tier: v.union(v.literal('single'), v.literal('lifetime')),
    category: v.union(v.literal('common'), v.literal('premium')),
    amount: v.number(),
    externalId: v.string(),
  },
  returns: v.id('payments'),
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert('payments', {
      eventId: args.eventId,
      userId: args.userId,
      tier: args.tier,
      category: args.category,
      amount: args.amount,
      currency: CURRENCY,
      status: 'pending',
      provider: 'abacatepay',
      externalId: args.externalId,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const attachProviderCheckout = internalMutation({
  args: {
    paymentId: v.id('payments'),
    providerCheckoutId: v.string(),
    brCode: v.string(),
    brCodeBase64: v.string(),
    expiresAt: v.optional(v.number()),
    platformFee: v.optional(v.number()),
  },
  returns: v.object({
    status: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
    amount: v.number(),
    currency: v.string(),
    brCode: v.optional(v.string()),
    brCodeBase64: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    providerCheckoutId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) {
      throw new Error('Pagamento não encontrado')
    }

    await ctx.db.patch(args.paymentId, {
      providerCheckoutId: args.providerCheckoutId,
      brCode: args.brCode,
      brCodeBase64: args.brCodeBase64,
      expiresAt: args.expiresAt,
      platformFee: args.platformFee,
      updatedAt: Date.now(),
    })

    return {
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      brCode: args.brCode,
      brCodeBase64: args.brCodeBase64,
      expiresAt: args.expiresAt,
      providerCheckoutId: args.providerCheckoutId,
    }
  },
})

export const markPaymentFailed = internalMutation({
  args: {
    paymentId: v.id('payments'),
    failureReason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: 'failed',
      failureReason: args.failureReason,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const markPaymentTerminal = internalMutation({
  args: {
    paymentId: v.id('payments'),
    status: v.union(
      v.literal('expired'),
      v.literal('cancelled'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.paymentId, {
      status: args.status,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const recordWebhookEvent = internalMutation({
  args: {
    providerEventId: v.string(),
    eventName: v.string(),
    processedStatus: v.union(v.literal('processing'), v.literal('processed')),
    rawPayload: v.any(),
  },
  returns: v.object({ alreadyProcessed: v.boolean() }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('paymentWebhookEvents')
      .withIndex('by_provider_event_id', (q) =>
        q.eq('providerEventId', args.providerEventId),
      )
      .unique()

    if (existing) {
      return { alreadyProcessed: existing.processedStatus === 'processed' }
    }

    const now = Date.now()
    await ctx.db.insert('paymentWebhookEvents', {
      provider: 'abacatepay',
      providerEventId: args.providerEventId,
      eventName: args.eventName,
      processedStatus: args.processedStatus,
      rawPayload: args.rawPayload,
      receivedAt: now,
      processedAt: args.processedStatus === 'processed' ? now : undefined,
    })

    return { alreadyProcessed: false }
  },
})

export const completeWebhookEvent = internalMutation({
  args: {
    providerEventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('paymentWebhookEvents')
      .withIndex('by_provider_event_id', (q) =>
        q.eq('providerEventId', args.providerEventId),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        processedStatus: 'processed',
        processedAt: Date.now(),
      })
    }

    return null
  },
})

export const failWebhookEvent = internalMutation({
  args: {
    providerEventId: v.string(),
    errorMessage: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('paymentWebhookEvents')
      .withIndex('by_provider_event_id', (q) =>
        q.eq('providerEventId', args.providerEventId),
      )
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        processedStatus: 'failed',
        processingError: args.errorMessage,
        processedAt: Date.now(),
      })
    }

    return null
  },
})

export const markPaymentPaid = internalMutation({
  args: {
    paymentId: v.id('payments'),
    providerCheckoutId: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) {
      throw new Error('Pagamento não encontrado')
    }
    if (payment.status === 'paid') {
      return null
    }

    const now = Date.now()
    await ctx.db.patch(payment._id, {
      status: 'paid',
      paidAt: now,
      updatedAt: now,
      platformFee: args.platformFee ?? payment.platformFee,
      receiptUrl: args.receiptUrl ?? payment.receiptUrl,
      providerCheckoutId: args.providerCheckoutId ?? payment.providerCheckoutId,
    })

    // Payment unlocks sharing but does NOT force the event to be public.
    // If the host left the event as 'draft', nudge it to 'unlisted' so the
    // link starts to work — they can still flip to 'public' explicitly.
    const eventDoc = await ctx.db.get(payment.eventId)
    const currentStored = eventDoc ? getStoredVisibility(eventDoc) : 'draft'
    const nextVisibility =
      currentStored === 'draft' ? 'unlisted' : currentStored
    await ctx.db.patch(payment.eventId, {
      monetizationStatus: 'paid',
      paidAt: now,
      paidByPaymentId: payment._id,
      visibility: nextVisibility,
      isPublic: nextVisibility === 'public',
    })

    if (payment.tier === 'lifetime') {
      const existing = await ctx.db
        .query('userEntitlements')
        .withIndex('by_user_and_type', (q) =>
          q.eq('userId', payment.userId).eq('type', 'lifetime'),
        )
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: 'active',
          sourcePaymentId: payment._id,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert('userEntitlements', {
          userId: payment.userId,
          type: 'lifetime',
          status: 'active',
          sourcePaymentId: payment._id,
          grantedAt: now,
          updatedAt: now,
        })
      }
    }

    return null
  },
})

export const markPaymentPaidByProvider = internalMutation({
  args: {
    providerCheckoutId: v.optional(v.string()),
    externalId: v.optional(v.string()),
    paidAmount: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
  },
  returns: paymentAnalyticsReturnValidator(),
  handler: async (ctx, args) => {
    let payment: PaymentDoc | null = null

    if (args.externalId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_external_id', (q) =>
          q.eq('externalId', args.externalId!),
        )
        .unique()
    }

    if (!payment && args.providerCheckoutId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_provider_checkout_id', (q) =>
          q.eq('providerCheckoutId', args.providerCheckoutId!),
        )
        .unique()
    }

    if (!payment) {
      return { matched: false }
    }

    if (args.paidAmount !== undefined && args.paidAmount < payment.amount) {
      throw new Error('Valor pago menor que o esperado.')
    }

    const now = Date.now()
    await ctx.db.patch(payment._id, {
      status: 'paid',
      paidAt: payment.paidAt ?? now,
      updatedAt: now,
      platformFee: args.platformFee ?? payment.platformFee,
      receiptUrl: args.receiptUrl ?? payment.receiptUrl,
      providerCheckoutId: args.providerCheckoutId ?? payment.providerCheckoutId,
    })

    // Payment unlocks sharing but does NOT force the event to be public.
    // If the host left the event as 'draft', nudge it to 'unlisted' so the
    // link starts to work — they can still flip to 'public' explicitly.
    const eventDoc = await ctx.db.get(payment.eventId)
    const currentStored = eventDoc ? getStoredVisibility(eventDoc) : 'draft'
    const nextVisibility =
      currentStored === 'draft' ? 'unlisted' : currentStored
    await ctx.db.patch(payment.eventId, {
      monetizationStatus: 'paid',
      paidAt: now,
      paidByPaymentId: payment._id,
      visibility: nextVisibility,
      isPublic: nextVisibility === 'public',
    })

    if (payment.tier === 'lifetime') {
      const existing = await ctx.db
        .query('userEntitlements')
        .withIndex('by_user_and_type', (q) =>
          q.eq('userId', payment.userId).eq('type', 'lifetime'),
        )
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          status: 'active',
          sourcePaymentId: payment._id,
          updatedAt: now,
        })
      } else {
        await ctx.db.insert('userEntitlements', {
          userId: payment.userId,
          type: 'lifetime',
          status: 'active',
          sourcePaymentId: payment._id,
          grantedAt: now,
          updatedAt: now,
        })
      }
    }

    return {
      matched: true,
      paymentId: payment._id,
      eventId: payment.eventId,
      userId: payment.userId,
      tier: payment.tier,
      category: payment.category,
      amount: payment.amount,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt ?? now,
      status: 'paid' as const,
    }
  },
})

export const markPaymentByProviderTerminal = internalMutation({
  args: {
    providerCheckoutId: v.optional(v.string()),
    externalId: v.optional(v.string()),
    status: v.union(
      v.literal('expired'),
      v.literal('refunded'),
      v.literal('disputed'),
    ),
  },
  returns: paymentAnalyticsReturnValidator(),
  handler: async (ctx, args) => {
    let payment: PaymentDoc | null = null

    if (args.externalId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_external_id', (q) =>
          q.eq('externalId', args.externalId!),
        )
        .unique()
    }

    if (!payment && args.providerCheckoutId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_provider_checkout_id', (q) =>
          q.eq('providerCheckoutId', args.providerCheckoutId!),
        )
        .unique()
    }

    if (!payment) {
      return { matched: false }
    }

    await ctx.db.patch(payment._id, {
      status: args.status,
      updatedAt: Date.now(),
    })

    const event = await ctx.db.get(payment.eventId)
    if (event?.paidByPaymentId === payment._id) {
      await ctx.db.patch(payment.eventId, {
        monetizationStatus: 'requires_payment',
        paidAt: undefined,
        paidByPaymentId: undefined,
        visibility: 'draft',
        isPublic: false,
      })
    }

    if (payment.tier === 'lifetime') {
      const entitlement = await ctx.db
        .query('userEntitlements')
        .withIndex('by_user_and_type', (q) =>
          q.eq('userId', payment.userId).eq('type', 'lifetime'),
        )
        .unique()

      if (entitlement?.sourcePaymentId === payment._id) {
        await ctx.db.patch(entitlement._id, {
          status: 'revoked',
          updatedAt: Date.now(),
        })
      }
    }

    return {
      matched: true,
      paymentId: payment._id,
      eventId: payment.eventId,
      userId: payment.userId,
      tier: payment.tier,
      category: payment.category,
      amount: payment.amount,
      createdAt: payment.createdAt,
      status: args.status,
    }
  },
})

async function createAbacatePixCheckout(
  apiKey: string,
  input: {
    amount: number
    externalId: string
    description: string
    eventId: Id<'events'>
    userId: Id<'users'>
    tier: PaymentTier
    category: PaywallCategory
  },
) {
  const apiBaseUrl = getApiBaseUrl()
  const response = await fetch(`${apiBaseUrl}/transparents/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      method: 'PIX',
      data: {
        amount: input.amount,
        expiresIn: PIX_EXPIRES_IN_SECONDS,
        description: input.description,
        externalId: input.externalId,
        metadata: {
          app: 'mywish',
          eventId: input.eventId,
          userId: input.userId,
          tier: input.tier,
          category: input.category,
        },
        utm: {
          source: 'mywish',
          medium: 'paywall',
          campaign: 'monetization',
          term: input.category,
          content: input.tier,
        },
      },
    }),
  })

  const payload = (await response
    .json()
    .catch(() => null)) as AbacateTransparentCreateResponse | null

  if (
    !response.ok ||
    !payload?.data?.id ||
    !payload.data.brCode ||
    !payload.data.brCodeBase64
  ) {
    const message =
      payload?.error ?? `Erro ao criar Pix na Abacate Pay (${response.status})`
    throw new Error(message)
  }

  return {
    providerCheckoutId: payload.data.id,
    brCode: payload.data.brCode,
    brCodeBase64: payload.data.brCodeBase64,
    expiresAt: parseOptionalDate(payload.data.expiresAt),
    platformFee: payload.data.platformFee,
  }
}

async function checkAbacatePixStatus(
  apiKey: string,
  providerCheckoutId: string,
) {
  const apiBaseUrl = getApiBaseUrl()
  const url = new URL(`${apiBaseUrl}/transparents/check`)
  url.searchParams.set('id', providerCheckoutId)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  const payload = (await response
    .json()
    .catch(() => null)) as AbacateTransparentCheckResponse | null

  if (!response.ok || !payload?.data?.status) {
    const message =
      payload?.error ??
      `Erro ao consultar Pix na Abacate Pay (${response.status})`
    throw new Error(message)
  }

  return {
    status: payload.data.status,
    expiresAt: parseOptionalDate(payload.data.expiresAt),
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Variável de ambiente ${name} não configurada.`)
  }
  return value
}

function getApiBaseUrl() {
  return process.env.ABACATEPAY_API_BASE_URL?.trim() || ABACATEPAY_API_BASE_URL
}

function getPaymentDescription(eventName: string, tier: PaymentTier) {
  const tierLabel = tier === 'lifetime' ? 'acesso vitalício' : 'lista única'
  return `MyWish - ${tierLabel} - ${eventName}`.slice(0, 140)
}

function getPrices(category: PaywallCategory) {
  if (category === 'premium') {
    return { single: 2990, lifetime: 5990 }
  }
  return { single: 990, lifetime: 2990 }
}

function getPaywallCategory(
  eventType: string | undefined,
  customEventType: string | undefined,
): PaywallCategory {
  const normalized = `${eventType ?? ''} ${customEventType ?? ''}`
    .trim()
    .toLocaleLowerCase('pt-BR')

  if (!normalized) return 'common'
  if (PREMIUM_EVENT_TYPES.has(normalized)) return 'premium'
  if (normalized.includes('casamento')) return 'premium'
  if (normalized.includes('bodas')) return 'premium'
  if (normalized.includes('noivado')) return 'premium'
  return 'common'
}

function getEventMonetizationStatus(event: {
  monetizationStatus?: 'grandfathered' | 'requires_payment' | 'paid'
}) {
  return event.monetizationStatus ?? 'grandfathered'
}

async function isEventHost(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<'events'>,
  userId: Id<'users'>,
) {
  const membership = await ctx.db
    .query('eventMembers')
    .withIndex('by_event_and_user', (q) =>
      q.eq('eventId', eventId).eq('userId', userId),
    )
    .unique()

  return membership?.role === 'host'
}

async function hasActiveLifetimeAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
) {
  const entitlement = await ctx.db
    .query('userEntitlements')
    .withIndex('by_user_and_type', (q) =>
      q.eq('userId', userId).eq('type', 'lifetime'),
    )
    .unique()

  return entitlement?.status === 'active'
}

async function getActivePendingPayment(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<'events'>,
  userId: Id<'users'>,
) {
  const payments = await ctx.db
    .query('payments')
    .withIndex('by_event_and_user', (q) =>
      q.eq('eventId', eventId).eq('userId', userId),
    )
    .order('desc')
    .collect()

  const now = Date.now()
  return (
    payments.find((payment) => {
      if (payment.status !== 'pending') return false
      if (!payment.expiresAt) return true
      return payment.expiresAt > now
    }) ?? null
  )
}

function normalizeProviderStatus(status: string): PaymentStatus {
  const normalized = status.trim().toUpperCase()
  if (normalized === 'PAID') return 'paid'
  if (normalized === 'EXPIRED') return 'expired'
  if (normalized === 'CANCELLED' || normalized === 'CANCELED')
    return 'cancelled'
  return 'pending'
}

function paymentAnalyticsReturnValidator() {
  return v.object({
    matched: v.boolean(),
    paymentId: v.optional(v.id('payments')),
    eventId: v.optional(v.id('events')),
    userId: v.optional(v.id('users')),
    tier: v.optional(v.union(v.literal('single'), v.literal('lifetime'))),
    category: v.optional(v.union(v.literal('common'), v.literal('premium'))),
    amount: v.optional(v.number()),
    createdAt: v.optional(v.number()),
    paidAt: v.optional(v.number()),
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('paid'),
        v.literal('expired'),
        v.literal('cancelled'),
        v.literal('failed'),
        v.literal('refunded'),
        v.literal('disputed'),
      ),
    ),
  })
}

function parseOptionalDate(value: string | undefined) {
  if (!value) return undefined
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : undefined
}
