import { query } from './_generated/server'
import { v } from 'convex/values'

const DEFAULT_CONFIG = {
  partnerOneName: '',
  partnerTwoName: '',
  eventName: '',
  eventDate: '',
  welcomeMessage:
    'Que bom que você está aqui! Escolha com carinho um mimo para nos presentear nessa fase tão especial.',
  thankYouMessage: 'Muito obrigado pelo carinho! ♥',
}

export const getPublicSiteConfig = query({
  args: {},
  returns: v.object({
    partnerOneName: v.string(),
    partnerTwoName: v.string(),
    eventName: v.string(),
    eventDate: v.string(),
    welcomeMessage: v.string(),
    thankYouMessage: v.string(),
  }),
  handler: async (ctx) => {
    const rows = await ctx.db.query('config').collect()
    const valueByKey: Record<string, string> = {}

    for (const row of rows) {
      valueByKey[row.key] = row.value
    }

    return {
      partnerOneName: valueByKey.partnerOneName ?? DEFAULT_CONFIG.partnerOneName,
      partnerTwoName: valueByKey.partnerTwoName ?? DEFAULT_CONFIG.partnerTwoName,
      eventName: valueByKey.eventName ?? DEFAULT_CONFIG.eventName,
      eventDate: valueByKey.eventDate ?? DEFAULT_CONFIG.eventDate,
      welcomeMessage: valueByKey.welcomeMessage ?? DEFAULT_CONFIG.welcomeMessage,
      thankYouMessage: valueByKey.thankYouMessage ?? DEFAULT_CONFIG.thankYouMessage,
    }
  },
})
