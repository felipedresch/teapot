import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Gift, ImagePlus, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventCreationStore } from '../store/eventCreationStore'
import { capitalizeFirst, getDisplayHostNames } from '../lib/presentation'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { cn } from '@/lib/utils'
import { Badge } from '../components/ui/badge'
import { DatePicker } from '../components/ui/date-picker'
import { DEFAULT_GIFT_CATEGORIES } from '../constants/giftCategories'
import { SITE_NAME, absoluteUrl } from '../lib/seo'

export const Route = createFileRoute('/events/create')({
  head: () => ({
    meta: [
      {
        title: `Criar lista de presentes | ${SITE_NAME}`,
      },
      {
        name: 'description',
        content:
          'Crie sua lista de presentes online em poucos minutos e compartilhe com convidados.',
      },
      {
        property: 'og:title',
        content: `Criar lista de presentes | ${SITE_NAME}`,
      },
      {
        property: 'og:description',
        content:
          'Monte seu evento e compartilhe sua lista de presentes com um link único.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: absoluteUrl('/events/create'),
      },
    ],
  }),
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

const MAX_IMAGE_FILE_SIZE_BYTES = 8 * 1024 * 1024
const COVER_PREVIEW_OPTIONS = {
  maxSide: 1280,
  quality: 0.82,
}
const GIFT_PREVIEW_OPTIONS = {
  maxSide: 720,
  quality: 0.8,
}
const UPLOAD_CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border cursor-pointer transition-colors shadow-sm border-muted-rose/35 bg-warm-white text-espresso hover:bg-muted-rose/16 hover:border-muted-rose/60'
const UPLOAD_DROPZONE_CLASS =
  'rounded-xl border border-dashed border-muted-rose/35 bg-warm-white/70 flex flex-col items-center justify-center text-sm text-warm-gray/75 cursor-pointer transition-colors hover:bg-muted-rose/10 hover:border-muted-rose/55'

type ConvexUploadResponse = {
  storageId: Id<'_storage'>
}

async function uploadImageToConvex(
  uploadUrl: string,
  file: File,
): Promise<Id<'_storage'>> {
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error('Falha no upload da imagem')
  }

  const result = (await response.json()) as ConvexUploadResponse
  return result.storageId
}

async function generateImagePreview(
  file: File,
  options: { maxSide: number; quality: number },
): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) {
    return undefined
  }

  const bitmap = await createImageBitmap(file)
  const maxSide = options.maxSide
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    bitmap.close()
    return undefined
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', options.quality)
}

function dataUrlToFile(dataUrl: string, fallbackFilename: string): File {
  const [meta, base64Data] = dataUrl.split(',')
  if (!meta || !base64Data || !meta.includes('base64')) {
    throw new Error('Imagem inválida. Selecione a imagem novamente.')
  }

  const mimeMatch = meta.match(/data:(.*?);base64/)
  const mimeType = mimeMatch?.[1] || 'image/jpeg'
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new File([bytes], fallbackFilename, { type: mimeType })
}

function EventCreatePageShell() {
  const navigate = Route.useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const createEvent = useMutation(api.events.createEvent)
  const createGift = useMutation(api.gifts.createGift)
  const generateEventDraftCoverUploadUrl = useMutation(
    api.events.generateEventDraftCoverUploadUrl,
  )
  const generateGiftImageUploadUrl = useMutation(
    api.gifts.generateGiftImageUploadUrl,
  )
  const eventTypes = useQuery(api.events.listEventTypes)

  const {
    draftEvent,
    draftGifts,
    isHydrated: isCreationStoreHydrated,
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
  const [giftImageUrl, setGiftImageUrl] = useState<string | undefined>()
  const [isPreparingCoverImage, setIsPreparingCoverImage] = useState(false)
  const [isPreparingGiftImage, setIsPreparingGiftImage] = useState(false)
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
      coverImageUrl: draftEvent?.coverImageUrl,
    }),
    [draftEvent],
  )

  useEffect(() => {
    if (!isCreationStoreHydrated) {
      return
    }

    if (!draftEvent) {
      setDraftEvent(eventData)
    }
  }, [draftEvent, eventData, isCreationStoreHydrated, setDraftEvent])

  useEffect(() => {
    const el = descriptionTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const twoLines = 2 * 1.5 * 16
    el.style.height = `${Math.max(el.scrollHeight, twoLines)}px`
  }, [eventData.description])

  const updateEvent = useCallback(
    (patch: Partial<typeof eventData>) => {
      setError(null)
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

  const validateImageFile = useCallback((file: File | undefined) => {
    if (!file) {
      throw new Error('Selecione um arquivo de imagem.')
    }
    if (!file.type.startsWith('image/')) {
      throw new Error('Selecione uma imagem válida (PNG, JPG, WEBP, etc.).')
    }
    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      throw new Error('A imagem deve ter no máximo 8MB.')
    }
  }, [])

  const handleSelectGiftImage = useCallback(
    async (file: File | undefined) => {
      try {
        validateImageFile(file)
        setError(null)
        setIsPreparingGiftImage(true)
        const previewUrl = await generateImagePreview(file!, GIFT_PREVIEW_OPTIONS)
        setGiftImageUrl(previewUrl)
      } catch (imageError) {
        setError(
          imageError instanceof Error
            ? imageError.message
            : 'Não foi possível preparar a imagem do presente.',
        )
      } finally {
        setIsPreparingGiftImage(false)
      }
    },
    [validateImageFile],
  )

  const handleRemoveGiftImage = useCallback(() => {
    setGiftImageUrl(undefined)
  }, [])

  const handleSelectCoverImage = useCallback(
    async (file: File | undefined) => {
      try {
        validateImageFile(file)
        setError(null)
        setIsPreparingCoverImage(true)
        const previewUrl = await generateImagePreview(file!, COVER_PREVIEW_OPTIONS)
        updateEvent({
          coverImageId: undefined,
          coverImageUrl: previewUrl,
        })
      } catch (imageError) {
        setError(
          imageError instanceof Error
            ? imageError.message
            : 'Não foi possível preparar a capa do evento.',
        )
      } finally {
        setIsPreparingCoverImage(false)
      }
    },
    [updateEvent, validateImageFile],
  )

  const handleRemoveCoverImage = useCallback(() => {
    updateEvent({
      coverImageId: undefined,
      coverImageUrl: undefined,
    })
  }, [updateEvent])

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
      let uploadedCoverImageId: Id<'_storage'> | undefined
      if (draftEvent.coverImageUrl?.startsWith('data:image/')) {
        const coverUploadUrl = await generateEventDraftCoverUploadUrl({})
        const coverImageFile = dataUrlToFile(
          draftEvent.coverImageUrl,
          `event-cover-${Date.now()}.jpg`,
        )
        uploadedCoverImageId = await uploadImageToConvex(coverUploadUrl, coverImageFile)
      }

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
        coverImageId: uploadedCoverImageId,
      })

      for (const draftGift of draftGifts) {
        let uploadedImageId: Id<'_storage'> | undefined
        if (draftGift.imageUrl?.startsWith('data:image/')) {
          const uploadUrl = await generateGiftImageUploadUrl({ eventId })
          const imageFile = dataUrlToFile(
            draftGift.imageUrl,
            `gift-${draftGift.tempId}.jpg`,
          )
          uploadedImageId = await uploadImageToConvex(uploadUrl, imageFile)
        }

        await createGift({
          eventId,
          name: draftGift.name.trim(),
          description: draftGift.description
            ? capitalizeFirst(draftGift.description)
            : undefined,
          imageId: uploadedImageId,
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
    generateEventDraftCoverUploadUrl,
    generateGiftImageUploadUrl,
  ])

  useEffect(() => {
    if (
      !isCreationStoreHydrated ||
      !pendingPublish ||
      isPublishing ||
      isAuthLoading ||
      !isAuthenticated
    ) {
      return
    }

    void finalizeCreation()
  }, [
    finalizeCreation,
    isCreationStoreHydrated,
    isAuthenticated,
    isAuthLoading,
    isPublishing,
    pendingPublish,
  ])

  const handlePublishClick = useCallback(async () => {
    if (!isAuthenticated) {
      setPendingPublish(true)
      await signIn('google', { redirectTo: '/events/create' })
      return
    }

    await finalizeCreation()
  }, [finalizeCreation, isAuthenticated, setPendingPublish, signIn])

  const handleAddGift = useCallback(() => {
    if (!giftName.trim()) {
      return
    }
    setError(null)
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
      imageUrl: giftImageUrl,
    })

    setGiftName('')
    setGiftDescription('')
    setGiftCategory('')
    setCustomCategoryInput('')
    setGiftReferenceUrl('')
    setGiftImageUrl(undefined)
  }, [
    addDraftGift,
    giftCategory,
    giftDescription,
    giftImageUrl,
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

            <div className="rounded-xl border border-dashed border-muted-rose/30 bg-blush/6 p-5 space-y-4">
              <p className="text-sm font-medium text-espresso/85">
                Imagem de capa do evento (opcional)
              </p>
              <p className="text-xs text-warm-gray/60">
                A capa aparece no topo da página para todos os convidados.
              </p>
              <p className="text-[11px] text-warm-gray/60 leading-relaxed max-w-md">
                Recomendação: JPG/WEBP em 16:9. Ideal 1920×1080 (mínimo 1280×720),
                até 8MB.
              </p>
              {eventData.coverImageUrl ? (
                <div className="rounded-xl overflow-hidden relative group">
                  <img
                    src={eventData.coverImageUrl}
                    alt="Capa do evento"
                    className="w-full max-h-[22rem] object-contain"
                    loading="lazy"
                  />
                  <label className="absolute bottom-3 right-3 inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void handleSelectCoverImage(e.target.files?.[0])}
                      disabled={isPreparingCoverImage}
                    />
                    <span
                      className={cn(
                        UPLOAD_CHIP_CLASS,
                        isPreparingCoverImage && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      <ImagePlus className="size-3.5" />
                      Trocar capa
                    </span>
                  </label>
                </div>
              ) : (
                <label className={cn(UPLOAD_DROPZONE_CLASS, 'h-36 gap-2')}>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => void handleSelectCoverImage(e.target.files?.[0])}
                    disabled={isPreparingCoverImage}
                  />
                  <ImagePlus className="size-5 text-muted-rose/70" />
                  <span>
                    {isPreparingCoverImage ? 'Preparando capa...' : 'Enviar capa'}
                  </span>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {eventData.coverImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={handleRemoveCoverImage}
                    disabled={isPreparingCoverImage}
                  >
                    <Trash2 className="size-4" />
                    Remover capa
                  </Button>
                )}
              </div>
              {isPreparingCoverImage && (
                <p className="text-xs text-warm-gray/60">Preparando capa...</p>
              )}
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
              <div className="md:col-span-2 space-y-2">
                <p className="text-sm font-medium text-espresso/80 pl-0.5">
                  Imagem do presente (opcional)
                </p>
                <p className="text-[11px] text-warm-gray/60 leading-relaxed max-w-md">
                  Recomendação: JPG/WEBP em 1:1. Ideal 1200×1200 (mínimo 600×600),
                  até 8MB.
                </p>
                {giftImageUrl ? (
                  <div className="rounded-xl overflow-hidden border border-border/30 max-w-sm bg-warm-white relative group">
                    <img
                      src={giftImageUrl}
                      alt="Prévia do presente"
                      className="w-full h-44 object-contain"
                    />
                    <label className="absolute bottom-3 right-3 inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => void handleSelectGiftImage(e.target.files?.[0])}
                        disabled={isPreparingGiftImage}
                      />
                      <span
                        className={cn(
                          UPLOAD_CHIP_CLASS,
                          isPreparingGiftImage && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        <ImagePlus className="size-3.5" />
                        Trocar imagem
                      </span>
                    </label>
                  </div>
                ) : (
                  <label className={cn(UPLOAD_DROPZONE_CLASS, 'h-28 gap-1.5')}>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void handleSelectGiftImage(e.target.files?.[0])}
                      disabled={isPreparingGiftImage}
                    />
                    <ImagePlus className="size-5 text-muted-rose/75" />
                    <span>
                      {isPreparingGiftImage ? 'Preparando imagem...' : 'Enviar imagem'}
                    </span>
                  </label>
                )}
                <div className="flex flex-wrap gap-2">
                  {giftImageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={handleRemoveGiftImage}
                      disabled={isPreparingGiftImage}
                    >
                      <Trash2 className="size-4" />
                      Remover imagem
                    </Button>
                  )}
                </div>
                {isPreparingGiftImage && (
                  <p className="text-xs text-warm-gray/60">Preparando imagem...</p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddGift}
              disabled={!giftName.trim() || isPreparingGiftImage}
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
                className="space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-xs text-warm-gray/50 mb-3 pl-1">
                  {draftGifts.length}{' '}
                  {draftGifts.length === 1 ? 'presente' : 'presentes'} na lista
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <AnimatePresence mode="popLayout">
                  {draftGifts.map((gift) => (
                    <motion.div
                      key={gift.tempId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease } }}
                      exit={{ opacity: 0, y: -10, transition: { duration: 0.25, ease } }}
                      layout
                      className="rounded-2xl border border-gift-available/20 bg-gift-available/10 p-5 transition-all duration-200 hover:shadow-dreamy flex flex-col min-h-[20rem]"
                    >
                      <div className="rounded-xl overflow-hidden border border-border/95 mb-3">
                        {gift.imageUrl ? (
                          <img
                            src={gift.imageUrl}
                            alt={`Imagem do presente ${gift.name}`}
                            className="w-full h-36 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <GiftPlaceholderIllustration category={gift.category} />
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-2 min-h-12">
                        <h4 className="font-display text-base leading-snug text-espresso">
                          {gift.name}
                        </h4>
                        <Badge variant="available" className="shrink-0">
                          Disponível
                        </Badge>
                      </div>
                      <p className="text-xs text-warm-gray/60 mt-1 min-h-4">
                        {gift.category || 'Sem categoria'}
                      </p>
                      <div className="mt-3 min-h-16">
                        {gift.description ? (
                          <p className="text-sm text-warm-gray leading-relaxed line-clamp-3">
                            {capitalizeFirst(gift.description)}
                          </p>
                        ) : (
                          <p className="text-sm text-warm-gray/45">Sem descrição</p>
                        )}
                      </div>
                      <div className="min-h-6 mt-1">
                        {gift.referenceUrl ? (
                          <a
                            className="inline-flex items-center gap-1 text-xs text-muted-rose hover:underline"
                            href={gift.referenceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Referência
                          </a>
                        ) : (
                          <span className="text-xs text-warm-gray/45">
                            Sem link de referência
                          </span>
                        )}
                      </div>
                      <div className="mt-auto h-10 flex items-center justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setError(null)
                            removeDraftGift(gift.tempId)
                          }}
                          aria-label="Remover presente"
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Remover
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
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

function GiftPlaceholderIllustration({
  category,
}: {
  category?: string | null
}) {
  const sp = {
    stroke: 'currentColor' as const,
    strokeWidth: '1.5',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  }

  const renderIllustration = () => {
    switch (category) {
      case 'Cozinha':
        return (
          <g {...sp}>
            <path d="M 28 86 L 92 86" />
            <path d="M 38 86 L 44 62 L 76 62 L 82 86 Z" />
            <path d="M 44 62 Q 60 58 76 62" />
            <path d="M 76 70 Q 93 70 93 78 Q 93 86 76 84" />
            <path d="M 51 60 Q 47 51 51 43 Q 55 35 51 27" />
            <path d="M 69 60 Q 65 51 69 43 Q 73 35 69 27" />
          </g>
        )

      case 'Quarto':
        return (
          <g {...sp}>
            <rect x="22" y="14" width="76" height="92" rx="6" />
            <path d="M 22 36 L 98 36" />
            <rect x="26" y="18" width="30" height="14" rx="5" />
            <rect x="62" y="18" width="30" height="14" rx="5" />
            <path d="M 24 58 Q 60 52 96 58" />
            <path d="M 26 74 L 94 74" strokeOpacity="0.4" />
            <path d="M 26 88 L 94 88" strokeOpacity="0.4" />
          </g>
        )

      case 'Sala':
        return (
          <g {...sp}>
            <rect x="28" y="66" width="64" height="22" rx="4" />
            <rect x="20" y="56" width="14" height="32" rx="4" />
            <rect x="86" y="56" width="14" height="32" rx="4" />
            <rect x="28" y="44" width="64" height="24" rx="4" />
            <path d="M 60 44 L 60 66" />
            <path d="M 32 88 L 30 96" />
            <path d="M 88 88 L 90 96" />
          </g>
        )

      case 'Banheiro':
        return (
          <g {...sp}>
            <path d="M 40 30 Q 28 46 28 57 Q 28 72 40 72 Q 52 72 52 57 Q 52 46 40 30" />
            <rect x="62" y="52" width="34" height="24" rx="5" />
            <path d="M 69 61 L 88 61" />
            <path d="M 69 68 L 88 68" />
            <circle cx="79" cy="44" r="5" />
            <circle cx="90" cy="38" r="3" />
          </g>
        )

      case 'Decoração':
        return (
          <g {...sp}>
            <circle cx="60" cy="60" r="4" />
            <path d="M 60 56 Q 52 40 56 28 Q 64 40 60 56" />
            <path d="M 64 62 Q 80 55 92 61 Q 82 72 64 62" />
            <path d="M 56 62 Q 40 55 28 61 Q 38 72 56 62" />
          </g>
        )

      case 'Eletro':
        return (
          <g {...sp}>
            <circle cx="60" cy="46" r="22" />
            <path d="M 50 50 Q 55 42 60 50 Q 65 58 70 50" />
            <path d="M 50 66 L 48 80 L 72 80 L 70 66" />
            <path d="M 50 72 L 70 72" />
            <path d="M 45 34 Q 41 38 40 45" />
          </g>
        )

      default:
        return (
          <g {...sp}>
            <rect x="32" y="66" width="56" height="32" rx="3" />
            <rect x="28" y="53" width="64" height="15" rx="3" />
            <path d="M 60 53 L 60 98" />
            <path d="M 60 53 Q 50 41 40 45 Q 42 57 60 53" />
            <path d="M 60 53 Q 70 41 80 45 Q 78 57 60 53" />
          </g>
        )
    }
  }

  return (
    <div className="h-36 w-full flex items-center justify-center bg-blush/5">
      <svg
        viewBox="0 0 120 120"
        className="w-24 h-24 text-muted-rose/25"
        aria-hidden="true"
      >
        {renderIllustration()}
      </svg>
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
