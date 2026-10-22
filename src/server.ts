// Entrada do Worker da Cloudflare (`main` do wrangler.jsonc): os
// redirecionamentos canônicos e, depois, o SSR do TanStack Start.
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { canonicalRedirect } from './lib/canonical'

export default createServerEntry({
  async fetch(request) {
    const redirect = canonicalRedirect(request)
    if (redirect) return redirect
    const response = await handler.fetch(request)
    // Os endereços workers.dev (produção, staging e previews) são cópia do
    // site: fora dos buscadores. Os arquivos estáticos levam o mesmo cabeçalho
    // pelo public/_headers.
    if (!new URL(request.url).hostname.endsWith('.workers.dev')) return response
    const copy = new Response(response.body, response)
    copy.headers.set('X-Robots-Tag', 'noindex')
    return copy
  },
})
