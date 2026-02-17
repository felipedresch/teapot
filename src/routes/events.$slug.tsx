import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Heart,
  Link2,
  MapPin,
  Plus,
  Settings2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { Id } from '../../convex/_generated/dataModel'
import { cn } from '../lib/utils'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventBySlug, useEventMembership } from '../hooks/useEvents'
import { useGiftMutations, useGifts } from '../hooks/useGifts'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { DatePicker } from '../components/ui/date-picker'
import { DEFAULT_GIFT_CATEGORIES } from '../constants/giftCategories'

export const Route = createFileRoute('/events/$slug')({
  component: EventGiftsPageShell,
})

const ease = [0.22, 1, 0.36, 1] as const
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

function EventGiftsPageShell() {
  const { slug } = Route.useParams()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const { event, isLoading: isEventLoading } = useEventBySlug(slug)
  const { gifts, isLoading: isGiftsLoading } = useGifts(event?._id)
  const { membership, isLoading: isMembershipLoading } = useEventMembership(
    event?._id as Id<'events'> | undefined,
  )
  const { createGift, reserveGift, updateGift, deleteGift } = useGiftMutations()
  const updateEvent = useMutation(api.events.updateEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)

  const [reservingGiftId, setReservingGiftId] = useState<Id<'gifts'> | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventDeleting, setEventDeleting] = useState(false)
  const [editingGiftId, setEditingGiftId] = useState<Id<'gifts'> | null>(null)
  const [isCreatingGift, setIsCreatingGift] = useState(false)
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false)
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
  }, [event, isHostView, editableEvent, updateEvent])

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

  // ── Loading ──
  if (isEventLoading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-28 text-center">
        <div className="space-y-3">
          <div className="h-6 w-32 mx-auto rounded-lg bg-blush/20 animate-shimmer" />
          <div className="h-12 w-64 mx-auto rounded-lg bg-blush/15 animate-shimmer" />
          <div className="h-4 w-48 mx-auto rounded-lg bg-blush/10 animate-shimmer" />
        </div>
      </div>
    )
  }

  // ── Not found ──
  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-28 text-center space-y-4">
        <OrnamentDivider className="w-20 text-muted-rose/20 mx-auto" />
        <h1 className="font-display italic text-3xl text-espresso">
          Evento não encontrado
        </h1>
        <p className="text-warm-gray leading-relaxed">
          Verifique o link e tente novamente.
        </p>
        <OrnamentDivider className="w-20 text-muted-rose/20 mx-auto" />
      </div>
    )
  }

  const headerEvent = isHostView && editableEvent ? editableEvent : event

  return (
    <div>
      {/* ═══ HERO — Invitation Style ═══ */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <div className="absolute -top-20 right-[10%] w-64 h-64 bg-blush/15 rounded-full blur-[100px]" />
          <div className="absolute -bottom-16 left-[10%] w-72 h-72 bg-sage/10 rounded-full blur-[120px]" />
        </div>

        <motion.div
          className="relative max-w-2xl mx-auto text-center"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.div variants={fadeUp} className="flex justify-center mb-8">
            <OrnamentDivider className="w-28 text-muted-rose/25" />
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="font-accent text-xl md:text-2xl text-muted-rose"
          >
            lista de presentes
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 md:mt-8">
            <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
              {headerEvent.partnerOneName}
            </p>
            <p className="font-accent text-3xl md:text-4xl text-muted-rose/60 my-2 md:my-3 inline-block -rotate-6">
              &
            </p>
            <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
              {headerEvent.partnerTwoName}
            </p>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-warm-gray text-lg"
          >
            {headerEvent.name}
          </motion.p>

          {(headerEvent.location || headerEvent.date) && (
            <motion.div
              variants={fadeUp}
              className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-warm-gray/70"
            >
              {headerEvent.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {headerEvent.location}
                </span>
              )}
              {headerEvent.date && <span>{headerEvent.date}</span>}
            </motion.div>
          )}

          {headerEvent.description && (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-warm-gray leading-relaxed max-w-lg mx-auto"
            >
              {headerEvent.description}
            </motion.p>
          )}

          <motion.p
            variants={fadeUp}
            className="mt-6 text-[11px] text-warm-gray/40 tracking-widest uppercase"
          >
            {event.slug}
          </motion.p>

          <motion.div variants={fadeUp} className="flex justify-center mt-8">
            <OrnamentDivider className="w-28 text-muted-rose/25" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ HOST PANEL — Collapsible ═══ */}
      {isHostView && (
        <section className="px-6 pb-6 max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => setIsHostPanelOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-muted-rose/25 bg-blush/8 px-5 py-4 transition-all duration-200 hover:bg-blush/15 hover:border-muted-rose/35 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings2 className="size-4 text-muted-rose/70" />
              <div className="text-left">
                <p className="text-sm font-medium text-espresso">
                  Painel do anfitrião
                </p>
                <p className="text-xs text-warm-gray/70">
                  Edite o evento, gerencie presentes e compartilhe.
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn(
                'size-4 text-warm-gray transition-transform duration-300',
                isHostPanelOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence>
            {isHostPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease }}
                className="overflow-hidden"
              >
                <div className="pt-6 space-y-6">
                  {editableEvent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Nome do evento"
                        value={editableEvent.name}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, name: e.target.value } : c,
                          )
                        }
                      />
                      <Input
                        label="Parceiro(a) 1"
                        value={editableEvent.partnerOneName}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, partnerOneName: e.target.value } : c,
                          )
                        }
                      />
                      <Input
                        label="Parceiro(a) 2"
                        value={editableEvent.partnerTwoName}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, partnerTwoName: e.target.value } : c,
                          )
                        }
                      />
                      <Input
                        label="Local (opcional)"
                        value={editableEvent.location ?? ''}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, location: e.target.value } : c,
                          )
                        }
                      />
                      <DatePicker
                        label="Data (opcional)"
                        value={editableEvent.date ?? ''}
                        onChange={(value) =>
                          setEditableEvent((c) =>
                            c ? { ...c, date: value } : c,
                          )
                        }
                      />
                      <Input
                        label="Descrição (opcional)"
                        value={editableEvent.description ?? ''}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, description: e.target.value } : c,
                          )
                        }
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSaveEvent()}
                      isLoading={eventSaving}
                    >
                      Salvar alterações
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void handleDeleteEvent()}
                      isLoading={eventDeleting}
                    >
                      Excluir evento
                    </Button>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-warm-white/60 p-5 space-y-4">
                    <p className="text-sm font-medium text-espresso flex items-center gap-2">
                      <Link2 className="size-4 text-muted-rose/60" />
                      Links para compartilhar
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-warm-gray/70 mb-1.5">
                          Convite para o outro anfitrião
                        </p>
                        <Input
                          readOnly
                          value={`/events/${event.slug}/convite-parceiro`}
                        />
                        <p className="text-[11px] text-warm-gray/50 mt-1 pl-0.5">
                          Envie somente para o outro anfitrião.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-warm-gray/70 mb-1.5">
                          Página pública para convidados
                        </p>
                        <Input
                          readOnly
                          value={`/events/${event.slug}`}
                        />
                        <p className="text-[11px] text-warm-gray/50 mt-1 pl-0.5">
                          Este link é para os convidados escolherem presentes.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ═══ ERROR ═══ */}
      {error && (
        <div className="px-6 max-w-5xl mx-auto pb-4">
          <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            {error}
          </p>
        </div>
      )}

      {/* ═══ ADD GIFT (Host) ═══ */}
      {isHostView && (
        <section className="px-6 pb-8 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-sage/30 bg-sage/5 p-5 md:p-6 space-y-4">
            <p className="text-sm font-medium text-espresso flex items-center gap-2">
              <Gift className="size-4 text-sage" />
              Adicionar presente
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Nome do presente"
                value={newGiftForm.name}
                onChange={(e) =>
                  setNewGiftForm((c) => ({ ...c, name: e.target.value }))
                }
                placeholder="Ex.: Jogo de panelas"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                  Categoria (opcional)
                </label>
                <div className="relative">
                  <select
                    value={newGiftForm.category}
                    onChange={(e) =>
                      setNewGiftForm((c) => ({
                        ...c,
                        category: e.target.value,
                      }))
                    }
                    className="flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base text-espresso transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="">Sem categoria</option>
                    {DEFAULT_GIFT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-warm-gray/60 text-xs">
                    ▼
                  </span>
                </div>
              </div>
              <Input
                label="Descrição (opcional)"
                value={newGiftForm.description}
                onChange={(e) =>
                  setNewGiftForm((c) => ({
                    ...c,
                    description: e.target.value,
                  }))
                }
                placeholder="Detalhes para o convidado"
              />
              <Input
                label="Link de referência (opcional)"
                value={newGiftForm.referenceUrl}
                onChange={(e) =>
                  setNewGiftForm((c) => ({
                    ...c,
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
                <Plus className="size-3.5" />
                Adicionar
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ═══ GIFT GRID ═══ */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        {isGiftsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-blush/10 animate-shimmer"
              />
            ))}
          </div>
        ) : gifts.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="size-10 text-warm-gray/15 mx-auto mb-4" />
            <p className="text-warm-gray/50 leading-relaxed">
              Ainda não há presentes nesta lista.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {gifts.map((gift) => {
              const isEditing = editingGiftId === gift._id && isHostView
              const statusStyles = {
                available: 'bg-gift-available/10 border-gift-available/20',
                reserved: 'bg-gift-reserved/12 border-gift-reserved/20',
                received: 'bg-gift-received/12 border-gift-received/20',
              }[gift.status]

              return (
                <motion.div
                  key={gift._id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.45, ease },
                    },
                  }}
                  className={cn(
                    'rounded-2xl border p-5 transition-all duration-200 hover:shadow-dreamy',
                    statusStyles,
                  )}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        label="Nome"
                        value={giftForm.name}
                        onChange={(e) =>
                          setGiftForm((c) => ({
                            ...c,
                            name: e.target.value,
                          }))
                        }
                      />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                          Categoria
                        </label>
                        <div className="relative">
                          <select
                            value={giftForm.category}
                            onChange={(e) =>
                              setGiftForm((c) => ({
                                ...c,
                                category: e.target.value,
                              }))
                            }
                            className="flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base text-espresso transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          >
                            <option value="">Sem categoria</option>
                            {DEFAULT_GIFT_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-warm-gray/60 text-xs">
                            ▼
                          </span>
                        </div>
                      </div>
                      <Input
                        label="Descrição"
                        value={giftForm.description}
                        onChange={(e) =>
                          setGiftForm((c) => ({
                            ...c,
                            description: e.target.value,
                          }))
                        }
                      />
                      <Input
                        label="Link de referência"
                        value={giftForm.referenceUrl}
                        onChange={(e) =>
                          setGiftForm((c) => ({
                            ...c,
                            referenceUrl: e.target.value,
                          }))
                        }
                      />
                      <div className="flex gap-2 justify-end pt-1">
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
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-base leading-snug text-espresso">
                          {gift.name}
                        </h4>
                        <Badge variant={gift.status} className="shrink-0">
                          {STATUS_LABELS[gift.status]}
                        </Badge>
                      </div>

                      {gift.category && (
                        <p className="text-xs text-warm-gray/60 mt-1">
                          {gift.category}
                        </p>
                      )}

                      {gift.description && (
                        <p className="text-sm text-warm-gray leading-relaxed mt-3">
                          {gift.description}
                        </p>
                      )}

                      {gift.referenceUrl && (
                        <a
                          href={gift.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-rose hover:underline"
                        >
                          Ver referência
                          <ArrowRight className="size-3" />
                        </a>
                      )}

                      <div className="mt-4">
                        {gift.status === 'available' ? (
                          isHostView && !isMembershipLoading ? (
                            <p className="text-xs text-warm-gray/50 text-center py-1">
                              Convidados verão o botão aqui
                            </p>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              isLoading={reservingGiftId === gift._id}
                              onClick={() =>
                                void handleReserveGift(gift._id)
                              }
                            >
                              <Heart className="size-3.5" />
                              Quero presentear
                            </Button>
                          )
                        ) : gift.status === 'reserved' ? (
                          <p className="text-xs text-muted-rose/80 text-center py-1">
                            {isHostView && gift.reservedByName
                              ? `Reservado por ${gift.reservedByName}`
                              : 'Alguém já escolheu este mimo'}
                          </p>
                        ) : (
                          <p className="text-center py-1 font-accent text-sm text-warm-gray">
                            Recebido com carinho{' '}
                            <Heart className="size-3 inline" />
                          </p>
                        )}
                      </div>

                      {isHostView && (
                        <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-border/20">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditingGift(gift)}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => void handleDeleteGift(gift._id)}
                          >
                            Excluir
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </section>
    </div>
  )
}

function OrnamentDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 12 C20 4, 40 20, 60 12 C80 4, 100 20, 120 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="12" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

const STATUS_LABELS: Record<'available' | 'reserved' | 'received', string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  received: 'Recebido',
}

const PENDING_GIFT_KEY = 'pending-gift-reservation-id'
