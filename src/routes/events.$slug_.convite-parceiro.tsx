import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { Heart, Loader2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { Button } from '../components/ui/button'
import { capitalizeFirst, getDisplayHostNames } from '../lib/presentation'
import { SITE_NAME } from '../lib/seo'

type InviteSearch = {
  t?: string
}

export const Route = createFileRoute('/events/$slug_/convite-parceiro')({
  head: () => ({
    meta: [
      {
        title: `Convite de anfitrião | ${SITE_NAME}`,
      },
      {
        name: 'description',
        content:
          'Aceite o convite para coorganizar este evento e gerenciar a lista de presentes juntos.',
      },
      {
        name: 'robots',
        content: 'noindex,nofollow',
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): InviteSearch => {
    const raw = search.t
    if (typeof raw === 'string' && raw.length > 0) {
      return { t: raw }
    }
    return {}
  },
  component: PartnerInviteAcceptPage,
})

function PartnerInviteAcceptPage() {
  const { slug } = Route.useParams()
  const { t: token } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()

  const preview = useQuery(
    api.eventInvites.previewInvite,
    token ? { slug, token } : 'skip',
  )
  const acceptInvite = useMutation(api.eventInvites.acceptPartnerInvite)

  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [hasAutoAccepted, setHasAutoAccepted] = useState(false)

  const returnPath = `/events/${slug}/convite-parceiro?t=${encodeURIComponent(token ?? '')}`

  const handleAccept = useCallback(async () => {
    if (!token) return
    setIsAccepting(true)
    setAcceptError(null)
    try {
      const result = await acceptInvite({ slug, token })
      await navigate({ to: '/events/$slug', params: { slug: result.eventSlug } })
    } catch (error) {
      setAcceptError(
        error instanceof Error
          ? error.message
          : 'Não foi possível aceitar o convite agora.',
      )
    } finally {
      setIsAccepting(false)
    }
  }, [acceptInvite, navigate, slug, token])

  const handleSignIn = useCallback(async () => {
    await signIn('google', { redirectTo: returnPath })
  }, [signIn, returnPath])

  useEffect(() => {
    if (
      isAuthenticated &&
      preview?.status === 'valid' &&
      !isAccepting &&
      !hasAutoAccepted &&
      !acceptError
    ) {
      setHasAutoAccepted(true)
      void handleAccept()
    }
  }, [
    acceptError,
    handleAccept,
    hasAutoAccepted,
    isAccepting,
    isAuthenticated,
    preview?.status,
  ])

  useEffect(() => {
    if (preview?.status === 'already-host') {
      void navigate({ to: '/events/$slug', params: { slug } })
    }
  }, [navigate, preview?.status, slug])

  if (!token) {
    return (
      <InviteShell title="Convite inválido">
        <p className="text-warm-gray/80 text-center">
          Esse link de convite está incompleto. Peça ao outro anfitrião um novo
          link.
        </p>
        <BackToEventLink slug={slug} />
      </InviteShell>
    )
  }

  if (preview === undefined || isAuthLoading) {
    return (
      <InviteShell title="Carregando convite...">
        <div className="flex justify-center py-2">
          <Loader2 className="size-6 animate-spin text-muted-rose" />
        </div>
      </InviteShell>
    )
  }

  if (preview === null || preview.status === 'event-not-found') {
    return (
      <InviteShell title="Evento não encontrado">
        <p className="text-warm-gray/80 text-center">
          Não conseguimos localizar este evento. Verifique o link com o
          anfitrião.
        </p>
      </InviteShell>
    )
  }

  if (preview.status === 'invalid') {
    return (
      <InviteShell title="Convite inválido">
        <p className="text-warm-gray/80 text-center">
          Este link de convite não é válido. Peça um novo link ao anfitrião.
        </p>
        <BackToEventLink slug={slug} />
      </InviteShell>
    )
  }

  if (preview.status === 'revoked') {
    return (
      <InviteShell title="Convite revogado">
        <p className="text-warm-gray/80 text-center">
          O anfitrião revogou este convite. Peça um novo link.
        </p>
        <BackToEventLink slug={slug} />
      </InviteShell>
    )
  }

  if (preview.status === 'used') {
    return (
      <InviteShell title="Convite já utilizado">
        <p className="text-warm-gray/80 text-center">
          Este convite já foi aceito. Se você era o destinatário, basta entrar
          com a mesma conta para acessar o evento.
        </p>
        <BackToEventLink slug={slug} />
      </InviteShell>
    )
  }

  const eventName = preview.eventName
    ? capitalizeFirst(preview.eventName)
    : 'este evento'
  const hosts = getDisplayHostNames(preview.hosts ?? [])

  return (
    <InviteShell title="Convite para coanfitrião">
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-rose/80">
          Você foi convidado(a) para
        </p>
        <h2 className="font-display italic text-2xl text-espresso">
          {eventName}
        </h2>
        {hosts.length > 0 && (
          <p className="text-warm-gray/80 text-sm">
            Anfitriões: {hosts.join(' & ')}
          </p>
        )}
      </div>

      <p className="text-warm-gray/80 text-center text-sm leading-relaxed">
        Ao aceitar, você poderá editar o evento, adicionar presentes e
        gerenciar a lista junto com o outro anfitrião.
      </p>

      {acceptError && (
        <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3 text-center">
          {acceptError}
        </p>
      )}

      {!isAuthenticated ? (
        <Button
          type="button"
          size="lg"
          onClick={() => void handleSignIn()}
          className="w-full"
        >
          Entrar com Google para aceitar
        </Button>
      ) : (
        <Button
          type="button"
          size="lg"
          onClick={() => {
            setHasAutoAccepted(true)
            void handleAccept()
          }}
          isLoading={isAccepting}
          className="w-full"
        >
          Aceitar convite
        </Button>
      )}
      <BackToEventLink slug={slug} subtle />
    </InviteShell>
  )
}

function InviteShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-muted-rose/25 bg-warm-white/95 shadow-dreamy p-8 space-y-5">
        <div className="flex flex-col items-center gap-3">
          <span className="inline-flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-blush via-blush/70 to-muted-rose/40 ring-1 ring-warm-white/70 shadow-sm">
            <Heart className="size-5 text-espresso/80" strokeWidth={1.6} />
          </span>
          <h1 className="font-display italic text-2xl text-espresso text-center">
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  )
}

function BackToEventLink({
  slug,
  subtle = false,
}: {
  slug: string
  subtle?: boolean
}) {
  return (
    <div className="text-center">
      <Link
        to="/events/$slug"
        params={{ slug }}
        className={
          subtle
            ? 'text-xs text-warm-gray/60 hover:text-espresso underline-offset-4 hover:underline'
            : 'text-sm text-muted-rose hover:text-espresso underline-offset-4 hover:underline'
        }
      >
        Ver página do evento
      </Link>
    </div>
  )
}
