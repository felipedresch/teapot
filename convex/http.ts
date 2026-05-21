import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { handleAbacatePayWebhook } from './abacatepayWebhook'

const http = httpRouter()
auth.addHttpRoutes(http)
http.route({
  path: '/webhooks/abacatepay',
  method: 'POST',
  handler: handleAbacatePayWebhook,
})

export default http
