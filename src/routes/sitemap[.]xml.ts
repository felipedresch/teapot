import { createFileRoute } from '@tanstack/react-router'
import { fetchSlopMachineList } from '../lib/slopMachine'
import { buildSitemap } from '../lib/sitemap'
export const Route = createFileRoute('/sitemap.xml')({
  server: { handlers: { GET: async () => {
    try {
      return new Response(buildSitemap(await fetchSlopMachineList()), { headers: {
        'content-type':'application/xml; charset=utf-8',
        'cache-control':'public, max-age=600, stale-while-revalidate=3600',
      } })
    } catch {
      return new Response('Sitemap temporarily unavailable', {status:503,headers:{'retry-after':'300','cache-control':'no-store'}})
    }
  } } },
})
