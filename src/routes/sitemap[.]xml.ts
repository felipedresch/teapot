import { createFileRoute } from '@tanstack/react-router'
import { getBlogPosts } from '../lib/blog'
import { buildSitemap } from '../lib/sitemap'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(buildSitemap(getBlogPosts()), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=600, stale-while-revalidate=3600',
          },
        }),
    },
  },
})
