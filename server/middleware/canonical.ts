import { defineHandler } from 'nitro/h3'

export default defineHandler((event) => {
  const url = new URL(event.req.url)
  const host = (event.req.headers.get('host') || url.host)
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
  if (
    url.pathname.length > 1 &&
    url.pathname.endsWith('/') &&
    !url.pathname.startsWith('/api/')
  ) {
    return new Response(null, {
      status: 308,
      headers: { location: url.pathname.replace(/\/+$/, '') + url.search },
    })
  }
})
