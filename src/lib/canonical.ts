import { BLOG_REDIRECTS } from './blog'

// Redirecionamentos canônicos, antes do SSR: www para a raiz, os endereços
// antigos do sitemap, artigos do blog que foram juntados a outros e a barra
// no fim do caminho. Roda no Worker da Cloudflare
// (src/server.ts). Arquivo estático de dist/client sai direto, sem passar aqui.
export function canonicalRedirect(request: Request): Response | undefined {
  const url = new URL(request.url)
  const host = (request.headers.get('host') || url.host)
    .split(':')[0]
    .toLowerCase()
  if (host === 'www.mywish.com.br') {
    return Response.redirect(
      `https://mywish.com.br${url.pathname}${url.search}`,
      308,
    )
  }
  if (['/sitemap-index.xml', '/sitemap/xml'].includes(url.pathname)) {
    return new Response(null, {
      status: 308,
      headers: { location: '/sitemap.xml' },
    })
  }
  const blogTarget = url.pathname.startsWith('/blog/')
    ? BLOG_REDIRECTS[url.pathname.slice('/blog/'.length).replace(/\/+$/, '')]
    : undefined
  if (blogTarget) {
    return new Response(null, {
      status: 301,
      headers: { location: blogTarget },
    })
  }
  if (
    url.pathname.length > 1 &&
    url.pathname.endsWith('/') &&
    !url.pathname.startsWith('/api/')
  ) {
    return new Response(null, {
      status: 308,
      headers: {
        location:
          (url.pathname.replace(/\/+$/, '').replace(/^\/+/, '/') || '/') +
          url.search,
      },
    })
  }
  return undefined
}
