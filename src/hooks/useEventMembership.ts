// Hooks relacionados à membership (vínculo user ↔ evento com role host/guest)
// - Serão usados nas páginas de host e na página pública para saber se
//   o usuário já é convidado/host daquele evento específico.

import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export function useCurrentMembership(eventId: Id<'events'> | undefined) {
  const membership = useQuery(
    api.events.getMembershipForCurrentUserAndEvent,
    eventId ? { eventId } : 'skip',
  )

  const isLoading = membership === undefined

  return {
    membership,
    isLoading,
    isHost: !!membership && membership.role === 'host',
    isGuest: !!membership && membership.role === 'guest',
  }
}

