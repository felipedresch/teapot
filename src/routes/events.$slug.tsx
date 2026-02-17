import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Gift, Heart, Link2, MapPin, Settings2, Users } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventBySlug, useEventMembership } from '../hooks/useEvents'
import { useGiftMutations, useGifts } from '../hooks/useGifts'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'

// Rota pública da lista de presentes de um evento específico.
// Path esperado: /events/$slug
//
// Fluxo:
// - Host envia este link para os convidados.
// - Convidado cai diretamente na página da lista de presentes daquele evento.
// - Nesta página:
//   - carregaremos o evento via slug (useEventBySlug);
//   - carregaremos os gifts deste evento (useGifts);
//   - usuário NÃO precisa estar logado para apenas visualizar a lista;
//   - ao clicar para "escolher / reservar" um presente:
//     - se não estiver logado, será forçado a fazer login com Google;
//     - após login, utilizaremos a mutation reserveGift (que também cria
//       automaticamente membership guest no eventMembers se ainda não existir);
//     - depois do login, ele deve voltar para esta mesma página com o estado
//       preservado para concluir a reserva.

export const Route = createFileRoute('/events/$slug')({
  component: EventGiftsPageShell,
})

function EventGiftsPageShell() {
  const { slug } = Route.useParams()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const { event, isLoading: isEventLoading } = useEventBySlug(slug)
  const { gifts, isLoading: isGiftsLoading } = useGifts(event?._id)
  const { membership, isLoading: isMembershipLoading } = useEventMembership(event?._id as Id<'events'> | undefined)
  const { createGift, reserveGift, updateGift, deleteGift } = useGiftMutations()
  const updateEvent = useMutation(api.events.updateEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)

  const [reservingGiftId, setReservingGiftId] = useState<Id<'gifts'> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventDeleting, setEventDeleting] = useState(false)
  const [editingGiftId, setEditingGiftId] = useState<Id<'gifts'> | null>(null)
  const [isCreatingGift, setIsCreatingGift] = useState(false)
  const [editableEvent, setEditableEvent] = useState<{
    _id: Id<'events'>
    name: string
    partnerOneName: string
    partnerTwoName: string
    date?: string
    location?: string
    description?: string
  } | null>(null)
  const [giftForm, setGiftForm] = useState<{
    name: string
    description: string
    category: string
    referenceUrl: string
  }>({
    name: '',
    description: '',
    category: '',
    referenceUrl: '',
  })
  const [newGiftForm, setNewGiftForm] = useState<{
    name: string
    description: string
    category: string
    referenceUrl: string
  }>({
    name: '',
    description: '',
    category: '',
    referenceUrl: '',
  })

  const isHostView = useMemo(
    () => Boolean(membership && membership.role === 'host'),
    [membership],
  )

  useEffect(() => {
    if (!event || !isHostView) return
    setEditableEvent((current) => {
      if (current && current._id === event._id) return current
      return {
        _id: event._id,
        name: event.name,
        partnerOneName: event.partnerOneName,
        partnerTwoName: event.partnerTwoName,
        date: event.date ?? undefined,
        location: event.location ?? undefined,
        description: event.description ?? undefined,
      }
    })
  }, [event, isHostView])

  const navigate = Route.useNavigate()

  const reserveNow = useCallback(
    async (giftId: Id<'gifts'>) => {
      setReservingGiftId(giftId)
      setError(null)
      try {
        await reserveGift({ giftId })
      } catch (reserveError) {
        setError(
          reserveError instanceof Error
            ? reserveError.message
            : 'Não foi possível reservar este presente.',
        )
      } finally {
        setReservingGiftId(null)
      }
    },
    [reserveGift],
  )

  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) return
    const pendingGiftId = localStorage.getItem(PENDING_GIFT_KEY)
    if (!pendingGiftId) return

    localStorage.removeItem(PENDING_GIFT_KEY)
    void reserveNow(pendingGiftId as Id<'gifts'>)
  }, [isAuthenticated, isAuthLoading, reserveNow])

  const handleReserveGift = useCallback(
    async (giftId: Id<'gifts'>) => {
      if (!isAuthenticated) {
        localStorage.setItem(PENDING_GIFT_KEY, giftId)
        await signIn('google')
        return
      }

      await reserveNow(giftId)
    },
    [isAuthenticated, reserveNow, signIn],
  )

  const handleSaveEvent = useCallback(async () => {
    if (!event || !isHostView || !editableEvent) return
    setEventSaving(true)
    setError(null)
    try {
      await updateEvent({
        eventId: event._id,
        name: editableEvent.name.trim() || undefined,
        partnerOneName: editableEvent.partnerOneName.trim() || undefined,
        partnerTwoName: editableEvent.partnerTwoName.trim() || undefined,
        date: editableEvent.date?.trim() || undefined,
        location: editableEvent.location?.trim() || undefined,
        description: editableEvent.description?.trim() || undefined,
      })
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Não foi possível salvar as alterações do evento.',
      )
    } finally {
      setEventSaving(false)
    }
  }, [event, isHostView, updateEvent])

  const handleDeleteEvent = useCallback(async () => {
    if (!event || !isHostView) return
    const confirmation = window.confirm(
      'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
    )
    if (!confirmation) return

    setEventDeleting(true)
    setError(null)
    try {
      await deleteEvent({ eventId: event._id })
      await navigate({ to: '/' })
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir o evento.',
      )
      setEventDeleting(false)
    }
  }, [deleteEvent, event, isHostView, navigate])

  const startEditingGift = useCallback(
    (gift: (typeof gifts)[number]) => {
      if (!isHostView) return
      setEditingGiftId(gift._id)
      setGiftForm({
        name: gift.name,
        description: gift.description ?? '',
        category: gift.category ?? '',
        referenceUrl: gift.referenceUrl ?? '',
      })
    },
    [gifts, isHostView],
  )

  const handleCreateGift = useCallback(async () => {
    if (!event || !isHostView) return
    if (!newGiftForm.name.trim()) {
      setError('Nome do presente é obrigatório.')
      return
    }

    setIsCreatingGift(true)
    setError(null)
    try {
      await createGift({
        eventId: event._id,
        name: newGiftForm.name.trim(),
        description: newGiftForm.description.trim() || undefined,
        category: newGiftForm.category.trim() || undefined,
        referenceUrl: newGiftForm.referenceUrl.trim() || undefined,
      })
      setNewGiftForm({
        name: '',
        description: '',
        category: '',
        referenceUrl: '',
      })
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Não foi possível criar o presente.',
      )
    } finally {
      setIsCreatingGift(false)
    }
  }, [createGift, event, isHostView, newGiftForm])

  const handleSaveGift = useCallback(async () => {
    if (!editingGiftId || !isHostView) return
    setError(null)
    try {
      await updateGift({
        giftId: editingGiftId,
        name: giftForm.name.trim() || undefined,
        description: giftForm.description.trim() || undefined,
        category: giftForm.category.trim() || undefined,
        referenceUrl: giftForm.referenceUrl.trim() || undefined,
      })
      setEditingGiftId(null)
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Não foi possível salvar o presente.',
      )
    }
  }, [editingGiftId, giftForm, isHostView, updateGift])

  const handleDeleteGift = useCallback(
    async (giftId: Id<'gifts'>) => {
      if (!isHostView) return
      const confirmation = window.confirm(
        'Tem certeza que deseja excluir este presente?',
      )
      if (!confirmation) return
      setError(null)
      try {
        await deleteGift({ giftId })
      } catch (deleteError) {
        setError(
          deleteError instanceof Error
            ? deleteError.message
            : 'Não foi possível excluir o presente.',
        )
      }
    },
    [deleteGift, isHostView],
  )

  if (isEventLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-14">
        <p className="text-sm text-warm-gray">Carregando evento...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-14">
        <h1 className="font-display italic text-3xl text-espresso mb-2">
          Evento não encontrado
        </h1>
        <p className="text-warm-gray">
          Verifique o link e tente novamente.
        </p>
      </div>
    )
  }

  const headerEvent = isHostView && editableEvent ? editableEvent : event

  return (
    <div className="relative">
      <section className="relative min-h-[45vh] flex flex-col items-center justify-center px-6 py-16 overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 right-[10%] w-72 h-72 bg-blush/30 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 left-[10%] w-80 h-80 bg-sage/20 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-2xl space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-warm-gray">lista de presentes</p>
          <h1 className="font-display text-4xl md:text-5xl italic leading-[1.1] text-espresso">
            {headerEvent.partnerOneName}{' '}
            <span className="text-muted-rose">&</span>{' '}
            {headerEvent.partnerTwoName}
          </h1>
          <p className="text-lg text-muted-rose/80">{headerEvent.name}</p>
          <p className="text-xs text-warm-gray/80">Codigo do evento: {event.slug}</p>
          {headerEvent.location ? (
            <p className="text-sm text-warm-gray inline-flex items-center gap-2">
              <MapPin className="size-4" />
              {headerEvent.location}
            </p>
          ) : null}
          {headerEvent.description ? (
            <p className="text-warm-gray leading-relaxed">
              {headerEvent.description}
            </p>
          ) : null}
        </div>
      </section>

      {isHostView ? (
        <section className="px-6 pb-10 max-w-5xl mx-auto space-y-4">
          <div className="rounded-2xl border border-muted-rose/40 bg-blush/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-espresso flex items-center gap-2">
                <Settings2 className="size-4" />
                Visão do anfitrião
              </p>
              <p className="text-xs text-warm-gray">
                Só você vê esta área. Convidados veem apenas a lista de presentes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editableEvent ? (
              <>
                <Input
                  label="Nome do evento"
                  value={editableEvent.name}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            name: e.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Input
                  label="Parceiro(a) 1"
                  value={editableEvent.partnerOneName}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            partnerOneName: e.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Input
                  label="Parceiro(a) 2"
                  value={editableEvent.partnerTwoName}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            partnerTwoName: e.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Input
                  label="Local (opcional)"
                  value={editableEvent.location ?? ''}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            location: e.target.value,
                          }
                        : current,
                    )
                  }
                />
                <Input
                  label="Data (opcional)"
                  value={editableEvent.date ?? ''}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            date: e.target.value,
                          }
                        : current,
                    )
                  }
                  placeholder="AAAA-MM-DD"
                />
                <Input
                  label="Descrição (opcional)"
                  value={editableEvent.description ?? ''}
                  onChange={(e) =>
                    setEditableEvent((current) =>
                      current
                        ? {
                            ...current,
                            description: e.target.value,
                          }
                        : current,
                    )
                  }
                />
              </>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Settings2 className="size-4 text-muted-rose" />
                  Configurações do evento
                </CardTitle>
                <CardDescription>
                  Edite informações do evento e gerencie a lista de presentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => void handleSaveEvent()}
                  isLoading={eventSaving}
                >
                  Salvar informações do evento
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive"
                  onClick={() => void handleDeleteEvent()}
                  isLoading={eventDeleting}
                >
                  Excluir evento
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Users className="size-4 text-muted-rose" />
                  Links para compartilhar
                </CardTitle>
                <CardDescription>
                  Use o link certo para convidar seu parceiro e os convidados.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-espresso/80 pl-0.5">
                    Link para convidar o outro membro do casal
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`/events/${event.slug}/convite-parceiro`}
                    />
                    <Button type="button" variant="outline" size="icon-sm" disabled>
                      <Link2 className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-warm-gray">
                    Envie este link somente para o outro membro do casal. (Lógica de convite será conectada depois.)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-espresso/80 pl-0.5">
                    Link da página pública para os convidados
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={`/events/${event.slug}`} />
                    <Button type="button" variant="outline" size="icon-sm" disabled>
                      <Link2 className="size-4" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-warm-gray">
                    Este é o link que você deve mandar para os convidados escolherem presentes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      <section className="px-6 pb-20 max-w-5xl mx-auto">
        {error ? (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-6">
            {error}
          </p>
        ) : null}

        {isHostView && (
          <div className="mb-6 rounded-2xl border border-muted-rose/40 bg-blush/10 p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-espresso flex items-center gap-2">
                <Gift className="size-4 text-muted-rose" />
                Adicionar novo presente
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome do presente"
                value={newGiftForm.name}
                onChange={(e) =>
                  setNewGiftForm((current) => ({
                    ...current,
                    name: e.target.value,
                  }))
                }
                placeholder="Ex.: Jogo de panelas"
              />
              <Input
                label="Categoria (opcional)"
                value={newGiftForm.category}
                onChange={(e) =>
                  setNewGiftForm((current) => ({
                    ...current,
                    category: e.target.value,
                  }))
                }
                placeholder="Ex.: Cozinha"
              />
              <Input
                label="Descrição (opcional)"
                value={newGiftForm.description}
                onChange={(e) =>
                  setNewGiftForm((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Detalhes que ajudam o convidado"
              />
              <Input
                label="Link de referência (opcional)"
                value={newGiftForm.referenceUrl}
                onChange={(e) =>
                  setNewGiftForm((current) => ({
                    ...current,
                    referenceUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreateGift()}
                isLoading={isCreatingGift}
              >
                Adicionar presente
              </Button>
            </div>
          </div>
        )}

        {isGiftsLoading ? (
          <p className="text-sm text-warm-gray">Carregando presentes...</p>
        ) : gifts.length === 0 ? (
          <p className="text-sm text-warm-gray">Ainda não há presentes cadastrados para este evento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gifts.map((gift) => (
              <Card key={gift._id} className="p-0 overflow-hidden">
                <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-blush/40 via-warm-white to-sage/20">
                  <Gift className="size-9 text-espresso/15" />
                </div>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <h4 className="text-base leading-snug">
                        {editingGiftId === gift._id && isHostView ? (
                          <Input
                            value={giftForm.name}
                            onChange={(e) =>
                              setGiftForm((current) => ({
                                ...current,
                                name: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          gift.name
                        )}
                      </h4>
                      {gift.category ? (
                        editingGiftId === gift._id && isHostView ? (
                          <Input
                            value={giftForm.category}
                            onChange={(e) =>
                              setGiftForm((current) => ({
                                ...current,
                                category: e.target.value,
                              }))
                            }
                            placeholder="Categoria"
                          />
                        ) : (
                          <p className="text-xs text-warm-gray">Categoria: {gift.category}</p>
                        )
                      ) : null}
                    </div>
                    <Badge variant={gift.status}>{STATUS_LABELS[gift.status]}</Badge>
                  </div>
                  {editingGiftId === gift._id && isHostView ? (
                    <div className="space-y-2">
                      <Input
                        label="Descrição"
                        value={giftForm.description}
                        onChange={(e) =>
                          setGiftForm((current) => ({
                            ...current,
                            description: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Link de referência"
                        value={giftForm.referenceUrl}
                        onChange={(e) =>
                          setGiftForm((current) => ({
                            ...current,
                            referenceUrl: e.target.value,
                          }))
                        }
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingGiftId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleSaveGift()}
                        >
                          Salvar presente
                        </Button>
                      </div>
                    </div>
                  ) : gift.description ? (
                    <p className="text-sm text-warm-gray leading-relaxed">
                      {gift.description}
                    </p>
                  ) : null}

                  {gift.status === 'available' ? (
                    isHostView && !isMembershipLoading ? (
                      <p className="text-xs text-warm-gray text-center py-1">
                        Você é anfitrião deste evento. Convidados verão aqui o botão para presentear.
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        isLoading={reservingGiftId === gift._id}
                        onClick={() => void handleReserveGift(gift._id)}
                      >
                        Quero presentear
                      </Button>
                    )
                  ) : gift.status === 'reserved' ? (
                    <p className="text-xs text-muted-rose text-center py-1">
                      {isHostView && gift.reservedByName
                        ? `Reservado por ${gift.reservedByName}`
                        : 'Alguém já escolheu este mimo'}
                    </p>
                  ) : (
                    <p className="text-xs text-warm-gray text-center py-1 font-accent text-sm">
                      Recebido com carinho <Heart className="size-3 inline" />
                    </p>
                  )}

                  {isHostView && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-border/40 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingGift(gift)}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => void handleDeleteGift(gift._id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const STATUS_LABELS: Record<'available' | 'reserved' | 'received', string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  received: 'Recebido',
}

const PENDING_GIFT_KEY = 'pending-gift-reservation-id'

