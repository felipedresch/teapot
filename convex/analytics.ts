import { internalAction } from './_generated/server'
import { v } from 'convex/values'

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com'

export const capturePostHogEvent = internalAction({
  args: {
    eventName: v.string(),
    distinctId: v.string(),
    properties: v.any(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const apiKey = getPostHogKey()
    if (!apiKey) {
      return null
    }

    const host = process.env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST
    const url = new URL('/capture/', host)

    await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        event: args.eventName,
        distinct_id: args.distinctId,
        properties: {
          source: 'convex',
          ...args.properties,
        },
      }),
    }).catch(() => null)

    return null
  },
})

function getPostHogKey() {
  return (
    process.env.POSTHOG_PROJECT_API_KEY?.trim() ||
    process.env.POSTHOG_API_KEY?.trim() ||
    process.env.POSTHOG_KEY?.trim() ||
    process.env.VITE_POSTHOG_KEY?.trim()
  )
}
