import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  getSlopProjectSlug,
  getSlopWebhookSecret,
  purgeSlopMachineCache,
} from '../lib/slopMachine'

type RevalidatePayload = {
  projectSlug?: string
  event?: string
  slugs?: string[]
  updatedAt?: string
}

export const Route = createFileRoute('/api/slop/revalidate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get('authorization')
        const expectedSecret = getSlopWebhookSecret()

        if (!expectedSecret) {
          return json(
            { ok: false, error: 'SLOP_MACHINE_WEBHOOK_SECRET is missing' },
            { status: 500 },
          )
        }

        if (!header || header !== `Bearer ${expectedSecret}`) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const payload = (await request.json()) as RevalidatePayload

        const currentProjectSlug = getSlopProjectSlug()
        if (payload.projectSlug && payload.projectSlug !== currentProjectSlug) {
          return json({ ok: true, ignored: true, reason: 'project_slug_mismatch' })
        }

        purgeSlopMachineCache()

        return json({
          ok: true,
          received: {
            projectSlug: payload.projectSlug ?? null,
            event: payload.event ?? null,
            slugs: payload.slugs ?? [],
            updatedAt: payload.updatedAt ?? null,
          },
        })
      },
    },
  },
})
