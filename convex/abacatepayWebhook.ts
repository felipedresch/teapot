import { httpAction, type ActionCtx } from './_generated/server'
import { internal } from './_generated/api'

const ABACATEPAY_PUBLIC_KEY =
  't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9'

type AbacateWebhookPayload = {
  id?: string
  event?: string
  apiVersion?: number
  devMode?: boolean
  data?: {
    transparent?: {
      id?: string
      externalId?: string
      amount?: number
      paidAmount?: number
      platformFee?: number
      status?: string
      methods?: Array<string>
      receiptUrl?: string
    }
  }
}

export const handleAbacatePayWebhook = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const url = new URL(request.url)
  const expectedSecret = process.env.ABACATEPAY_WEBHOOK_SECRET?.trim()
  const receivedSecret = url.searchParams.get('webhookSecret')?.trim()

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const rawBody = await request.text()
  const signature =
    request.headers.get('X-Webhook-Signature') ??
    request.headers.get('x-webhook-signature') ??
    request.headers.get('X-Abacate-Signature') ??
    request.headers.get('x-abacate-signature')

  if (!signature) {
    return jsonResponse({ error: 'Missing signature' }, 401)
  }

  const signatureIsValid = await verifyAbacateSignature(rawBody, signature)
  if (!signatureIsValid) {
    return jsonResponse({ error: 'Invalid signature' }, 401)
  }

  let payload: AbacateWebhookPayload
  try {
    payload = JSON.parse(rawBody) as AbacateWebhookPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const providerEventId = payload.id?.trim()
  const eventName = payload.event?.trim()
  if (!providerEventId || !eventName) {
    return jsonResponse({ error: 'Invalid webhook payload' }, 400)
  }

  const recorded = await ctx.runMutation(internal.payments.recordWebhookEvent, {
    providerEventId,
    eventName,
    processedStatus: 'processing',
    rawPayload: payload,
  })

  if (recorded.alreadyProcessed) {
    return jsonResponse({ ok: true, duplicate: true }, 200)
  }

  try {
    await processPaymentEvent(ctx, payload)
    await ctx.runMutation(internal.payments.completeWebhookEvent, {
      providerEventId,
    })
  } catch (error) {
    await ctx.runMutation(internal.payments.failWebhookEvent, {
      providerEventId,
      errorMessage:
        error instanceof Error ? error.message : 'Erro desconhecido',
    })
    throw error
  }

  return jsonResponse({ ok: true }, 200)
})

async function processPaymentEvent(
  ctx: ActionCtx,
  payload: AbacateWebhookPayload,
) {
  const transparent = payload.data?.transparent
  const providerCheckoutId = transparent?.id
  const externalId = transparent?.externalId

  if (!providerCheckoutId && !externalId) {
    return
  }

  if (payload.event === 'transparent.completed') {
    if (transparent?.status && transparent.status !== 'PAID') {
      return
    }

    const result = await ctx.runMutation(
      internal.payments.markPaymentPaidByProvider,
      {
        providerCheckoutId,
        externalId,
        paidAmount: transparent?.paidAmount ?? transparent?.amount,
        platformFee: transparent?.platformFee,
        receiptUrl: transparent?.receiptUrl,
      },
    )

    if (result.matched && result.userId && result.eventId) {
      const paidAt = result.paidAt ?? Date.now()
      await ctx.runAction(internal.analytics.capturePostHogEvent, {
        eventName: 'payment_succeeded',
        distinctId: String(result.userId),
        properties: {
          eventId: String(result.eventId),
          paymentId: result.paymentId ? String(result.paymentId) : undefined,
          tier: result.tier,
          category: result.category,
          price: result.amount ? result.amount / 100 : undefined,
          amount: result.amount,
          provider: 'abacatepay',
          providerCheckoutId,
          secondsToPay: result.createdAt
            ? Math.max(0, Math.round((paidAt - result.createdAt) / 1000))
            : undefined,
        },
      })
    }
    return
  }

  if (payload.event === 'transparent.lost') {
    const result = await ctx.runMutation(
      internal.payments.markPaymentByProviderTerminal,
      {
        providerCheckoutId,
        externalId,
        status: 'expired',
      },
    )

    if (result.matched && result.userId && result.eventId) {
      await ctx.runAction(internal.analytics.capturePostHogEvent, {
        eventName: 'payment_abandoned',
        distinctId: String(result.userId),
        properties: {
          eventId: String(result.eventId),
          paymentId: result.paymentId ? String(result.paymentId) : undefined,
          tier: result.tier,
          category: result.category,
          price: result.amount ? result.amount / 100 : undefined,
          amount: result.amount,
          provider: 'abacatepay',
          providerCheckoutId,
          lastStep: 'pix_lost',
        },
      })
    }
    return
  }

  if (payload.event === 'transparent.refunded') {
    await ctx.runMutation(internal.payments.markPaymentByProviderTerminal, {
      providerCheckoutId,
      externalId,
      status: 'refunded',
    })
    return
  }

  if (payload.event === 'transparent.disputed') {
    await ctx.runMutation(internal.payments.markPaymentByProviderTerminal, {
      providerCheckoutId,
      externalId,
      status: 'disputed',
    })
  }
}

async function verifyAbacateSignature(rawBody: string, signature: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(
      process.env.ABACATEPAY_WEBHOOK_PUBLIC_KEY?.trim() ||
        ABACATEPAY_PUBLIC_KEY,
    ),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const expected = arrayBufferToBase64(digest)
  return timingSafeEqual(expected, signature.trim())
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
