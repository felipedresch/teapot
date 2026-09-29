import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/sitemap-index.xml')({
  server: {
    handlers: {
      GET: () =>
        new Response(null, {
          status: 308,
          headers: { location: '/sitemap.xml' },
        }),
    },
  },
})
