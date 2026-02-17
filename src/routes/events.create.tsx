import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gift, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventCreationStore } from '../store/eventCreationStore'
import { capitalizeFirst, getDisplayHostNames } from '../lib/presentation'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { cn } from '@/lib/utils'
import { Badge } from '../components/ui/badge'
import { DatePicker } from '../components/ui/date-picker'
import { DEFAULT_GIFT_CATEGORIES } from '../constants/giftCategories'

export const Route = createFileRoute('/events/create')({
  component: EventCreatePageShell,
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

const FALLBACK_EVENT_TYPES: Array<{
  value: string
  label: string
  supportsPairNames: boolean
}> = [
  { value: 'wedding', label: 'Casamento', supportsPairNames: true },
  { value: 'bridal-shower', label: 'Chá de panela', supportsPairNames: true },
  { value: 'birthday', label: 'Aniversário', supportsPairNames: false },
  { value: 'baby-shower', label: 'Chá de bebê', supportsPairNames: false },
  { value: 'housewarming', label: 'Chá de casa nova', supportsPairNames: false },
  { value: 'graduation', label: 'Formatura', supportsPairNames: false },
  { value: 'other', label: 'Outro', supportsPairNames: false },
]

function EventCreatePageShell() {
  const navigate = Route.useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const createEvent = useMutation(api.events.createEvent)
  const createGift = useMutation(api.gifts.createGift)
  const eventTypes = useQuery(api.events.listEventTypes)

  const {
    draftEvent,
    draftGifts,
    setDraftEvent,
    addDraftGift,
    removeDraftGift,
    customGiftCategories,
    addCustomGiftCategory,
    pendingPublish,
    setPendingPublish,
    resetAll,
  } = useEventCreationStore()

  const [giftName, setGiftName] = useState('')
  const [giftDescription, setGiftDescription] = useState('')
  const [giftCategory, setGiftCategory] = useState('')
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [giftReferenceUrl, setGiftReferenceUrl] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)

  const availableGiftCategories = useMemo(
    () => [...DEFAULT_GIFT_CATEGORIES, ...customGiftCategories],
    [customGiftCategories],
  )
  const eventTypeOptions = eventTypes ?? FALLBACK_EVENT_TYPES

  const eventData = useMemo(
    () => ({
      name: draftEvent?.name ?? '',
      eventType: draftEvent?.eventType ?? 'birthday',
      customEventType: draftEvent?.customEventType ?? '',
      hosts: draftEvent?.hosts?.length ? draftEvent.hosts : [''],
      createdByPartner: draftEvent?.createdByPartner ?? 'partnerOne',
      isPublic: draftEvent?.isPublic ?? true,
      date: draftEvent?.date ?? '',
      location: draftEvent?.location ?? '',
      description: draftEvent?.description ?? '',
      coverImageId: draftEvent?.coverImageId,
    }),
    [draftEvent],
  )

  useEffect(() => {
    if (!draftEvent) {
      setDraftEvent(eventData)
    }
  }, [draftEvent, eventData, setDraftEvent])

  useEffect(() => {
    const el = descriptionTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const twoLines = 2 * 1.5 * 16
    el.style.height = `${Math.max(el.scrollHeight, twoLines)}px`
  }, [eventData.description])

  const updateEvent = useCallback(
    (patch: Partial<typeof eventData>) => {
      setDraftEvent({
        ...eventData,
        ...patch,
      })
    },
    [eventData, setDraftEvent],
  )

  const selectedEventType = useMemo(
    () =>
      eventTypeOptions.find((option) => option.value === eventData.eventType) ??
      null,
    [eventData.eventType, eventTypeOptions],
  )

  const showPairFields = Boolean(selectedEventType?.supportsPairNames)
  const isPairEventType = useCallback(
    (eventType: string) =>
      Boolean(
        eventTypeOptions.find((option) => option.value === eventType)
          ?.supportsPairNames,
      ),
    [eventTypeOptions],
  )

  const normalizeHosts = useCallback((hosts: Array<string>) => {
    const normalized = hosts.map((name) => name.trim()).filter(Boolean)
    return normalized.slice(0, 5)
  }, [])
  const previewHosts = useMemo(() => {
    const normalizedHosts = normalizeHosts(eventData.hosts)
    return getDisplayHostNames(normalizedHosts)
  }, [eventData.hosts, normalizeHosts])

  const updateHost = useCallback(
    (index: number, value: string) => {
      const nextHosts = [...eventData.hosts]
      nextHosts[index] = value
      updateEvent({ hosts: nextHosts })
    },
    [eventData.hosts, updateEvent],
  )

  const addHost = useCallback(() => {
    if (eventData.hosts.length >= 5) {
      return
    }
    updateEvent({ hosts: [...eventData.hosts, ''] })
  }, [eventData.hosts, updateEvent])

  const removeHost = useCallback(
    (index: number) => {
      const nextHosts = eventData.hosts.filter((_, hostIndex) => hostIndex !== index)
      updateEvent({ hosts: nextHosts.length > 0 ? nextHosts : [''] })
    },
    [eventData.hosts, updateEvent],
  )

  const handleChangeEventType = useCallback(
    (eventType: string) => {
      const shouldUsePairFields = isPairEventType(eventType)
      const [firstHost = '', secondHost = ''] = eventData.hosts
      updateEvent({
        eventType,
        hosts: shouldUsePairFields ? [firstHost, secondHost] : eventData.hosts,
        createdByPartner: shouldUsePairFields
          ? eventData.createdByPartner
          : 'partnerOne',
      })
    },
    [eventData.createdByPartner, eventData.hosts, isPairEventType, updateEvent],
  )

  const finalizeCreation = useCallback(async () => {
    if (!draftEvent) {
      setError('Preencha os dados do evento antes de publicar.')
      return
    }

    if (!draftEvent.name.trim()) {
      setError('Nome do evento é obrigatório.')
      return
    }

    const normalizedHosts = normalizeHosts(draftEvent.hosts)
    const isPair = isPairEventType(draftEvent.eventType)
    if (isPair && normalizedHosts.length !== 2) {
      setError('Para este tipo de evento, informe exatamente 2 parceiros.')
      return
    }

    if (!isPair && normalizedHosts.length === 0) {
      setError('Informe ao menos um anfitrião.')
      return
    }

    if (draftEvent.eventType === 'other' && !draftEvent.customEventType?.trim()) {
      setError('Descreva o tipo do evento quando selecionar "Outro".')
      return
    }

    if (draftGifts.length === 0) {
      setError('Adicione ao menos um presente antes de publicar.')
      return
    }

    setIsPublishing(true)
    setError(null)
    try {
      const { eventId, slug } = await createEvent({
        name: capitalizeFirst(draftEvent.name),
        eventType: draftEvent.eventType,
        customEventType: draftEvent.customEventType?.trim() || undefined,
        hosts: normalizedHosts,
        isPublic: draftEvent.isPublic,
        createdByPartner: isPair ? draftEvent.createdByPartner : undefined,
        date: draftEvent.date?.trim() || undefined,
        location: draftEvent.location ? capitalizeFirst(draftEvent.location) : undefined,
        description: draftEvent.description
          ? capitalizeFirst(draftEvent.description)
          : undefined,
      })

      for (const draftGift of draftGifts) {
        await createGift({
          eventId,
          name: draftGift.name.trim(),
          description: draftGift.description
            ? capitalizeFirst(draftGift.description)
            : undefined,
          category: draftGift.category?.trim() || undefined,
          referenceUrl: draftGift.referenceUrl?.trim() || undefined,
        })
      }

      setPendingPublish(false)
      setCreatedSlug(slug)
      resetAll()
      await navigate({
        to: '/events/$slug',
        params: { slug },
      })
    } catch (creationError) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : 'Não foi possível publicar o evento agora.',
      )
    } finally {
      setIsPublishing(false)
    }
  }, [
    createEvent,
    createGift,
    draftEvent,
    draftGifts,
    navigate,
    resetAll,
    setPendingPublish,
    normalizeHosts,
    isPairEventType,
  ])

  useEffect(() => {
    if (!pendingPublish || isPublishing || isAuthLoading || !isAuthenticated) {
      return
    }

    void finalizeCreation()
  }, [
    finalizeCreation,
    isAuthenticated,
    isAuthLoading,
    isPublishing,
    pendingPublish,
  ])

  const handlePublishClick = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingPublish(true)
      await signIn('google')
      return
    }

    await finalizeCreation()
  }, [finalizeCreation, isAuthenticated, setPendingPublish, signIn])

  const handleAddGift = useCallback(() => {
    if (!giftName.trim()) {
      return
    }
    const normalizedCategory =
      giftCategory.trim() && giftCategory !== '__custom__'
        ? giftCategory.trim()
        : undefined

    addDraftGift({
      tempId: crypto.randomUUID(),
      name: giftName.trim(),
      description: giftDescription.trim() || undefined,
      category: normalizedCategory,
      referenceUrl: giftReferenceUrl.trim() || undefined,
    })

    setGiftName('')
    setGiftDescription('')
    setGiftCategory('')
    setCustomCategoryInput('')
    setGiftReferenceUrl('')
  }, [
    addDraftGift,
    giftCategory,
    giftDescription,
    giftName,
    giftReferenceUrl,
  ])

  const handleAddCustomCategory = useCallback(() => {
    const normalized = customCategoryInput.trim()
    if (!normalized) {
      return
    }
    addCustomGiftCategory(normalized)
    setGiftCategory(normalized)
    setCustomCategoryInput('')
  }, [addCustomGiftCategory, customCategoryInput])

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16">
      {/* ═══ HEADER ═══ */}
      <motion.div
        className="text-center mb-14 md:mb-20"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <motion.div variants={fadeUp} className="flex justify-center mb-6">
          <OrnamentDivider className="w-20 text-muted-rose/20" />
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="font-accent text-xl md:text-2xl text-muted-rose"
        >
          vamos começar
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="font-display italic text-4xl md:text-5xl text-espresso mt-2 leading-[1.05]"
        >
          Crie algo especial
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-warm-gray mt-4 max-w-md mx-auto leading-relaxed"
        >
          Preencha os dados, adicione presentes e publique quando tudo estiver
          perfeito.
        </motion.p>
      </motion.div>

      <div className="space-y-14 md:space-y-18">
        {/* ═══ CHAPTER 1: Event Details ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-accent text-lg text-muted-rose/70">01</span>
            <div className="h-px flex-1 bg-muted-rose/15" />
          </div>
          <h2 className="font-display italic text-2xl md:text-3xl text-espresso mb-1">
            Sobre o evento
          </h2>
          <p className="text-sm text-warm-gray mb-8">
            Essas informações aparecem na página pública do evento.
          </p>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do evento"
                value={eventData.name}
                onChange={(e) => updateEvent({ name: e.target.value })}
                placeholder="Ex.: Chá de Casa Nova"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                  Tipo do evento
                </label>
                <div className="relative">
                  <select
                    value={eventData.eventType}
                    onChange={(e) => handleChangeEventType(e.target.value)}
                    className="flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base text-espresso/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    {eventTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-warm-gray/60 text-xs">
                    ▼
                  </span>
                </div>
              </div>
              {eventData.eventType === 'other' && (
                <Input
                  label="Qual é o tipo do evento?"
                  value={eventData.customEventType ?? ''}
                  onChange={(e) =>
                    updateEvent({ customEventType: e.target.value })
                  }
                  placeholder="Ex.: Chá revelação, bodas, confraternização..."
                />
              )}
              <Input
                label="Local (opcional)"
                value={eventData.location ?? ''}
                onChange={(e) => updateEvent({ location: e.target.value })}
                placeholder="Cidade, bairro ou referência"
              />
              <DatePicker
                label="Data (opcional)"
                value={eventData.date ?? ''}
                onChange={(value) => updateEvent({ date: value })}
              />
            </div>

            <div className="rounded-xl border border-border/40 bg-warm-white/60 p-5">
              <p className="text-sm font-medium text-espresso/80 mb-1">
                {showPairFields ? 'Nomes dos parceiros' : 'Anfitriões'}
              </p>
              <p className="text-xs text-warm-gray/60 mb-4">
                {showPairFields
                  ? 'Para casamento e chá de panela, use os dois primeiros campos para o casal.'
                  : 'Adicione até 5 anfitriões.'}
              </p>
              <div className="space-y-3">
                {showPairFields ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Parceiro(a) 1"
                      value={eventData.hosts[0] ?? ''}
                      onChange={(e) => updateHost(0, e.target.value)}
                      placeholder="Nome da pessoa 1"
                    />
                    <Input
                      label="Parceiro(a) 2"
                      value={eventData.hosts[1] ?? ''}
                      onChange={(e) => updateHost(1, e.target.value)}
                      placeholder="Nome da pessoa 2"
                    />
                    <div className="rounded-xl p-4">
                      <p className="text-sm font-medium text-espresso/80 mb-1">
                        Qual dos parceiros é você?
                      </p>
                      <p className="text-xs text-warm-gray/60 mb-3">
                        Você pode convidar o outro parceiro depois.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant={
                            eventData.createdByPartner === 'partnerOne'
                              ? 'default'
                              : 'secondary'
                          }
                          size="sm"
                          onClick={() => updateEvent({ createdByPartner: 'partnerOne' })}
                        >
                          Eu sou: {eventData.hosts[0] || 'Parceiro(a) 1'}
                        </Button>
                        <Button
                          type="button"
                          variant={
                            eventData.createdByPartner === 'partnerTwo'
                              ? 'default'
                              : 'secondary'
                          }
                          size="sm"
                          onClick={() => updateEvent({ createdByPartner: 'partnerTwo' })}
                        >
                          Eu sou: {eventData.hosts[1] || 'Parceiro(a) 2'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {eventData.hosts.map((host, index) => (
                        <div key={`host-${index}`} className="flex gap-2 items-end">
                          <Input
                            label={`Anfitrião ${index + 1}`}
                            value={host}
                            onChange={(e) => updateHost(index, e.target.value)}
                            placeholder="Nome do anfitrião"
                            className="flex-1"
                          />
                          {eventData.hosts.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => removeHost(index)}
                              aria-label={`Remover anfitrião ${index + 1}`}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    {eventData.hosts.length < 5 && (
                      <Button type="button" variant="outline" size="sm" onClick={addHost}>
                        <Plus className="size-4" />
                        Adicionar anfitrião
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/40 bg-warm-white/60 p-5">
              <p className="text-sm font-medium text-espresso/80 mb-1">
                Visibilidade do evento
              </p>
              <p className="text-xs text-warm-gray/60 mb-4">
                Evento público aparece na busca da home. No modo "somente com link",
                seu evento fica acessível apenas para quem tiver o link.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={eventData.isPublic ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => updateEvent({ isPublic: true })}
                >
                  Público (aparece na home)
                </Button>
                <Button
                  type="button"
                  variant={!eventData.isPublic ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => updateEvent({ isPublic: false })}
                >
                  Somente com o link
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="event-description"
                className="block text-sm font-medium text-espresso/80 pl-0.5"
              >
                Descrição (opcional)
              </label>
              <textarea
                ref={descriptionTextareaRef}
                id="event-description"
                rows={2}
                value={eventData.description ?? ''}
                onChange={(e) => updateEvent({ description: e.target.value })}
                placeholder="Conte um pouco sobre esse momento"
                className={cn(
                  'flex w-full min-h-[4.5rem] resize-none rounded-xl border border-border bg-warm-white',
                  'px-4 py-3 text-base text-espresso leading-relaxed',
                  'placeholder:text-warm-gray/50',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              />
            </div>
          </div>

          {/* Live preview */}
          {previewHosts.length > 0 && (
            <motion.div
              className="mt-8 rounded-2xl border border-blush/40 bg-warm-white/60 p-6 text-center"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
            >
              <p className="text-[11px] uppercase tracking-widest text-warm-gray/50 mb-3">
                prévia
              </p>
              {previewHosts.length === 2 ? (
                <>
                  <p className="font-display italic text-2xl md:text-3xl text-espresso leading-[0.95]">
                    {previewHosts[0]}
                  </p>
                  <p className="font-accent text-xl text-muted-rose/50 my-1 inline-block -rotate-6">
                    &
                  </p>
                  <p className="font-display italic text-2xl md:text-3xl text-espresso leading-[0.95]">
                    {previewHosts[1]}
                  </p>
                </>
              ) : (
                <p className="font-display italic text-2xl md:text-3xl text-espresso leading-[1.05]">
                  {previewHosts.join(' • ')}
                </p>
              )}
              {eventData.name && (
                <p className="text-sm text-warm-gray/60 mt-3">
                  {capitalizeFirst(eventData.name)}
                </p>
              )}
            </motion.div>
          )}
        </section>

        {/* ═══ CHAPTER 2: Gifts ═══ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="font-accent text-lg text-muted-rose/70">02</span>
            <div className="h-px flex-1 bg-muted-rose/15" />
          </div>
          <h2 className="font-display italic text-2xl md:text-3xl text-espresso mb-1">
            Presentes
          </h2>
          <p className="text-sm text-warm-gray mb-8">
            Comece com uma lista inicial — você pode ajustar com calma depois.
          </p>

          {/* Add gift form */}
          <div className="rounded-2xl border border-sage/30 bg-sage/5 p-5 md:p-6 space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome do presente"
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                placeholder="Ex.: Jogo de panelas"
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                  Categoria (opcional)
                </label>
                <div className="relative">
                  <select
                    value={giftCategory}
                    onChange={(e) => setGiftCategory(e.target.value)}
                    className={cn(
                      'flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                      giftCategory ? 'text-espresso' : 'text-warm-gray/50',
                    )}
                  >
                    <option value="">Sem categoria</option>
                    {availableGiftCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="__custom__">Criar categoria...</option>
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-warm-gray/60 text-xs">
                    ▼
                  </span>
                </div>
              </div>
              {giftCategory === '__custom__' && (
                <div className="md:col-span-2 flex flex-col md:flex-row gap-2">
                  <Input
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ex.: Área gourmet"
                    label="Nova categoria"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="md:self-end"
                    onClick={handleAddCustomCategory}
                  >
                    Salvar
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                  Descrição (opcional)
                </label>
                <textarea
                  value={giftDescription}
                  onChange={(e) => setGiftDescription(e.target.value)}
                  placeholder="Detalhes que ajudam o convidado"
                  rows={2}
                  className={cn(
                    'flex w-full min-h-[4.5rem] resize-y rounded-xl border border-border bg-warm-white',
                    'px-4 py-3 text-base text-espresso',
                    'placeholder:text-warm-gray/50',
                    'transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  )}
                />
              </div>
              <Input
                label="Link de referência (opcional)"
                value={giftReferenceUrl}
                onChange={(e) => setGiftReferenceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddGift}
              disabled={!giftName.trim()}
            >
              <Plus className="size-4" />
              Adicionar presente
            </Button>
          </div>

          {/* Gift list */}
          <AnimatePresence mode="wait">
            {draftGifts.length === 0 ? (
              <motion.div
                key="empty-gifts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Gift className="size-8 text-warm-gray/15 mx-auto mb-3" />
                <p className="text-sm text-warm-gray/50">
                  Nenhum presente adicionado ainda.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="gift-list"
                className="space-y-2.5"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.04 } },
                }}
              >
                <p className="text-xs text-warm-gray/50 mb-3 pl-1">
                  {draftGifts.length}{' '}
                  {draftGifts.length === 1 ? 'presente' : 'presentes'} na lista
                </p>
                {draftGifts.map((gift) => (
                  <motion.div
                    key={gift.tempId}
                    variants={{
                      hidden: { opacity: 0, y: 8 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.3, ease },
                      },
                    }}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-warm-white/60 p-4 group hover:shadow-dreamy transition-all duration-200"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium text-espresso truncate">
                        {gift.name}
                      </p>
                      {gift.description && (
                        <p className="text-sm text-warm-gray truncate">
                          {gift.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {gift.category && (
                          <Badge variant="outline">{gift.category}</Badge>
                        )}
                        {gift.referenceUrl && (
                          <a
                            className="text-xs text-muted-rose hover:underline"
                            href={gift.referenceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Referência
                          </a>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeDraftGift(gift.tempId)}
                      aria-label="Remover presente"
                      className="opacity-50 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ═══ MESSAGES ═══ */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        {createdSlug && (
          <p className="text-sm text-espresso bg-sage/15 border border-sage/25 rounded-xl px-4 py-3">
            Evento criado! Código:{' '}
            <span className="font-medium">{createdSlug}</span>
          </p>
        )}

        {/* ═══ PUBLISH ═══ */}
        <section className="relative rounded-2xl border border-blush/40 bg-warm-white p-8 md:p-10 text-center overflow-hidden shadow-dreamy">
          <div className="absolute top-4 left-4 w-8 h-8 border-l-[1.5px] border-t-[1.5px] border-muted-rose/15 rounded-tl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-[1.5px] border-b-[1.5px] border-muted-rose/15 rounded-br-lg" />

          <p className="font-accent text-lg text-muted-rose mb-2">
            tudo pronto?
          </p>
          <h3 className="font-display italic text-2xl text-espresso mb-3">
            Publique seu evento
          </h3>
          <p className="text-sm text-warm-gray mb-6 max-w-md mx-auto">
            Após publicar, você receberá um link para compartilhar com seus
            convidados.
          </p>
          <Button
            size="lg"
            onClick={() => void handlePublishClick()}
            isLoading={isPublishing}
          >
            <Sparkles className="size-4" />
            Finalizar e publicar
          </Button>
        </section>
      </div>
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
