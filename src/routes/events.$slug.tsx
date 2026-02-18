import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Heart,
  ImagePlus,
  Link2,
  MapPin,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { Id } from '../../convex/_generated/dataModel'
import { cn } from '../lib/utils'
import {
  capitalizeFirst,
  formatDatePtBrFromIso,
  getDisplayHostNames,
} from '../lib/presentation'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventBySlug, useEventMembership } from '../hooks/useEvents'
import { useGiftMutations, useGifts } from '../hooks/useGifts'
import { api } from '../../convex/_generated/api'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { DatePicker } from '../components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../components/ui/dialog'
import { DEFAULT_GIFT_CATEGORIES } from '../constants/giftCategories'

export const Route = createFileRoute('/events/$slug')({
  component: EventGiftsPageShell,
})

const ease = [0.22, 1, 0.36, 1] as const
const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: 'Casamento',
  'bridal-shower': 'Chá de panela',
  birthday: 'Aniversário',
  'baby-shower': 'Chá de bebê',
  housewarming: 'Chá de casa nova',
  graduation: 'Formatura',
  other: 'Outro',
}
const EVENT_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'wedding', label: 'Casamento' },
  { value: 'bridal-shower', label: 'Chá de panela' },
  { value: 'birthday', label: 'Aniversário' },
  { value: 'baby-shower', label: 'Chá de bebê' },
  { value: 'housewarming', label: 'Chá de casa nova' },
  { value: 'graduation', label: 'Formatura' },
  { value: 'other', label: 'Outro' },
]
const PAIR_EVENT_TYPES = new Set(['wedding', 'bridal-shower'])
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease },
  },
}

const MAX_IMAGE_FILE_SIZE_BYTES = 8 * 1024 * 1024
const COVER_PREVIEW_OPTIONS = {
  maxSide: 1280,
  quality: 0.82,
}
const GIFT_PREVIEW_OPTIONS = {
  maxSide: 720,
  quality: 0.8,
}

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

function EventGiftsPageShell() {
  const { slug } = Route.useParams()
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useCurrentUser()
  const { event, isLoading: isEventLoading } = useEventBySlug(slug)
  const { gifts, isLoading: isGiftsLoading } = useGifts(event?._id)
  const { membership, isLoading: isMembershipLoading } = useEventMembership(
    event?._id as Id<'events'> | undefined,
  )
  const { createGift, reserveGift, updateGift, deleteGift } = useGiftMutations()
  const updateEvent = useMutation(api.events.updateEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)
  const generateGiftImageUploadUrl = useMutation(api.gifts.generateGiftImageUploadUrl)
  const generateEventCoverUploadUrl = useMutation(
    api.events.generateEventCoverUploadUrl,
  )
  const updateEventCoverImage = useMutation(api.events.updateEventCoverImage)

  const [reservingGiftId, setReservingGiftId] = useState<Id<'gifts'> | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [showReserveLoginPrompt, setShowReserveLoginPrompt] = useState(false)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventDeleting, setEventDeleting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | undefined>()
  const [editingGiftId, setEditingGiftId] = useState<Id<'gifts'> | null>(null)
  const [isCreatingGift, setIsCreatingGift] = useState(false)
  const [isUploadingGiftImage, setIsUploadingGiftImage] = useState(false)
  const [isUploadingEditedGiftImage, setIsUploadingEditedGiftImage] = useState(false)
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false)
  const [deleteGiftConfirm, setDeleteGiftConfirm] = useState<{
    giftId: Id<'gifts'>
    giftName: string
  } | null>(null)
  const [isDeletingGift, setIsDeletingGift] = useState(false)
  const [shareLinkTab, setShareLinkTab] = useState<'guest' | 'partner'>('guest')
  const [expandDescriptions, setExpandDescriptions] = useState(false)
  const [editableEvent, setEditableEvent] = useState<{
    _id: Id<'events'>
    name: string
    eventType: string
    customEventType?: string
    hosts: Array<string>
    createdByPartner: 'partnerOne' | 'partnerTwo'
    isPublic: boolean
    date?: string
    location?: string
    description?: string
  } | null>(null)
  const [giftForm, setGiftForm] = useState<{
    name: string
    description: string
    imageId?: Id<'_storage'> | null
    imageUrl?: string
    category: string
    referenceUrl: string
  }>({
    name: '',
    description: '',
    imageId: undefined,
    imageUrl: undefined,
    category: '',
    referenceUrl: '',
  })
  const [newGiftForm, setNewGiftForm] = useState<{
    name: string
    description: string
    imageId?: Id<'_storage'>
    imageUrl?: string
    category: string
    referenceUrl: string
  }>({
    name: '',
    description: '',
    imageId: undefined,
    imageUrl: undefined,
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
        eventType: event.eventType,
        customEventType: event.customEventType ?? '',
        hosts: event.hosts,
        createdByPartner: event.createdByPartner,
        isPublic: event.isPublic,
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

  const handleReserveGift = useCallback(
    async (giftId: Id<'gifts'>) => {
      if (!isAuthenticated) {
        setError(null)
        setShowReserveLoginPrompt(true)
        return
      }

      setShowReserveLoginPrompt(false)
      await reserveNow(giftId)
    },
    [isAuthenticated, reserveNow],
  )

  const handleSignInToReserve = useCallback(async () => {
    await signIn('google', { redirectTo: `/events/${slug}` })
  }, [signIn, slug])

  useEffect(() => {
    if (isAuthenticated) {
      setShowReserveLoginPrompt(false)
    }
  }, [isAuthenticated])

  const isPairEventType = useCallback((eventType: string) => {
    return PAIR_EVENT_TYPES.has(eventType)
  }, [])

  const updateEditableHost = useCallback((index: number, value: string) => {
    setEditableEvent((current) => {
      if (!current) return current
      const nextHosts = [...current.hosts]
      nextHosts[index] = value
      return { ...current, hosts: nextHosts }
    })
  }, [])

  const addEditableHost = useCallback(() => {
    setEditableEvent((current) => {
      if (!current || current.hosts.length >= 5) return current
      return { ...current, hosts: [...current.hosts, ''] }
    })
  }, [])

  const removeEditableHost = useCallback((index: number) => {
    setEditableEvent((current) => {
      if (!current) return current
      const nextHosts = current.hosts.filter((_, hostIndex) => hostIndex !== index)
      return { ...current, hosts: nextHosts.length > 0 ? nextHosts : [''] }
    })
  }, [])

  const handleChangeEditableEventType = useCallback(
    (eventType: string) => {
      setEditableEvent((current) => {
        if (!current) return current
        const shouldUsePairFields = isPairEventType(eventType)
        const [firstHost = '', secondHost = ''] = current.hosts
        return {
          ...current,
          eventType,
          hosts: shouldUsePairFields ? [firstHost, secondHost] : current.hosts,
          createdByPartner: shouldUsePairFields
            ? current.createdByPartner
            : 'partnerOne',
        }
      })
    },
    [isPairEventType],
  )

  const handleSaveEvent = useCallback(async () => {
    if (!event || !isHostView || !editableEvent) return
    const normalizedHosts = editableEvent.hosts.map((host) => host.trim()).filter(Boolean)
    const isPair = isPairEventType(editableEvent.eventType)
    if (isPair && normalizedHosts.length !== 2) {
      setError('Para este tipo de evento, informe exatamente 2 parceiros.')
      return
    }
    if (!isPair && normalizedHosts.length === 0) {
      setError('Informe ao menos um anfitrião.')
      return
    }
    const nextName = editableEvent.name ? capitalizeFirst(editableEvent.name) : event.name
    const nextCustomEventType = editableEvent.customEventType?.trim() || undefined
    const nextDate = editableEvent.date?.trim() || undefined
    const nextLocation = editableEvent.location
      ? capitalizeFirst(editableEvent.location)
      : undefined
    const nextDescription = editableEvent.description
      ? capitalizeFirst(editableEvent.description)
      : undefined
    setEventSaving(true)
    setError(null)
    try {
      await updateEvent({
        eventId: event._id,
        name: nextName,
        eventType: editableEvent.eventType,
        customEventType: nextCustomEventType,
        hosts: normalizedHosts,
        createdByPartner: isPair ? editableEvent.createdByPartner : undefined,
        isPublic: editableEvent.isPublic,
        date: nextDate,
        location: nextLocation,
        description: nextDescription,
      })
      setEditableEvent((current) => {
        if (!current) return current
        return {
          ...current,
          name: nextName,
          customEventType: nextCustomEventType,
          hosts: normalizedHosts,
          date: nextDate,
          location: nextLocation,
          description: nextDescription,
        }
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
  }, [event, isHostView, editableEvent, updateEvent, isPairEventType])

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

  const handleUploadCoverImage = useCallback(
    async (file: File | undefined) => {
      if (!event || !isHostView) return
      try {
        validateImageFile(file)
        setIsUploadingCover(true)
        setError(null)

        const [previewUrl, uploadUrl] = await Promise.all([
          generateImagePreview(file!, COVER_PREVIEW_OPTIONS),
          generateEventCoverUploadUrl({ eventId: event._id }),
        ])

        setCoverPreviewUrl(previewUrl)

        const storageId = await uploadImageToConvex(uploadUrl, file!)
        await updateEventCoverImage({
          eventId: event._id,
          coverImageId: storageId,
        })

        setCoverPreviewUrl(undefined)
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'Não foi possível enviar a capa.',
        )
        setCoverPreviewUrl(undefined)
      } finally {
        setIsUploadingCover(false)
      }
    },
    [
      event,
      generateEventCoverUploadUrl,
      isHostView,
      updateEventCoverImage,
      validateImageFile,
    ],
  )

  const handleRemoveCoverImage = useCallback(async () => {
    if (!event || !isHostView) return
    setError(null)
    setIsUploadingCover(true)
    try {
      await updateEventCoverImage({
        eventId: event._id,
        coverImageId: null,
      })
      setCoverPreviewUrl(undefined)
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : 'Não foi possível remover a capa.',
      )
    } finally {
      setIsUploadingCover(false)
    }
  }, [event, isHostView, updateEventCoverImage])

  const handleUploadGiftImage = useCallback(
    async (
      file: File | undefined,
      mode: 'create' | 'edit',
    ) => {
      if (!event || !isHostView || !file) return

      try {
        validateImageFile(file)
        setError(null)
        if (mode === 'create') {
          setIsUploadingGiftImage(true)
        } else {
          setIsUploadingEditedGiftImage(true)
        }

        const [previewUrl, uploadUrl] = await Promise.all([
          generateImagePreview(file!, GIFT_PREVIEW_OPTIONS),
          generateGiftImageUploadUrl({ eventId: event._id }),
        ])
        const storageId = await uploadImageToConvex(uploadUrl, file!)

        if (mode === 'create') {
          setNewGiftForm((current) => ({
            ...current,
            imageId: storageId,
            imageUrl: previewUrl,
          }))
          return
        }

        setGiftForm((current) => ({
          ...current,
          imageId: storageId,
          imageUrl: previewUrl,
        }))
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'Não foi possível enviar a imagem do presente.',
        )
      } finally {
        if (mode === 'create') {
          setIsUploadingGiftImage(false)
        } else {
          setIsUploadingEditedGiftImage(false)
        }
      }
    },
    [event, generateGiftImageUploadUrl, isHostView, validateImageFile],
  )

  const handleRemoveDraftGiftImage = useCallback(() => {
    setNewGiftForm((current) => ({
      ...current,
      imageId: undefined,
      imageUrl: undefined,
    }))
  }, [])

  const handleRemoveEditingGiftImage = useCallback(() => {
    setGiftForm((current) => ({
      ...current,
      imageId: null,
      imageUrl: undefined,
    }))
  }, [])

  const startEditingGift = useCallback(
    (gift: (typeof gifts)[number]) => {
      if (!isHostView) return
      setEditingGiftId(gift._id)
      setGiftForm({
        name: gift.name,
        description: gift.description ?? '',
        imageId: gift.imageId,
        imageUrl: gift.imageUrl,
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
        description: newGiftForm.description
          ? capitalizeFirst(newGiftForm.description)
          : undefined,
        imageId: newGiftForm.imageId,
        imageUrl: newGiftForm.imageUrl,
        category: newGiftForm.category.trim() || undefined,
        referenceUrl: newGiftForm.referenceUrl.trim() || undefined,
      })
      setNewGiftForm({
        name: '',
        description: '',
        imageId: undefined,
        imageUrl: undefined,
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
        description: giftForm.description
          ? capitalizeFirst(giftForm.description)
          : undefined,
        imageId: giftForm.imageId,
        imageUrl: giftForm.imageUrl,
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
    (giftId: Id<'gifts'>, giftName: string) => {
      if (!isHostView) return
      setDeleteGiftConfirm({ giftId, giftName })
    },
    [isHostView],
  )

  const handleConfirmDeleteGift = useCallback(async () => {
    if (!deleteGiftConfirm) return
    setIsDeletingGift(true)
    setError(null)
    try {
      await deleteGift({ giftId: deleteGiftConfirm.giftId })
      setDeleteGiftConfirm(null)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Não foi possível excluir o presente.',
      )
    } finally {
      setIsDeletingGift(false)
    }
  }, [deleteGift, deleteGiftConfirm])

  // ── Loading ──
  if (isEventLoading) {
    return (
      <div className="px-6 py-14 md:py-20">
        <div className="max-w-5xl mx-auto space-y-10 md:space-y-12">
          <div className="max-w-2xl mx-auto text-center space-y-5">
            <div className="h-5 w-40 mx-auto rounded-lg bg-blush/30 animate-pulse" />
            <div className="h-14 w-72 mx-auto rounded-xl bg-blush/25 animate-pulse" />
            <div className="h-4 w-52 mx-auto rounded-lg bg-blush/25 animate-pulse" />
            <div className="h-4 w-64 mx-auto rounded-lg bg-blush/25 animate-pulse" />
          </div>

          <div className="rounded-2xl border border-border/50 bg-warm-white/80 p-6 md:p-8 space-y-4">
            <div className="h-5 w-48 rounded-lg bg-blush/25 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-12 rounded-xl bg-blush/25 animate-pulse"
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 rounded-2xl border border-border/50 bg-warm-white/80 p-5 space-y-3"
              >
                <div className="h-4 w-2/3 rounded bg-blush/25 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-blush/22 animate-pulse" />
                <div className="h-3 w-full rounded bg-blush/22 animate-pulse" />
                <div className="h-3 w-5/6 rounded bg-blush/22 animate-pulse" />
                <div className="h-9 w-full rounded-xl bg-blush/25 animate-pulse" />
              </div>
            ))}
          </div>
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
  const headerHosts = getDisplayHostNames(
    headerEvent.hosts.length > 0 ? headerEvent.hosts : ['Anfitriões'],
  )
  const normalizedHeaderHosts = headerEvent.hosts
    .map((host) => host.trim())
    .filter(Boolean)
  const shouldUsePairLayout =
    PAIR_EVENT_TYPES.has(headerEvent.eventType) && headerHosts.length === 2
  const canSharePartnerInvite =
    PAIR_EVENT_TYPES.has(headerEvent.eventType) &&
    normalizedHeaderHosts.length === 2
  const eventTypeLabel =
    headerEvent.customEventType ||
    EVENT_TYPE_LABELS[headerEvent.eventType] ||
    'Evento'
  const hasLongDescriptions = gifts.some(
    (gift) => (gift.description?.trim().length ?? 0) > 140,
  )
  const cardSizeClass = expandDescriptions ? 'min-h-[24rem]' : 'min-h-[20rem]'
  const coverImageUrl = coverPreviewUrl ?? event.coverImageUrl

  return (
    <div>
      {/* ═══ HERO — Invitation Style ═══ */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden">
        {coverImageUrl && (
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src={coverImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-25"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-warm-white/75 backdrop-blur-[1px]" />
          </div>
        )}
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
            {eventTypeLabel}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 md:mt-8">
            {shouldUsePairLayout ? (
              <>
                <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
                  {headerHosts[0]}
                </p>
                <p className="font-accent text-3xl md:text-4xl text-muted-rose/60 my-2 md:my-3 inline-block -rotate-6">
                  &
                </p>
                <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.9]">
                  {headerHosts[1]}
                </p>
              </>
            ) : (
              <p className="font-display italic text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-espresso leading-[0.95]">
                {headerHosts.join(' • ')}
              </p>
            )}
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-warm-gray text-lg"
          >
            {capitalizeFirst(headerEvent.name)}
          </motion.p>

          {(headerEvent.location || headerEvent.date) && (
            <motion.div
              variants={fadeUp}
              className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-warm-gray/70"
            >
              {headerEvent.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {capitalizeFirst(headerEvent.location)}
                </span>
              )}
              {headerEvent.date && (
                <span>{formatDatePtBrFromIso(headerEvent.date)}</span>
              )}
            </motion.div>
          )}

          {headerEvent.description && (
            <motion.p
              variants={fadeUp}
              className="mt-4 text-warm-gray leading-relaxed max-w-lg mx-auto"
            >
              {capitalizeFirst(headerEvent.description)}
            </motion.p>
          )}

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
                <div className="pt-8 space-y-8">
                  {editableEvent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                      <Input
                        label="Nome do evento"
                        value={editableEvent.name}
                        onChange={(e) =>
                          setEditableEvent((c) =>
                            c ? { ...c, name: e.target.value } : c,
                          )
                        }
                      />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                          Tipo do evento
                        </label>
                        <div className="relative">
                          <select
                            value={editableEvent.eventType}
                            onChange={(e) =>
                              handleChangeEditableEventType(e.target.value)
                            }
                            className="flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base text-espresso/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          >
                            {EVENT_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-warm-gray/60 text-xs">
                            ▼
                          </span>
                        </div>
                      </div>
                      {editableEvent.eventType === 'other' && (
                        <Input
                          label="Qual é o tipo do evento?"
                          value={editableEvent.customEventType ?? ''}
                          onChange={(e) =>
                            setEditableEvent((c) =>
                              c
                                ? {
                                    ...c,
                                    customEventType: e.target.value,
                                  }
                                : c,
                            )
                          }
                        />
                      )}
                      <div className="md:col-span-2 rounded-xl border border-border/35 bg-warm-white p-4 md:p-5 space-y-4">
                        <div>
                          <p className="text-sm font-medium text-espresso/85">
                            {PAIR_EVENT_TYPES.has(editableEvent.eventType)
                              ? 'Anfitriões do casal'
                              : 'Anfitriões'}
                          </p>
                          <p className="text-xs text-warm-gray/60 mt-1">
                            {PAIR_EVENT_TYPES.has(editableEvent.eventType)
                              ? 'Defina os nomes do casal e quem está gerenciando o evento.'
                              : 'Adicione até 5 anfitriões para este evento.'}
                          </p>
                        </div>
                        {PAIR_EVENT_TYPES.has(editableEvent.eventType) ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input
                                label="Parceiro(a) 1"
                                value={editableEvent.hosts[0] ?? ''}
                                onChange={(e) => updateEditableHost(0, e.target.value)}
                                placeholder="Nome da pessoa 1"
                              />
                              <Input
                                label="Parceiro(a) 2"
                                value={editableEvent.hosts[1] ?? ''}
                                onChange={(e) => updateEditableHost(1, e.target.value)}
                                placeholder="Nome da pessoa 2"
                              />
                            </div>
                            <div className="rounded-xl border border-border/25 bg-warm-white p-4">
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
                                    editableEvent.createdByPartner === 'partnerOne'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setEditableEvent((current) =>
                                      current
                                        ? { ...current, createdByPartner: 'partnerOne' }
                                        : current,
                                    )
                                  }
                                >
                                  Eu sou: {editableEvent.hosts[0] || 'Parceiro(a) 1'}
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    editableEvent.createdByPartner === 'partnerTwo'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setEditableEvent((current) =>
                                      current
                                        ? { ...current, createdByPartner: 'partnerTwo' }
                                        : current,
                                    )
                                  }
                                >
                                  Eu sou: {editableEvent.hosts[1] || 'Parceiro(a) 2'}
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              {editableEvent.hosts.map((host, index) => (
                                <div
                                  key={`edit-host-${index}`}
                                  className="flex gap-2 items-end"
                                >
                                  <Input
                                    label={`Anfitrião ${index + 1}`}
                                    value={host}
                                    onChange={(e) => updateEditableHost(index, e.target.value)}
                                    placeholder="Nome do anfitrião"
                                    className="flex-1"
                                  />
                                  {editableEvent.hosts.length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => removeEditableHost(index)}
                                      aria-label={`Remover anfitrião ${index + 1}`}
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            {editableEvent.hosts.length < 5 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addEditableHost}
                                className="mt-1"
                              >
                                <Plus className="size-4" />
                                Adicionar anfitrião
                              </Button>
                            )}
                          </>
                        )}
                      </div>
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
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                          Descrição (opcional)
                        </label>
                        <textarea
                          value={editableEvent.description ?? ''}
                          onChange={(e) =>
                            setEditableEvent((c) =>
                              c ? { ...c, description: e.target.value } : c,
                            )
                          }
                          rows={2}
                          className="flex w-full min-h-[4.5rem] resize-y rounded-xl border border-border bg-warm-white px-4 py-3 text-base text-espresso placeholder:text-warm-gray/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                          Visibilidade
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={editableEvent.isPublic ? 'default' : 'secondary'}
                            onClick={() =>
                              setEditableEvent((c) =>
                                c ? { ...c, isPublic: true } : c,
                              )
                            }
                          >
                            Público
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={!editableEvent.isPublic ? 'default' : 'secondary'}
                            onClick={() =>
                              setEditableEvent((c) =>
                                c ? { ...c, isPublic: false } : c,
                              )
                            }
                          >
                            Somente com link
                          </Button>
                        </div>
                        <p className="text-[11px] text-warm-gray/60 pl-0.5">
                          Eventos não públicos ficam ocultos da busca da home.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-border/40 bg-warm-white p-5 space-y-4">
                    <p className="text-sm font-medium text-espresso/85">
                      Imagem de capa do evento
                    </p>
                    <p className="text-xs text-warm-gray/60">
                      A capa aparece no topo da página para todos os convidados.
                    </p>
                    <p className="text-[11px] text-warm-gray/60 leading-relaxed">
                      Recomendação: JPG/WEBP em 16:9. Ideal 1920×1080 (mínimo
                      1280×720), até 8MB.
                    </p>
                    {coverImageUrl ? (
                      <div className="rounded-xl overflow-hidden border border-border/30 bg-warm-white">
                        <img
                          src={coverImageUrl}
                          alt="Capa do evento"
                          className="w-full max-h-[22rem] object-contain"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/50 h-36 flex items-center justify-center text-sm text-warm-gray/60">
                        Sem capa definida
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex">
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) =>
                            void handleUploadCoverImage(e.target.files?.[0])
                          }
                          disabled={isUploadingCover}
                        />
                        <span
                          className={cn(
                            'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border cursor-pointer transition-colors',
                            'border-border bg-warm-white hover:bg-blush/10',
                            isUploadingCover && 'opacity-60 cursor-not-allowed',
                          )}
                        >
                          <ImagePlus className="size-4" />
                          {coverImageUrl ? 'Trocar capa' : 'Enviar capa'}
                        </span>
                      </label>
                      {coverImageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => void handleRemoveCoverImage()}
                          disabled={isUploadingCover}
                        >
                          <Trash2 className="size-4" />
                          Remover capa
                        </Button>
                      )}
                    </div>
                    {isUploadingCover && (
                      <p className="text-xs text-warm-gray/60">Enviando imagem...</p>
                    )}
                  </div>

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

                  <div className="rounded-xl border border-border/40 bg-warm-white p-5 space-y-4">
                    <p className="text-sm font-medium text-espresso flex items-center gap-2">
                      <Link2 className="size-4 text-muted-rose/60" />
                      Links para compartilhar
                    </p>
                    <div className="inline-flex rounded-xl border border-border/50 p-1 bg-warm-white">
                      <Button
                        type="button"
                        size="sm"
                        variant={shareLinkTab === 'guest' ? 'default' : 'ghost'}
                        onClick={() => setShareLinkTab('guest')}
                      >
                        Convidados
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={shareLinkTab === 'partner' ? 'default' : 'ghost'}
                        onClick={() => setShareLinkTab('partner')}
                      >
                        Parceiro
                      </Button>
                    </div>
                    {shareLinkTab === 'partner' ? (
                      <div>
                        <p className="text-xs text-warm-gray/70 mb-1.5">
                          Convite para o outro anfitrião
                        </p>
                        <Input readOnly value={`/events/${event.slug}/convite-parceiro`} />
                        {canSharePartnerInvite ? (
                          <p className="text-[11px] text-warm-gray/50 mt-1 pl-0.5">
                            Envie somente para o outro anfitrião.
                          </p>
                        ) : (
                          <p className="text-[11px] text-warm-gray/50 mt-1 pl-0.5">
                            Dica: este convite é ideal para eventos com dois anfitriões.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-warm-gray/70 mb-1.5">
                          Página pública para convidados
                        </p>
                        <Input readOnly value={`/events/${event.slug}`} />
                        <p className="text-[11px] text-warm-gray/50 mt-1 pl-0.5">
                          Este link é para os convidados escolherem presentes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* ═══ ERROR ═══ */}
      {showReserveLoginPrompt && (
        <div className="px-6 max-w-5xl mx-auto pb-4">
          <div className="text-sm text-espresso bg-sage/15 border border-sage/25 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <span>Faca login para reservar um presente.</span>
            <Button size="sm" variant="outline" onClick={() => void handleSignInToReserve()}>
              Fazer login
            </Button>
          </div>
        </div>
      )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className={cn(
                      'flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                      newGiftForm.category ? 'text-espresso' : 'text-warm-gray/50',
                    )}
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
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newGiftForm.description}
                  onChange={(e) =>
                    setNewGiftForm((c) => ({
                      ...c,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Detalhes para o convidado"
                  rows={2}
                  className="flex w-full min-h-[4.5rem] resize-y rounded-xl border border-border bg-warm-white px-4 py-3 text-base text-espresso placeholder:text-warm-gray/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
              </div>
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
              <div className="md:col-span-2 space-y-2">
                <p className="text-sm font-medium text-espresso/80 pl-0.5">
                  Imagem do presente (opcional)
                </p>
                <p className="text-[11px] text-warm-gray/60 leading-relaxed max-w-md">
                  Recomendação: JPG/WEBP em 1:1. Ideal 1200×1200 (mínimo 600×600),
                  até 8MB.
                </p>
                {newGiftForm.imageUrl ? (
                  <div className="rounded-xl overflow-hidden border border-border/30 max-w-sm bg-warm-white">
                    <img
                      src={newGiftForm.imageUrl}
                      alt="Prévia do presente"
                      className="w-full h-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 h-28 flex items-center justify-center text-sm text-warm-gray/60 max-w-sm">
                    Sem imagem
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) =>
                        void handleUploadGiftImage(e.target.files?.[0], 'create')
                      }
                      disabled={isUploadingGiftImage}
                    />
                    <span
                      className={cn(
                        'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border cursor-pointer transition-colors',
                        'border-border bg-warm-white hover:bg-blush/10',
                        isUploadingGiftImage && 'opacity-60 cursor-not-allowed',
                      )}
                    >
                      <ImagePlus className="size-4" />
                      {newGiftForm.imageId ? 'Trocar imagem' : 'Enviar imagem'}
                    </span>
                  </label>
                  {newGiftForm.imageId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={handleRemoveDraftGiftImage}
                      disabled={isUploadingGiftImage}
                    >
                      <Trash2 className="size-4" />
                      Remover imagem
                    </Button>
                  )}
                </div>
                {isUploadingGiftImage && (
                  <p className="text-xs text-warm-gray/60">Enviando imagem...</p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => void handleCreateGift()}
                isLoading={isCreatingGift}
                disabled={!newGiftForm.name.trim()}
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
        {!isHostView && (
          <div className="text-center mb-8 md:mb-10">
            <p className="font-accent text-xl md:text-2xl text-muted-rose">com carinho</p>
            <h2 className="font-display italic text-3xl md:text-4xl text-espresso mt-1">
              Lista de presentes
            </h2>
          </div>
        )}
        {hasLongDescriptions && (
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpandDescriptions((prev) => !prev)}
            >
              {expandDescriptions ? 'Recolher descrições' : 'Expandir descrições'}
            </Button>
          </div>
        )}
        {isGiftsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-blush/25 animate-pulse"
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
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
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
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease } }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.3, ease } }}
                  layout
                  className={cn(
                    'rounded-2xl border p-5 transition-all duration-200 hover:shadow-dreamy flex flex-col h-full',
                    cardSizeClass,
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
                        placeholder="Ex.: Jogo de panelas"
                      />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-espresso/80 pl-0.5">
                          Imagem
                        </p>
                        <p className="text-[11px] text-warm-gray/60 leading-relaxed">
                          Recomendação: JPG/WEBP em 1:1. Ideal 1200×1200 (mínimo
                          600×600), até 8MB.
                        </p>
                        {giftForm.imageUrl ? (
                          <div className="rounded-xl overflow-hidden border border-border/30 bg-warm-white">
                            <img
                              src={giftForm.imageUrl}
                              alt="Prévia do presente"
                              className="w-full h-40 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border/50 h-24 flex items-center justify-center text-sm text-warm-gray/60">
                            Sem imagem
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex">
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) =>
                                void handleUploadGiftImage(e.target.files?.[0], 'edit')
                              }
                              disabled={isUploadingEditedGiftImage}
                            />
                            <span
                              className={cn(
                                'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border cursor-pointer transition-colors',
                                'border-border bg-warm-white hover:bg-blush/10',
                                isUploadingEditedGiftImage &&
                                  'opacity-60 cursor-not-allowed',
                              )}
                            >
                              <ImagePlus className="size-4" />
                              {giftForm.imageId ? 'Trocar imagem' : 'Enviar imagem'}
                            </span>
                          </label>
                          {giftForm.imageId && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={handleRemoveEditingGiftImage}
                              disabled={isUploadingEditedGiftImage}
                            >
                              <Trash2 className="size-4" />
                              Remover imagem
                            </Button>
                          )}
                        </div>
                        {isUploadingEditedGiftImage && (
                          <p className="text-xs text-warm-gray/60">Enviando imagem...</p>
                        )}
                      </div>
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
                            className={cn(
                              'flex w-full appearance-none rounded-xl border border-border bg-warm-white px-4 py-3 pr-10 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                              giftForm.category ? 'text-espresso' : 'text-warm-gray/50',
                            )}
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
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                          Descrição
                        </label>
                        <textarea
                          value={giftForm.description}
                          onChange={(e) =>
                            setGiftForm((c) => ({
                              ...c,
                              description: e.target.value,
                            }))
                          }
                          placeholder="Detalhes para o convidado"
                          rows={3}
                          className="flex w-full rounded-xl border border-border bg-warm-white px-4 py-3 text-base text-espresso placeholder:text-warm-gray/50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                        />
                      </div>
                      <Input
                        label="Link de referência"
                        value={giftForm.referenceUrl}
                        onChange={(e) =>
                          setGiftForm((c) => ({
                            ...c,
                            referenceUrl: e.target.value,
                          }))
                        }
                        placeholder="https://..."
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
                        <Badge variant={gift.status} className="shrink-0">
                          {STATUS_LABELS[gift.status]}
                        </Badge>
                      </div>

                      <p className="text-xs text-warm-gray/60 mt-1 min-h-4">
                        {gift.category || 'Sem categoria'}
                      </p>

                      <div className="mt-3 min-h-16">
                        {gift.description ? (
                          <>
                            <p
                              className={cn(
                                'text-sm text-warm-gray leading-relaxed',
                                expandDescriptions ? 'line-clamp-8' : 'line-clamp-3',
                              )}
                            >
                              {capitalizeFirst(gift.description)}
                            </p>
                            {(gift.description?.trim().length ?? 0) > 140 && (
                              <button
                                type="button"
                                onClick={() => setExpandDescriptions((prev) => !prev)}
                                className="mt-1 text-xs text-muted-rose hover:underline"
                              >
                                {expandDescriptions ? 'Ver menos' : 'Ver mais'}
                              </button>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-warm-gray/45">Sem descrição</p>
                        )}
                      </div>

                      <div className="min-h-6 mt-1">
                        {gift.referenceUrl ? (
                          <a
                            href={gift.referenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muted-rose hover:underline"
                          >
                            Ver referência
                            <ArrowRight className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-warm-gray/45">
                            Sem link de referência
                          </span>
                        )}
                      </div>

                      <div className="mt-auto h-10 flex items-center">
                        {gift.status === 'available' ? (
                          isHostView && !isMembershipLoading ? (
                            <p className="text-xs text-warm-gray/50 text-center py-1">
                              Não reservado ainda
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
                            onClick={() => handleDeleteGift(gift._id, gift.name)}
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
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* ═══ DELETE GIFT CONFIRM DIALOG ═══ */}
      <Dialog
        open={deleteGiftConfirm !== null}
        onOpenChange={(open) => !open && !isDeletingGift && setDeleteGiftConfirm(null)}
      >
        <DialogContent showCloseButton={false} className="max-w-xs text-center">
          <DialogTitle className="sr-only">Excluir presente</DialogTitle>
          <DialogDescription className="sr-only">
            Confirmação para excluir o presente selecionado da lista.
          </DialogDescription>
          <div className="flex justify-center mb-1">
            <div className="w-12 h-12 rounded-full bg-destructive/8 flex items-center justify-center">
              <Trash2 className="size-5 text-destructive/70" />
            </div>
          </div>
          <h3 className="font-display italic text-xl text-espresso">
            Excluir presente?
          </h3>
          <p className="text-sm text-warm-gray leading-relaxed">
            <span className="font-medium text-espresso">
              {deleteGiftConfirm?.giftName}
            </span>{' '}
            será removido permanentemente da lista.
          </p>
          <div className="flex gap-3 justify-center pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteGiftConfirm(null)}
              disabled={isDeletingGift}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/8"
              onClick={() => void handleConfirmDeleteGift()}
              isLoading={isDeletingGift}
            >
              <Trash2 className="size-3.5" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
            {/* saucer */}
            <path d="M 28 86 L 92 86" />
            {/* cup body (trapezoid) */}
            <path d="M 38 86 L 44 62 L 76 62 L 82 86 Z" />
            {/* cup rim arc */}
            <path d="M 44 62 Q 60 58 76 62" />
            {/* handle */}
            <path d="M 76 70 Q 93 70 93 78 Q 93 86 76 84" />
            {/* steam wisps */}
            <path d="M 51 60 Q 47 51 51 43 Q 55 35 51 27" />
            <path d="M 69 60 Q 65 51 69 43 Q 73 35 69 27" />
          </g>
        )

      case 'Quarto':
        return (
          <g {...sp}>
            {/* headboard (left, tall) */}
            <rect x="22" y="34" width="14" height="54" rx="3" />
            {/* footboard (right, shorter) */}
            <rect x="84" y="52" width="12" height="36" rx="3" />
            {/* box spring / frame */}
            <rect x="36" y="72" width="48" height="16" rx="2" />
            {/* mattress */}
            <rect x="36" y="50" width="48" height="22" rx="4" />
            {/* pillow */}
            <rect x="40" y="53" width="20" height="14" rx="5" />
            {/* floor line */}
            <path d="M 22 88 L 96 88" />
            {/* legs */}
            <path d="M 30 88 L 30 96" />
            <path d="M 88 88 L 88 96" />
          </g>
        )

      case 'Sala':
        return (
          <g {...sp}>
            {/* seat cushion base */}
            <rect x="28" y="66" width="64" height="22" rx="4" />
            {/* left arm */}
            <rect x="20" y="56" width="14" height="32" rx="4" />
            {/* right arm */}
            <rect x="86" y="56" width="14" height="32" rx="4" />
            {/* back cushion */}
            <rect x="28" y="44" width="64" height="24" rx="4" />
            {/* cushion divider */}
            <path d="M 60 44 L 60 66" />
            {/* left leg */}
            <path d="M 32 88 L 30 96" />
            {/* right leg */}
            <path d="M 88 88 L 90 96" />
          </g>
        )

      case 'Banheiro':
        return (
          <g {...sp}>
            {/* water droplet (left) */}
            <path d="M 40 30 Q 28 46 28 57 Q 28 72 40 72 Q 52 72 52 57 Q 52 46 40 30" />
            {/* soap bar (right) */}
            <rect x="62" y="52" width="34" height="24" rx="5" />
            {/* soap lines */}
            <path d="M 69 61 L 88 61" />
            <path d="M 69 68 L 88 68" />
            {/* bubble above soap */}
            <circle cx="79" cy="44" r="5" />
            <circle cx="90" cy="38" r="3" />
          </g>
        )

      case 'Decoração':
        return (
          <g {...sp}>
            {/* center point */}
            <circle cx="60" cy="60" r="4" />
            {/* three petals */}
            <path d="M 60 56 Q 52 40 56 28 Q 64 40 60 56" />
            <path d="M 64 62 Q 80 55 92 61 Q 82 72 64 62" />
            <path d="M 56 62 Q 40 55 28 61 Q 38 72 56 62" />
          </g>
        )

      case 'Eletro':
        return (
          <g {...sp}>
            {/* bulb globe */}
            <circle cx="60" cy="46" r="22" />
            {/* filament */}
            <path d="M 50 50 Q 55 42 60 50 Q 65 58 70 50" />
            {/* base neck */}
            <path d="M 50 66 L 48 80 L 72 80 L 70 66" />
            <path d="M 50 72 L 70 72" />
            {/* shine arc */}
            <path d="M 45 34 Q 41 38 40 45" />
          </g>
        )

      default:
        // Generic gift box — for no category or 'other'
        return (
          <g {...sp}>
            {/* box body */}
            <rect x="32" y="66" width="56" height="32" rx="3" />
            {/* lid */}
            <rect x="28" y="53" width="64" height="15" rx="3" />
            {/* vertical ribbon */}
            <path d="M 60 53 L 60 98" />
            {/* bow left loop */}
            <path d="M 60 53 Q 50 41 40 45 Q 42 57 60 53" />
            {/* bow right loop */}
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

