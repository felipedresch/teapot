import posthog from 'posthog-js'

type AnyProps = Record<string, unknown>

function safeCapture(eventName: string, properties?: AnyProps) {
  if (typeof window === 'undefined') return
  try {
    posthog.capture(eventName, properties)
  } catch {
    // never break the UI on a tracking failure
  }
}

export const track = {
  eventCreated(props: { eventType?: string; isPublic?: boolean }) {
    safeCapture('event_created', props)
  },
  giftAdded(props: {
    eventId: string
    eventType?: string
    totalGifts?: number
    hasImage?: boolean
  }) {
    safeCapture('gift_added', props)
  },
  giftImageUploaded(props: { eventId: string; eventType?: string }) {
    safeCapture('gift_image_uploaded', props)
  },
  shareClicked(props: {
    eventId: string
    eventType?: string
    totalGifts?: number
    isUnlocked: boolean
  }) {
    safeCapture('share_clicked', props)
  },
  paywallShown(props: {
    eventId: string
    eventType?: string
    category: 'common' | 'premium'
    totalGifts?: number
    trigger?: 'share' | 'visibility_toggle' | 'banner'
  }) {
    safeCapture('paywall_shown', props)
  },
  paywallTierViewed(props: {
    tier: 'single' | 'lifetime'
    category: 'common' | 'premium'
  }) {
    safeCapture('paywall_tier_viewed', props)
  },
  paywallTierSelected(props: {
    tier: 'single' | 'lifetime'
    category: 'common' | 'premium'
    price: number
  }) {
    safeCapture('paywall_tier_selected', props)
  },
  pixQrGenerated(props: {
    tier: 'single' | 'lifetime'
    category: 'common' | 'premium'
    price: number
    eventId: string
  }) {
    safeCapture('pix_qr_generated', props)
  },
  paymentSucceeded(props: {
    tier?: 'single' | 'lifetime'
    category?: 'common' | 'premium'
    price?: number
    eventId: string
    secondsToPay?: number
  }) {
    safeCapture('payment_succeeded', props)
  },
  paymentAbandoned(props: {
    tier?: 'single' | 'lifetime'
    category?: 'common' | 'premium'
    price?: number
    eventId: string
    lastStep?: string
  }) {
    safeCapture('payment_abandoned', props)
  },
  paywallDismissed(props: {
    eventId: string
    category: 'common' | 'premium'
    wayOut: 'talvez_depois' | 'fechou_modal'
    lastStep?: 'select' | 'pix' | 'success'
  }) {
    safeCapture('paywall_dismissed', props)
  },
  shareLinkUsed(props: { eventId: string }) {
    safeCapture('share_link_used', props)
  },
  giftReserved(props: { eventId: string; eventType?: string }) {
    safeCapture('gift_reserved', props)
  },
}
