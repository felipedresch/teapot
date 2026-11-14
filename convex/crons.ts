import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Sugestões de produto da Shopee, uma vez por dia (madrugada no Brasil).
// Sem SHOPEE_AFFILIATE_APP_ID/SECRET no Convex, não faz nada.
// O identificador do cron só aceita ASCII (sem acento).
crons.daily(
  'atualizar-sugestoes-shopee',
  { hourUTC: 7, minuteUTC: 0 },
  internal.productSuggestions.refreshProductSuggestions,
  {},
)

export default crons
