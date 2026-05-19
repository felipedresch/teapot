import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  ChevronDown,
  Gift,
  Heart,
  ImagePlus,
  Link2,
  Lock,
  Loader2,
  Plus,
  Share2,
  Sparkles,
  Settings2,
  Trash2,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { Id } from '../../convex/_generated/dataModel'
import { cn } from '../lib/utils'
import { capitalizeFirst, getDisplayHostNames } from '../lib/presentation'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventBySlug, useEventMembership } from '../hooks/useEvents'
import { useGiftMutations, useGifts } from '../hooks/useGifts'
import type { GiftStatusFilter, GiftSortOrder } from '../hooks/useGifts'
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
import { EventInvitationHero } from '../components/EventInvitationHero'
import { UserAvatar } from '../components/UserAvatar'
import { OrnamentDivider } from '../components/OrnamentDivider'
import { SITE_NAME, absoluteUrl, toJsonLd } from '../lib/seo'

export const Route = createFileRoute('/events/$slug')({
  head: () => ({
    meta: [
      {
        title: `Lista de presentes | ${SITE_NAME}`,
      },
      {
        name: 'description',
        content:
          'Veja uma lista de presentes online e participe da celebração com um presente especial.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
    ],
  }),
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

const FORM_SELECT_CLASS =
  'flex w-full appearance-none rounded-xl border border-muted-rose/20 bg-warm-white px-4 py-3 pr-10 text-base text-espresso transition-all duration-200 hover:border-muted-rose/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-[inset_0_1px_2px_rgba(61,53,48,0.03)]'
const FORM_TEXTAREA_CLASS =
  'flex w-full rounded-xl border border-muted-rose/20 bg-warm-white px-4 py-3 text-base text-espresso placeholder:text-warm-gray/55 transition-all duration-200 hover:border-muted-rose/40 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent shadow-[inset_0_1px_2px_rgba(61,53,48,0.03)]'
const UPLOAD_CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border cursor-pointer transition-colors shadow-sm border-muted-rose/35 bg-warm-white/95 backdrop-blur-sm text-espresso hover:bg-muted-rose/16 hover:border-muted-rose/60'
const UPLOAD_DROPZONE_CLASS =
  'rounded-xl border border-dashed border-muted-rose/40 bg-warm-white/80 flex flex-col items-center justify-center text-sm text-warm-gray/75 cursor-pointer transition-all duration-200 hover:bg-muted-rose/8 hover:border-muted-rose/60 hover:shadow-dreamy'
const PRIMARY_ACTION_CLASS =
  'shadow-dreamy-md hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring/70'

// ── Panel shells & sub-section cards (host + add-gift panels) ──
const PANEL_SHELL_CLASS =
  'relative rounded-3xl border border-muted-rose/20 bg-gradient-to-br from-warm-white/85 via-blush/6 to-warm-white/70 shadow-dreamy overflow-hidden backdrop-blur-[2px]'
const PANEL_HEADER_BASE_CLASS =
  'w-full flex items-center justify-between gap-4 px-5 sm:px-6 md:px-7 py-5 md:py-6 transition-colors duration-200 cursor-pointer text-left'
const PANEL_BODY_WRAPPER_CLASS =
  'overflow-hidden border-t border-dashed border-muted-rose/25'
const SECTION_BLOCK_CLASS = 'space-y-4'
const SECTION_EYEBROW_CLASS =
  'flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-muted-rose/80 font-medium'
const SECTION_HAIRLINE_CLASS =
  'h-px w-full bg-gradient-to-r from-transparent via-muted-rose/25 to-transparent'

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

function isValidReferenceUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function EventGiftsPageShell() {
  const { slug } = Route.useParams()
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useCurrentUser()
  const { event, isLoading: isEventLoading } = useEventBySlug(slug)
  const [giftStatusFilter, setGiftStatusFilter] =
    useState<GiftStatusFilter>('available')
  const [giftSortOrder, setGiftSortOrder] = useState<GiftSortOrder>('asc')
  const [giftCategoryFilter, setGiftCategoryFilter] = useState<string>('')
  const {
    gifts,
    isLoading: isGiftsLoading,
    hasMore: hasMoreGifts,
    isLoadingMore: isLoadingMoreGifts,
    loadMore: loadMoreGifts,
  } = useGifts(event?._id, {
    statusFilter: giftStatusFilter,
    sortOrder: giftSortOrder,
  })
  const giftCategories = useQuery(
    api.gifts.listGiftCategoriesForEvent,
    event ? { eventId: event._id } : 'skip',
  )
  const { membership, isLoading: isMembershipLoading } = useEventMembership(
    event?._id as Id<'events'> | undefined,
  )
  const hostReservations = useQuery(
    api.gifts.listGiftReservationsForHost,
    event && membership?.role === 'host' ? { eventId: event._id } : 'skip',
  )
  const { createGift, reserveGift, updateGift, deleteGift, setGiftStatus } =
    useGiftMutations()
  const updateEvent = useMutation(api.events.updateEvent)
  const deleteEvent = useMutation(api.events.deleteEvent)
  const ensurePartnerInvite = useMutation(api.eventInvites.ensurePartnerInvite)
  const rotatePartnerInvite = useMutation(api.eventInvites.rotatePartnerInvite)
  const revokePartnerInvite = useMutation(api.eventInvites.revokePartnerInvite)
  const generateGiftImageUploadUrl = useMutation(api.gifts.generateGiftImageUploadUrl)
  const generateEventCoverUploadUrl = useMutation(
    api.events.generateEventCoverUploadUrl,
  )
  const updateEventCoverImage = useMutation(api.events.updateEventCoverImage)
  const extractGiftImageFromReferenceUrl = useAction(
    api.gifts.extractGiftImageFromReferenceUrl,
  )
  const registerUploadedGiftImage = useMutation(api.gifts.registerUploadedGiftImage)
  const discardTemporaryGiftImage = useMutation(api.gifts.discardTemporaryGiftImage)

  const [reservingGiftId, setReservingGiftId] = useState<Id<'gifts'> | null>(
    null,
  )
  const [reservationDialog, setReservationDialog] = useState<{
    giftId: Id<'gifts'>
    giftName: string
  } | null>(null)
  const [reservationMessage, setReservationMessage] = useState('')
  const [statusChangingGiftId, setStatusChangingGiftId] =
    useState<Id<'gifts'> | null>(null)
  const [isHostReservationsOpen, setIsHostReservationsOpen] = useState(false)
  const [locallyReservedGiftIds, setLocallyReservedGiftIds] = useState<
    Set<Id<'gifts'>>
  >(new Set())
  const [error, setError] = useState<string | null>(null)
  const [showReserveLoginPrompt, setShowReserveLoginPrompt] = useState(false)
  const [eventSaving, setEventSaving] = useState(false)
  const [eventDeleting, setEventDeleting] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | undefined>()
  const [editingGiftId, setEditingGiftId] = useState<Id<'gifts'> | null>(null)
  const [editingOriginalImageId, setEditingOriginalImageId] = useState<
    Id<'_storage'> | undefined
  >()
  const [isCreatingGift, setIsCreatingGift] = useState(false)
  const [isUploadingGiftImage, setIsUploadingGiftImage] = useState(false)
  const [isUploadingEditedGiftImage, setIsUploadingEditedGiftImage] = useState(false)
  const [isExtractingNewGiftImage, setIsExtractingNewGiftImage] = useState(false)
  const [isExtractingEditedGiftImage, setIsExtractingEditedGiftImage] = useState(false)
  const [newGiftReferenceImageError, setNewGiftReferenceImageError] = useState<
    string | null
  >(null)
  const [editedGiftReferenceImageError, setEditedGiftReferenceImageError] =
    useState<string | null>(null)
  const [isHostPanelOpen, setIsHostPanelOpen] = useState(false)
  const [isAddGiftPanelOpen, setIsAddGiftPanelOpen] = useState(true)
  const [deleteGiftConfirm, setDeleteGiftConfirm] = useState<{
    giftId: Id<'gifts'>
    giftName: string
  } | null>(null)
  const [isDeletingGift, setIsDeletingGift] = useState(false)
  const [shareLinkTab, setShareLinkTab] = useState<'guest' | 'partner'>('guest')
  const [copiedInviteToken, setCopiedInviteToken] = useState<string | null>(
    null,
  )
  const [isRotatingInvite, setIsRotatingInvite] = useState(false)
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false)
  const [revokingInviteId, setRevokingInviteId] =
    useState<Id<'eventInvites'> | null>(null)
  const [partnerInviteError, setPartnerInviteError] = useState<string | null>(
    null,
  )
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [didCopyShareLink, setDidCopyShareLink] = useState(false)
  const [expandDescriptions, setExpandDescriptions] = useState(false)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const newGiftExtractionIdRef = useRef(0)
  const editedGiftExtractionIdRef = useRef(0)
  const [newGiftReferenceTouched, setNewGiftReferenceTouched] = useState(false)
  const [editingGiftReferenceTouched, setEditingGiftReferenceTouched] = useState(false)
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

  const guestSharePath = `/events/${slug}`
  const guestShareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${guestSharePath}`
      : guestSharePath

  const handleCopyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(guestShareUrl)
      setDidCopyShareLink(true)
      window.setTimeout(() => setDidCopyShareLink(false), 1800)
    } catch {
      setError('Não foi possível copiar o link agora.')
    }
  }, [guestShareUrl])

  const isHostMembership = Boolean(membership && membership.role === 'host')
  const partnerInvites = useQuery(
    api.eventInvites.listPartnerInvites,
    event && isHostMembership ? { eventId: event._id } : 'skip',
  )

  const buildInviteUrl = useCallback(
    (token: string) =>
      absoluteUrl(
        `/events/${slug}/convite-parceiro?t=${encodeURIComponent(token)}`,
      ),
    [slug],
  )

  const activePartnerInvite = useMemo(
    () => partnerInvites?.find((invite) => invite.status === 'active') ?? null,
    [partnerInvites],
  )
  const hasUsedPartnerInvite = useMemo(
    () => Boolean(partnerInvites?.some((invite) => invite.status === 'used')),
    [partnerInvites],
  )

  const handleGeneratePartnerInvite = useCallback(async () => {
    if (!event) return
    setPartnerInviteError(null)
    setIsGeneratingInvite(true)
    try {
      await ensurePartnerInvite({ eventId: event._id })
    } catch (caught) {
      setPartnerInviteError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível gerar o convite agora.',
      )
    } finally {
      setIsGeneratingInvite(false)
    }
  }, [ensurePartnerInvite, event])

  const handleCopyInvite = useCallback(
    async (token: string) => {
      const url = buildInviteUrl(token)
      try {
        await navigator.clipboard.writeText(url)
        setCopiedInviteToken(token)
        window.setTimeout(() => {
          setCopiedInviteToken((current) => (current === token ? null : current))
        }, 1800)
      } catch {
        setPartnerInviteError('Não foi possível copiar o link agora.')
      }
    },
    [buildInviteUrl],
  )

  const handleRotatePartnerInvite = useCallback(async () => {
    if (!event) return
    setPartnerInviteError(null)
    setIsRotatingInvite(true)
    try {
      await rotatePartnerInvite({ eventId: event._id })
    } catch (caught) {
      setPartnerInviteError(
        caught instanceof Error
          ? caught.message
          : 'Não foi possível gerar um novo link agora.',
      )
    } finally {
      setIsRotatingInvite(false)
    }
  }, [event, rotatePartnerInvite])

  const handleRevokePartnerInvite = useCallback(
    async (inviteId: Id<'eventInvites'>) => {
      setPartnerInviteError(null)
      setRevokingInviteId(inviteId)
      try {
        await revokePartnerInvite({ inviteId })
      } catch (caught) {
        setPartnerInviteError(
          caught instanceof Error
            ? caught.message
            : 'Não foi possível revogar o convite agora.',
        )
      } finally {
        setRevokingInviteId(null)
      }
    },
    [revokePartnerInvite],
  )

  useEffect(() => {
    if (!isHostView || !newGiftReferenceTouched) {
      setIsExtractingNewGiftImage(false)
      return
    }

    const normalizedUrl = newGiftForm.referenceUrl.trim()
    if (!normalizedUrl || !isValidReferenceUrl(normalizedUrl)) {
      setIsExtractingNewGiftImage(false)
      setNewGiftReferenceImageError(null)
      return
    }

    setIsExtractingNewGiftImage(true)
    setNewGiftReferenceImageError(null)

    const timeout = window.setTimeout(() => {
      const extractionId = newGiftExtractionIdRef.current + 1
      newGiftExtractionIdRef.current = extractionId

      void extractGiftImageFromReferenceUrl({
        referenceUrl: normalizedUrl,
      })
        .then((result) => {
          if (newGiftExtractionIdRef.current !== extractionId) return
          if (!result.success || !result.imageId || !result.imageUrl) {
            setNewGiftReferenceImageError(
              result.error ??
                'Não conseguimos extrair a imagem automaticamente desse link.',
            )
            return
          }
          setNewGiftReferenceImageError(null)
          setNewGiftForm((current) => {
            if (current.imageId && current.imageId !== result.imageId) {
              void discardTemporaryGiftImage({ imageId: current.imageId })
            }
            return {
              ...current,
              imageId: result.imageId,
              imageUrl: result.imageUrl,
            }
          })
        })
        .catch(() => {
          if (newGiftExtractionIdRef.current !== extractionId) return
          setNewGiftReferenceImageError(
            'Não foi possível extrair a imagem automaticamente desse link.',
          )
        })
        .finally(() => {
          if (newGiftExtractionIdRef.current !== extractionId) return
          setIsExtractingNewGiftImage(false)
        })
    }, 500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    discardTemporaryGiftImage,
    extractGiftImageFromReferenceUrl,
    isHostView,
    newGiftForm.referenceUrl,
    newGiftReferenceTouched,
  ])

  useEffect(() => {
    if (!isHostView || !editingGiftId || !editingGiftReferenceTouched) {
      setIsExtractingEditedGiftImage(false)
      return
    }

    const normalizedUrl = giftForm.referenceUrl.trim()
    if (!normalizedUrl || !isValidReferenceUrl(normalizedUrl)) {
      setIsExtractingEditedGiftImage(false)
      setEditedGiftReferenceImageError(null)
      return
    }

    setIsExtractingEditedGiftImage(true)
    setEditedGiftReferenceImageError(null)

    const timeout = window.setTimeout(() => {
      const extractionId = editedGiftExtractionIdRef.current + 1
      editedGiftExtractionIdRef.current = extractionId

      void extractGiftImageFromReferenceUrl({
        referenceUrl: normalizedUrl,
      })
        .then((result) => {
          if (editedGiftExtractionIdRef.current !== extractionId) return
          if (!result.success || !result.imageId || !result.imageUrl) {
            setEditedGiftReferenceImageError(
              result.error ??
                'Não conseguimos extrair a imagem automaticamente desse link.',
            )
            return
          }
          setEditedGiftReferenceImageError(null)
          setGiftForm((current) => {
            if (current.imageId && current.imageId !== result.imageId) {
              void discardTemporaryGiftImage({ imageId: current.imageId })
            }
            return {
              ...current,
              imageId: result.imageId,
              imageUrl: result.imageUrl,
            }
          })
        })
        .catch(() => {
          if (editedGiftExtractionIdRef.current !== extractionId) return
          setEditedGiftReferenceImageError(
            'Não foi possível extrair a imagem automaticamente desse link.',
          )
        })
        .finally(() => {
          if (editedGiftExtractionIdRef.current !== extractionId) return
          setIsExtractingEditedGiftImage(false)
        })
    }, 500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    discardTemporaryGiftImage,
    editingGiftId,
    editingGiftReferenceTouched,
    extractGiftImageFromReferenceUrl,
    giftForm.referenceUrl,
    isHostView,
  ])

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
    async (giftId: Id<'gifts'>, message?: string) => {
      setReservingGiftId(giftId)
      setError(null)
      try {
        await reserveGift({ giftId, message })
        setLocallyReservedGiftIds((current) => {
          const next = new Set(current)
          next.add(giftId)
          return next
        })
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
    (giftId: Id<'gifts'>, giftName: string) => {
      if (!isAuthenticated) {
        setError(null)
        setShowReserveLoginPrompt(true)
        return
      }

      setShowReserveLoginPrompt(false)
      setReservationMessage('')
      setReservationDialog({ giftId, giftName })
    },
    [isAuthenticated],
  )

  const handleSetGiftStatus = useCallback(
    async (giftId: Id<'gifts'>, status: 'available' | 'received') => {
      setStatusChangingGiftId(giftId)
      setError(null)
      try {
        await setGiftStatus({ giftId, status })
      } catch (statusError) {
        setError(
          statusError instanceof Error
            ? statusError.message
            : 'Não foi possível atualizar o status do presente.',
        )
      } finally {
        setStatusChangingGiftId(null)
      }
    },
    [setGiftStatus],
  )

  const handleConfirmReservation = useCallback(async () => {
    if (!reservationDialog) return
    const { giftId } = reservationDialog
    const trimmed = reservationMessage.trim()
    setReservationDialog(null)
    await reserveNow(giftId, trimmed ? trimmed : undefined)
  }, [reservationDialog, reservationMessage, reserveNow])

  const handleSignInToReserve = useCallback(async () => {
    await signIn('google', { redirectTo: `/events/${slug}` })
  }, [signIn, slug])

  useEffect(() => {
    if (isAuthenticated) {
      setShowReserveLoginPrompt(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!hasMoreGifts || isLoadingMoreGifts) {
      return
    }

    const target = loadMoreTriggerRef.current
    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (!firstEntry?.isIntersecting) {
          return
        }
        loadMoreGifts(24)
      },
      {
        rootMargin: '900px 0px 280px 0px',
        threshold: 0.01,
      },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMoreGifts, isLoadingMoreGifts, loadMoreGifts])

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

        if (!previewUrl) {
          throw new Error('Não foi possível processar a imagem da capa.')
        }

        setCoverPreviewUrl(previewUrl)

        const optimizedCoverFile = dataUrlToFile(
          previewUrl,
          `event-cover-${event._id}.jpg`,
        )
        const storageId = await uploadImageToConvex(uploadUrl, optimizedCoverFile)
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
          setNewGiftReferenceImageError(null)
        } else {
          setIsUploadingEditedGiftImage(true)
          setEditedGiftReferenceImageError(null)
        }

        const [previewUrl, uploadUrl] = await Promise.all([
          generateImagePreview(file!, GIFT_PREVIEW_OPTIONS),
          generateGiftImageUploadUrl({ eventId: event._id }),
        ])

        if (!previewUrl) {
          throw new Error('Não foi possível processar a imagem do presente.')
        }

        const optimizedGiftFile = dataUrlToFile(
          previewUrl,
          `gift-${Date.now()}.jpg`,
        )
        const storageId = await uploadImageToConvex(uploadUrl, optimizedGiftFile)
        await registerUploadedGiftImage({
          eventId: event._id,
          imageId: storageId,
        })

        if (mode === 'create') {
          if (newGiftForm.imageId && newGiftForm.imageId !== storageId) {
            await discardTemporaryGiftImage({ imageId: newGiftForm.imageId })
          }
          setNewGiftForm((current) => ({
            ...current,
            imageId: storageId,
            imageUrl: previewUrl,
          }))
          setNewGiftReferenceTouched(false)
          return
        }

        if (giftForm.imageId && giftForm.imageId !== storageId) {
          await discardTemporaryGiftImage({ imageId: giftForm.imageId })
        }
        setGiftForm((current) => ({
          ...current,
          imageId: storageId,
          imageUrl: previewUrl,
        }))
        setEditingGiftReferenceTouched(false)
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
    [
      discardTemporaryGiftImage,
      event,
      generateGiftImageUploadUrl,
      giftForm.imageId,
      isHostView,
      newGiftForm.imageId,
      registerUploadedGiftImage,
      validateImageFile,
    ],
  )

  const handleRemoveDraftGiftImage = useCallback(() => {
    if (newGiftForm.imageId) {
      void discardTemporaryGiftImage({ imageId: newGiftForm.imageId })
    }
    setNewGiftForm((current) => ({
      ...current,
      imageId: undefined,
      imageUrl: undefined,
    }))
    setNewGiftReferenceImageError(null)
  }, [discardTemporaryGiftImage, newGiftForm.imageId])

  const handleRemoveEditingGiftImage = useCallback(() => {
    if (giftForm.imageId) {
      void discardTemporaryGiftImage({ imageId: giftForm.imageId })
    }
    setGiftForm((current) => ({
      ...current,
      imageId: null,
      imageUrl: undefined,
    }))
    setEditedGiftReferenceImageError(null)
  }, [discardTemporaryGiftImage, giftForm.imageId])

  const startEditingGift = useCallback(
    (gift: (typeof gifts)[number]) => {
      if (!isHostView) return
      setEditingGiftId(gift._id)
      setEditingOriginalImageId(gift.imageId)
      setEditingGiftReferenceTouched(false)
      setEditedGiftReferenceImageError(null)
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
      setNewGiftReferenceTouched(false)
      setNewGiftReferenceImageError(null)
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
      setEditingOriginalImageId(undefined)
      setEditingGiftReferenceTouched(false)
      setEditedGiftReferenceImageError(null)
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

  const isNewGiftImageProcessing = isUploadingGiftImage || isExtractingNewGiftImage
  const isEditedGiftImageProcessing =
    isUploadingEditedGiftImage || isExtractingEditedGiftImage

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
  const filteredGifts = giftCategoryFilter
    ? gifts.filter(
        (gift) =>
          (gift.category?.trim() ?? '').toLowerCase() ===
          giftCategoryFilter.toLowerCase(),
      )
    : gifts
  const hasLongDescriptions = filteredGifts.some(
    (gift) => (gift.description?.trim().length ?? 0) > 140,
  )
  const cardSizeClass = expandDescriptions ? 'min-h-[24rem]' : 'min-h-[20rem]'
  const coverImageUrl = coverPreviewUrl ?? event.coverImageUrl
  const eventSchema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: capitalizeFirst(headerEvent.name),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    startDate: headerEvent.date || undefined,
    location: headerEvent.location
      ? {
          '@type': 'VirtualLocation',
          url: absoluteUrl(`/events/${slug}`),
        }
      : undefined,
    description: headerEvent.description || `Lista de presentes para ${headerEvent.name}.`,
    image: coverImageUrl ? [coverImageUrl] : undefined,
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
    },
    url: absoluteUrl(`/events/${slug}`),
    inLanguage: 'pt-BR',
  }
  const giftListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Lista de presentes - ${headerEvent.name}`,
    itemListElement: gifts.slice(0, 100).map((gift, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: gift.name,
        description: gift.description || undefined,
        image: gift.imageUrl ? [gift.imageUrl] : undefined,
        url: absoluteUrl(`/events/${slug}`),
      },
    })),
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(giftListSchema) }}
      />
      {/* ═══ HERO — Invitation Style ═══ */}
      <EventInvitationHero
        coverImageUrl={coverImageUrl}
        eventName={capitalizeFirst(headerEvent.name)}
        eventTypeLabel={eventTypeLabel}
        hosts={headerHosts}
        shouldUsePairLayout={shouldUsePairLayout}
        location={headerEvent.location}
        date={headerEvent.date}
        description={headerEvent.description}
        onShareClick={() => {
          setDidCopyShareLink(false)
          setIsShareDialogOpen(true)
        }}
      />


      {/* ═══ HOST PANEL — Collapsible ═══ */}
      {isHostView && (
        <section className="px-4 sm:px-6 pb-6 pt-8 md:pt-10 max-w-5xl mx-auto">
          <div className={PANEL_SHELL_CLASS}>
            {/* Decorative top hairline — muted-rose gradient */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-muted-rose/45 to-transparent"
            />
            <button
              type="button"
              onClick={() => setIsHostPanelOpen((prev) => !prev)}
              className={cn(
                PANEL_HEADER_BASE_CLASS,
                'hover:bg-blush/14',
                isHostPanelOpen && 'bg-blush/10',
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  aria-hidden
                  className="relative inline-flex items-center justify-center size-11 sm:size-12 rounded-2xl bg-gradient-to-br from-blush via-blush/75 to-muted-rose/40 ring-1 ring-warm-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_6px_rgba(201,169,166,0.25)] shrink-0"
                >
                  <Settings2
                    className="size-5 text-espresso/80"
                    strokeWidth={1.6}
                  />
                </span>
                <div className="min-w-0">
                  <p className={SECTION_EYEBROW_CLASS}>
                    <span className="inline-block h-px w-5 bg-muted-rose/40" />
                    Para você
                  </p>
                  <h3 className="font-display italic text-xl sm:text-[1.4rem] text-espresso mt-1.5 leading-tight">
                    Painel do anfitrião
                  </h3>
                  <p className="text-xs sm:text-[13px] text-warm-gray/75 mt-1 leading-snug">
                    Edite o evento, gerencie presentes e compartilhe.
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center justify-center size-9 rounded-full bg-warm-white/80 border border-muted-rose/25 shadow-sm transition-all duration-300 shrink-0',
                  isHostPanelOpen && 'rotate-180 bg-blush/40 border-muted-rose/50',
                )}
              >
                <ChevronDown className="size-4 text-espresso/70" strokeWidth={1.8} />
              </span>
            </button>

            <AnimatePresence>
              {isHostPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease }}
                  className={PANEL_BODY_WRAPPER_CLASS}
                >
                  <div className="p-6 sm:p-8 md:p-10 space-y-8 md:space-y-10 bg-gradient-to-b from-cream/40 via-warm-white/60 to-warm-white/40">
                  {editableEvent && (
                    <section className={SECTION_BLOCK_CLASS}>
                      <div>
                        <p className={SECTION_EYEBROW_CLASS}>
                          <span className="inline-block h-px w-5 bg-muted-rose/40" />
                          Detalhes
                        </p>
                        <h4 className="font-display italic text-lg text-espresso mt-1 leading-tight">
                          Sobre o evento
                        </h4>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
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
                            className={FORM_SELECT_CLASS}
                          >
                            {EVENT_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            aria-hidden
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-warm-gray/55"
                            strokeWidth={1.8}
                          />
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
                      <div className="md:col-span-2 space-y-4 pt-2">
                        <div>
                          <p className={SECTION_EYEBROW_CLASS}>
                            <span className="inline-block h-px w-5 bg-muted-rose/40" />
                            {PAIR_EVENT_TYPES.has(editableEvent.eventType)
                              ? 'Casal'
                              : 'Anfitriões'}
                          </p>
                          <h4 className="font-display italic text-base text-espresso mt-1 leading-tight">
                            {PAIR_EVENT_TYPES.has(editableEvent.eventType)
                              ? 'Quem está se casando'
                              : 'Quem está organizando'}
                          </h4>
                          <p className="text-[11.5px] text-warm-gray/65 mt-1 leading-snug">
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
                            <div className="pt-1">
                              <p className="text-sm font-medium text-espresso/85">
                                Qual dos parceiros é você?
                              </p>
                              <p className="text-[11.5px] text-warm-gray/65 mb-3 leading-snug">
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
                          className={cn(FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
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
                    </section>
                  )}

                  <div className={SECTION_HAIRLINE_CLASS} aria-hidden />

                  <section className={SECTION_BLOCK_CLASS}>
                    <div>
                      <p className={SECTION_EYEBROW_CLASS}>
                        <span className="inline-block h-px w-5 bg-muted-rose/40" />
                        Capa
                      </p>
                      <h4 className="font-display italic text-lg text-espresso mt-1 leading-tight">
                        Imagem do convite
                      </h4>
                      <p className="text-xs text-warm-gray/70 mt-1">
                        A capa aparece no topo da página para todos os convidados.
                      </p>
                    </div>
                    <p className="text-[11px] text-warm-gray/55 leading-relaxed">
                      Recomendação: JPG/WEBP em 16:9. Ideal 1920×1080 (mínimo
                      1280×720), até 8MB.
                    </p>
                    {coverImageUrl ? (
                      <div className="rounded-xl overflow-hidden relative group shadow-dreamy border border-muted-rose/15">
                        <img
                          src={coverImageUrl}
                          alt="Capa do evento"
                          className="w-full max-h-[22rem] object-contain bg-warm-white"
                          loading="lazy"
                        />
                        <label className="absolute bottom-3 right-3 inline-flex">
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
                              UPLOAD_CHIP_CLASS,
                              isUploadingCover && 'opacity-60 cursor-not-allowed',
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
                          onChange={(e) =>
                            void handleUploadCoverImage(e.target.files?.[0])
                          }
                          disabled={isUploadingCover}
                        />
                        <ImagePlus className="size-5 text-muted-rose/70" />
                        <span>{isUploadingCover ? 'Enviando capa...' : 'Enviar capa'}</span>
                      </label>
                    )}
                    <div className="flex flex-wrap gap-2">
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
                  </section>

                  <div className={SECTION_HAIRLINE_CLASS} aria-hidden />

                  <section className={SECTION_BLOCK_CLASS}>
                    <div>
                      <p className={SECTION_EYEBROW_CLASS}>
                        <span className="inline-block h-px w-5 bg-muted-rose/40" />
                        Compartilhar
                      </p>
                      <h4 className="font-display italic text-lg text-espresso mt-1 leading-tight flex items-center gap-2">
                        <Link2 className="size-4 text-muted-rose/70" strokeWidth={1.8} />
                        Links do convite
                      </h4>
                    </div>
                    <div className="inline-flex rounded-xl border border-muted-rose/20 p-1 bg-warm-white shadow-sm">
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
                      <PartnerInviteSection
                        invites={partnerInvites}
                        activeInvite={activePartnerInvite}
                        hasUsedInvite={hasUsedPartnerInvite}
                        canSharePartnerInvite={canSharePartnerInvite}
                        buildInviteUrl={buildInviteUrl}
                        copiedInviteToken={copiedInviteToken}
                        revokingInviteId={revokingInviteId}
                        isGeneratingInvite={isGeneratingInvite}
                        isRotatingInvite={isRotatingInvite}
                        error={partnerInviteError}
                        onGenerate={handleGeneratePartnerInvite}
                        onCopy={handleCopyInvite}
                        onRevoke={handleRevokePartnerInvite}
                        onRotate={handleRotatePartnerInvite}
                      />
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
                  </section>

                  <div className="pt-1">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-rose/35 to-transparent" />
                      <OrnamentDivider className="w-16 text-muted-rose/50" />
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-muted-rose/35 to-transparent" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => void handleSaveEvent()}
                        className={PRIMARY_ACTION_CLASS}
                        isLoading={eventSaving}
                      >
                        Salvar alterações
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => void handleDeleteEvent()}
                        isLoading={eventDeleting}
                      >
                        <Trash2 className="size-4" />
                        Excluir evento
                      </Button>
                    </div>
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

        {isHostView && hostReservations && hostReservations.length > 0 && (
          <HostReservationsPanel
            reservations={hostReservations}
            isOpen={isHostReservationsOpen}
            onToggle={() => setIsHostReservationsOpen((prev) => !prev)}
          />
        )}

      {isHostView && (
        <div className="mb-10">
          <div className={cn(PANEL_SHELL_CLASS, 'border-sage/30')}>
            {/* Decorative top hairline — sage gradient */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sage/55 to-transparent"
            />
            <button
              type="button"
              onClick={() => setIsAddGiftPanelOpen((prev) => !prev)}
              className={cn(
                PANEL_HEADER_BASE_CLASS,
                'hover:bg-sage/10',
                isAddGiftPanelOpen && 'bg-sage/8',
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <span
                  aria-hidden
                  className="relative inline-flex items-center justify-center size-11 sm:size-12 rounded-2xl bg-gradient-to-br from-sage via-sage/75 to-sage/40 ring-1 ring-warm-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_6px_rgba(168,197,168,0.3)] shrink-0"
                >
                  <Gift className="size-5 text-espresso/80" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] text-sage/90 font-medium">
                    <span className="inline-block h-px w-5 bg-sage/60" />
                    Novo na lista
                  </p>
                  <h3 className="font-display italic text-xl sm:text-[1.4rem] text-espresso mt-1.5 leading-tight">
                    Adicionar presente
                  </h3>
                  <p className="text-xs sm:text-[13px] text-warm-gray/75 mt-1 leading-snug">
                    Crie novos itens da lista e organize imagens e links.
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center justify-center size-9 rounded-full bg-warm-white/80 border border-sage/30 shadow-sm transition-all duration-300 shrink-0',
                  isAddGiftPanelOpen && 'rotate-180 bg-sage/30 border-sage/60',
                )}
              >
                <ChevronDown className="size-4 text-espresso/70" strokeWidth={1.8} />
              </span>
            </button>

            <AnimatePresence>
              {isAddGiftPanelOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease }}
                  className="overflow-hidden border-t border-dashed border-sage/35"
                >
                  <div className="p-6 sm:p-8 md:p-10 space-y-6 bg-gradient-to-b from-sage/8 via-warm-white/60 to-warm-white/40">
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
                              FORM_SELECT_CLASS,
                              newGiftForm.category ? 'text-espresso' : 'text-warm-gray/55',
                            )}
                          >
                            <option value="">Sem categoria</option>
                            {DEFAULT_GIFT_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            aria-hidden
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-warm-gray/55"
                            strokeWidth={1.8}
                          />
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
                          className={cn(FORM_TEXTAREA_CLASS, 'min-h-[4.5rem] resize-y')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Input
                          label="Link de referência (opcional)"
                          value={newGiftForm.referenceUrl}
                          onChange={(e) =>
                            {
                              setNewGiftReferenceTouched(true)
                              setNewGiftReferenceImageError(null)
                              setNewGiftForm((c) => ({
                                ...c,
                                referenceUrl: e.target.value,
                              }))
                            }
                          }
                          placeholder="https://..."
                        />
                        <p className="text-[11px] text-warm-gray/65 leading-relaxed pl-0.5">
                          Cole o link da loja e a gente busca a imagem pra você.
                        </p>
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <p className="text-sm font-medium text-espresso/80 pl-0.5">
                          Imagem do presente (opcional)
                        </p>
                        <p className="text-[11px] text-warm-gray/60 leading-relaxed max-w-md">
                          Recomendação: JPG/WEBP em 1:1. Ideal 1200×1200 (mínimo 600×600),
                          até 8MB.
                        </p>
                        <div className="max-w-sm">
                          {isExtractingNewGiftImage ? (
                            <div
                              role="status"
                              aria-live="polite"
                              className="rounded-xl border border-dashed border-muted-rose/55 bg-muted-rose/8 h-44 flex flex-col items-center justify-center gap-2 px-4 text-center"
                            >
                              <Loader2 className="size-6 text-muted-rose animate-spin" />
                              <p className="text-sm font-medium text-espresso">
                                Buscando imagem do link...
                              </p>
                              <p className="text-xs text-warm-gray/75">
                                Isso pode levar alguns segundos
                              </p>
                            </div>
                          ) : newGiftForm.imageUrl ? (
                            <div className="rounded-xl overflow-hidden border border-border/30 bg-warm-white relative group">
                              <img
                                src={newGiftForm.imageUrl}
                                alt="Prévia do presente"
                                className="w-full h-44 object-contain"
                              />
                              {isUploadingGiftImage && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-white/80 backdrop-blur-sm">
                                  <Loader2 className="size-5 text-muted-rose animate-spin" />
                                  <p className="text-sm font-medium text-espresso">
                                    Enviando imagem...
                                  </p>
                                </div>
                              )}
                              <label className="absolute bottom-3 right-3 inline-flex">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) =>
                                    void handleUploadGiftImage(
                                      e.target.files?.[0],
                                      'create',
                                    )
                                  }
                                  disabled={isNewGiftImageProcessing}
                                />
                                <span
                                  className={cn(
                                    UPLOAD_CHIP_CLASS,
                                    isNewGiftImageProcessing &&
                                      'opacity-60 cursor-not-allowed',
                                  )}
                                >
                                  <ImagePlus className="size-3.5" />
                                  Trocar imagem
                                </span>
                              </label>
                            </div>
                          ) : (
                            <label
                              className={cn(UPLOAD_DROPZONE_CLASS, 'h-44 gap-2')}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) =>
                                  void handleUploadGiftImage(
                                    e.target.files?.[0],
                                    'create',
                                  )
                                }
                                disabled={isNewGiftImageProcessing}
                              />
                              {isUploadingGiftImage ? (
                                <>
                                  <Loader2 className="size-5 text-muted-rose animate-spin" />
                                  <span className="text-sm font-medium text-espresso">
                                    Enviando imagem...
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ImagePlus className="size-5 text-muted-rose/75" />
                                  <span>Clique para enviar uma imagem</span>
                                  <span className="text-[11px] text-warm-gray/55">
                                    ou cole um link de referência acima
                                  </span>
                                </>
                              )}
                            </label>
                          )}
                        </div>
                        {newGiftReferenceImageError && (
                          <p className="text-xs text-destructive pl-0.5">
                            {newGiftReferenceImageError}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {newGiftForm.imageId && !isExtractingNewGiftImage && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={handleRemoveDraftGiftImage}
                              disabled={isNewGiftImageProcessing}
                            >
                              <Trash2 className="size-4" />
                              Remover imagem
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sage/40 to-transparent" />
                        <OrnamentDivider className="w-14 text-sage/60" />
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-sage/40 to-transparent" />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleCreateGift()}
                          className={PRIMARY_ACTION_CLASS}
                          isLoading={isCreatingGift}
                          disabled={!newGiftForm.name.trim() || isNewGiftImageProcessing}
                        >
                          <Plus className="size-3.5" />
                          Adicionar à lista
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

        <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
          {(
            [
              { value: 'available', label: 'Disponíveis' },
              { value: 'reserved', label: 'Reservados' },
              ...(isHostView
                ? [{ value: 'received', label: 'Recebidos' }]
                : []),
              { value: 'all', label: 'Todos' },
            ] as Array<{ value: GiftStatusFilter; label: string }>
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGiftStatusFilter(option.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                giftStatusFilter === option.value
                  ? 'border-muted-rose bg-muted-rose/15 text-espresso'
                  : 'border-border/50 text-warm-gray hover:text-espresso hover:border-muted-rose/40',
              )}
            >
              {option.label}
            </button>
          ))}
          {isHostView && giftStatusFilter === 'received' && (
            <span className="flex items-center gap-1 text-[11px] text-muted-rose/70 ml-1">
              <Lock className="size-3" />
              Só você vê esta aba
            </span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">
            {(giftCategories?.length ?? 0) > 0 && (
              <div className="relative">
                <select
                  value={giftCategoryFilter}
                  onChange={(e) => setGiftCategoryFilter(e.target.value)}
                  className="appearance-none rounded-full border border-border/50 bg-warm-white pl-3 pr-8 py-1 text-xs text-espresso hover:border-muted-rose/40 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todas categorias</option>
                  {giftCategories?.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-warm-gray/60"
                  strokeWidth={1.8}
                />
              </div>
            )}
            <div className="relative">
              <select
                value={giftSortOrder}
                onChange={(e) =>
                  setGiftSortOrder(e.target.value as GiftSortOrder)
                }
                className="appearance-none rounded-full border border-border/50 bg-warm-white pl-3 pr-8 py-1 text-xs text-espresso hover:border-muted-rose/40 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="asc">Mais antigos primeiro</option>
                <option value="desc">Mais recentes primeiro</option>
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-3 text-warm-gray/60"
                strokeWidth={1.8}
              />
            </div>
          </div>
        </div>

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
        ) : filteredGifts.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="size-10 text-warm-gray/15 mx-auto mb-4" />
            <p className="text-warm-gray/50 leading-relaxed">
              {gifts.length === 0
                ? 'Ainda não há presentes nesta lista.'
                : 'Nenhum presente corresponde aos filtros atuais.'}
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
              {filteredGifts.map((gift) => {
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
                        {isExtractingEditedGiftImage ? (
                          <div
                            role="status"
                            aria-live="polite"
                            className="rounded-xl border border-dashed border-muted-rose/55 bg-muted-rose/8 h-40 flex flex-col items-center justify-center gap-2 px-4 text-center"
                          >
                            <Loader2 className="size-6 text-muted-rose animate-spin" />
                            <p className="text-sm font-medium text-espresso">
                              Buscando imagem do link...
                            </p>
                            <p className="text-xs text-warm-gray/75">
                              Isso pode levar alguns segundos
                            </p>
                          </div>
                        ) : giftForm.imageUrl ? (
                          <div className="rounded-xl overflow-hidden border border-border/30 bg-warm-white relative">
                            <img
                              src={giftForm.imageUrl}
                              alt="Prévia do presente"
                              className="w-full h-40 object-contain"
                            />
                            {isUploadingEditedGiftImage && (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-warm-white/80 backdrop-blur-sm">
                                <Loader2 className="size-5 text-muted-rose animate-spin" />
                                <p className="text-sm font-medium text-espresso">
                                  Enviando imagem...
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <label
                            className={cn(
                              UPLOAD_DROPZONE_CLASS,
                              'h-40 gap-2',
                            )}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={(e) =>
                                void handleUploadGiftImage(e.target.files?.[0], 'edit')
                              }
                              disabled={isEditedGiftImageProcessing}
                            />
                            {isUploadingEditedGiftImage ? (
                              <>
                                <Loader2 className="size-5 text-muted-rose animate-spin" />
                                <span className="text-sm font-medium text-espresso">
                                  Enviando imagem...
                                </span>
                              </>
                            ) : (
                              <>
                                <ImagePlus className="size-5 text-muted-rose/75" />
                                <span>Clique para enviar uma imagem</span>
                                <span className="text-[11px] text-warm-gray/55">
                                  ou cole um link de referência abaixo
                                </span>
                              </>
                            )}
                          </label>
                        )}
                        {!isExtractingEditedGiftImage && (
                          <div className="flex flex-wrap gap-2">
                            {giftForm.imageUrl && (
                              <label className="inline-flex">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) =>
                                    void handleUploadGiftImage(
                                      e.target.files?.[0],
                                      'edit',
                                    )
                                  }
                                  disabled={isEditedGiftImageProcessing}
                                />
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm border cursor-pointer transition-colors shadow-sm border-muted-rose/35 bg-warm-white text-espresso hover:bg-muted-rose/16 hover:border-muted-rose/60',
                                    isEditedGiftImageProcessing &&
                                      'opacity-60 cursor-not-allowed',
                                  )}
                                >
                                  <ImagePlus className="size-4" />
                                  Trocar imagem
                                </span>
                              </label>
                            )}
                            {giftForm.imageId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={handleRemoveEditingGiftImage}
                                disabled={isEditedGiftImageProcessing}
                              >
                                <Trash2 className="size-4" />
                                Remover imagem
                              </Button>
                            )}
                          </div>
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
                              FORM_SELECT_CLASS,
                              giftForm.category ? 'text-espresso' : 'text-warm-gray/55',
                            )}
                          >
                            <option value="">Sem categoria</option>
                            {DEFAULT_GIFT_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            aria-hidden
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-warm-gray/55"
                            strokeWidth={1.8}
                          />
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
                          className={cn(FORM_TEXTAREA_CLASS, 'resize-y')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Input
                          label="Link de referência"
                          value={giftForm.referenceUrl}
                          onChange={(e) =>
                            {
                              setEditingGiftReferenceTouched(true)
                              setEditedGiftReferenceImageError(null)
                              setGiftForm((c) => ({
                                ...c,
                                referenceUrl: e.target.value,
                              }))
                            }
                          }
                          placeholder="https://..."
                        />
                        <p className="text-[11px] text-warm-gray/65 leading-relaxed pl-0.5">
                          Cole o link da loja e a gente busca a imagem pra você.
                        </p>
                        {editedGiftReferenceImageError && (
                          <p className="text-xs text-destructive pl-0.5">
                            {editedGiftReferenceImageError}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              giftForm.imageId &&
                              giftForm.imageId !== editingOriginalImageId
                            ) {
                              void discardTemporaryGiftImage({
                                imageId: giftForm.imageId,
                              })
                            }
                            setEditingGiftReferenceTouched(false)
                            setEditingOriginalImageId(undefined)
                            setEditingGiftId(null)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className={PRIMARY_ACTION_CLASS}
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
                        <h4 className="font-display italic text-base leading-snug text-espresso">
                          {gift.name}
                        </h4>
                        <Badge variant={gift.status} className="shrink-0">
                          {STATUS_LABELS[gift.status]}
                        </Badge>
                      </div>

                      <p className="font-accent text-base text-muted-rose/85 leading-none mt-1 min-h-4">
                        {gift.category || ''}
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
                            className="inline-flex items-center gap-1 text-xs font-semibold text-espresso/85 hover:text-espresso hover:underline underline-offset-2"
                          >
                            Ver referência
                            <ArrowRight className="size-3" />
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-espresso/70">
                          </span>
                        )}
                      </div>

                      <div className="mt-auto h-10 flex items-center">
                        {gift.status === 'available' ? (
                          isHostView && !isMembershipLoading ? (
                            <p className="text-xs font-semibold text-espresso/70 text-center py-1">
                              Não reservado ainda
                            </p>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full"
                              isLoading={reservingGiftId === gift._id}
                              onClick={() =>
                                handleReserveGift(gift._id, gift.name)
                              }
                            >
                              <Heart className="size-3.5" />
                              Quero presentear
                            </Button>
                          )
                        ) : gift.status === 'reserved' ? (
                          <p className="text-xs font-semibold text-center py-1">
                            {(() => {
                              const isReservedByCurrentGuest =
                                gift.reservedByCurrentUser ||
                                locallyReservedGiftIds.has(gift._id)

                              if (isHostView && gift.reservedByName) {
                                return (
                                  <>
                                    <span className="text-muted-rose/95">Reservado por </span>
                                    <span className="text-espresso/70">{gift.reservedByName}</span>
                                  </>
                                )
                              }

                              if (isReservedByCurrentGuest) {
                                return (
                                  <>
                                    <span className="text-muted-rose/95">Reservado por </span>
                                    <span className="text-espresso">você</span>
                                  </>
                                )
                              }

                              return <span className="text-muted-rose/95">Alguém já escolheu este mimo</span>
                            })()}
                          </p>
                        ) : (
                          <p className="text-center py-1 font-accent text-sm text-warm-gray">
                            Recebido com carinho{' '}
                            <Heart className="size-3 inline" />
                          </p>
                        )}
                      </div>

                      {isHostView && (
                        <div className="flex flex-wrap justify-end gap-2 pt-3 mt-3 border-t border-border/70">
                          {gift.status === 'reserved' && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              isLoading={statusChangingGiftId === gift._id}
                              onClick={() =>
                                void handleSetGiftStatus(gift._id, 'received')
                              }
                            >
                              <Heart className="size-3.5" />
                              Marcar como recebido
                            </Button>
                          )}
                          {gift.status === 'received' && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              isLoading={statusChangingGiftId === gift._id}
                              onClick={() =>
                                void handleSetGiftStatus(gift._id, 'available')
                              }
                            >
                              Desfazer recebimento
                            </Button>
                          )}
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

            {(hasMoreGifts || isLoadingMoreGifts) && (
              <div ref={loadMoreTriggerRef} className="h-1 w-full" />
            )}

            {isLoadingMoreGifts && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={`gifts-loading-more-${i}`}
                    className="h-44 rounded-2xl bg-blush/25 animate-pulse"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ═══ RESERVATION MESSAGE DIALOG ═══ */}
      <Dialog
        open={reservationDialog !== null}
        onOpenChange={(open) => {
          if (!open) setReservationDialog(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>Reservar este presente</DialogTitle>
          <DialogDescription>
            {reservationDialog ? (
              <>
                Você vai reservar{' '}
                <span className="font-medium text-espresso">
                  {reservationDialog.giftName}
                </span>
                . Quer deixar uma mensagem para os anfitriões?
              </>
            ) : null}
          </DialogDescription>
          <div className="space-y-1.5 mt-2">
            <label className="block text-sm font-medium text-espresso/80">
              Mensagem (opcional)
            </label>
            <textarea
              value={reservationMessage}
              onChange={(e) => setReservationMessage(e.target.value)}
              placeholder="Ex.: Estamos torcendo muito por vocês!"
              rows={3}
              maxLength={400}
              className={cn(FORM_TEXTAREA_CLASS, 'resize-y')}
            />
            <p className="text-[11px] text-warm-gray/55 text-right">
              {reservationMessage.trim().length}/400
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReservationDialog(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className={PRIMARY_ACTION_CLASS}
              onClick={() => void handleConfirmReservation()}
            >
              Confirmar reserva
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* ═══ LOGIN TO RESERVE DIALOG ═══ */}
      <Dialog
        open={showReserveLoginPrompt}
        onOpenChange={(open) => setShowReserveLoginPrompt(open)}
      >
        <DialogContent className="max-w-sm text-center">
          <div className="flex justify-center mb-1">
            <div className="size-12 rounded-full bg-sage/20 flex items-center justify-center">
              <Gift className="size-5 text-sage" />
            </div>
          </div>
          <DialogTitle className="font-display italic text-2xl text-espresso">
            Entre para reservar
          </DialogTitle>
          <DialogDescription className="text-sm text-warm-gray/80 leading-relaxed pt-1">
            Faça login para escolher e reservar um presente. É rapidinho!
          </DialogDescription>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              className={PRIMARY_ACTION_CLASS}
              onClick={() => void handleSignInToReserve()}
            >
              Entrar com Google
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-warm-gray/60"
              onClick={() => setShowReserveLoginPrompt(false)}
            >
              Agora não
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ SHARE EVENT DIALOG ═══ */}
      <Dialog
        open={isShareDialogOpen}
        onOpenChange={(open) => {
          setIsShareDialogOpen(open)
          if (!open) {
            setDidCopyShareLink(false)
          }
        }}
      >
        <DialogContent className="max-w-sm text-center">
          <DialogTitle className="font-display italic text-2xl text-espresso">
            Compartilhar convite
          </DialogTitle>
          <DialogDescription className="text-sm text-warm-gray/80 leading-relaxed pt-1">
            Compartilhe este link com seus convidados para eles verem a lista de
            presentes e escolherem com carinho.
          </DialogDescription>

          <div className="rounded-xl border border-border/60 bg-warm-white p-3 mt-2">
            <Input readOnly value={guestShareUrl} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className={PRIMARY_ACTION_CLASS}
              onClick={() => void handleCopyShareLink()}
            >
              <Share2 className="size-3.5" />
              {didCopyShareLink ? 'Link copiado!' : 'Copiar link'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsShareDialogOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type PartnerInviteEntry = {
  _id: Id<'eventInvites'>
  token: string
  createdAt: number
  usedAt?: number
  revokedAt?: number
  status: 'active' | 'used' | 'revoked'
  usedByName?: string
  usedByEmail?: string
}

function formatInviteDate(timestamp: number) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}

function PartnerInviteSection({
  invites,
  activeInvite,
  hasUsedInvite,
  canSharePartnerInvite,
  buildInviteUrl,
  copiedInviteToken,
  revokingInviteId,
  isGeneratingInvite,
  isRotatingInvite,
  error,
  onGenerate,
  onCopy,
  onRevoke,
  onRotate,
}: {
  invites: Array<PartnerInviteEntry> | undefined
  activeInvite: PartnerInviteEntry | null
  hasUsedInvite: boolean
  canSharePartnerInvite: boolean
  buildInviteUrl: (token: string) => string
  copiedInviteToken: string | null
  revokingInviteId: Id<'eventInvites'> | null
  isGeneratingInvite: boolean
  isRotatingInvite: boolean
  error: string | null
  onGenerate: () => void | Promise<void>
  onCopy: (token: string) => void | Promise<void>
  onRevoke: (inviteId: Id<'eventInvites'>) => void | Promise<void>
  onRotate: () => void | Promise<void>
}) {
  const audienceHint = canSharePartnerInvite
    ? 'para o outro anfitrião'
    : 'para quem vai coorganizar'

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-muted-rose/30 bg-blush/15 p-4 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-rose/90 font-medium">
          Como funciona
        </p>
        <ul className="text-sm text-espresso/85 leading-relaxed space-y-1.5 list-disc pl-5 marker:text-muted-rose/70">
          <li>
            Compartilhe o link <strong>{audienceHint}</strong>. Quem abrir e
            entrar com a conta Google vira coanfitrião e pode editar tudo.
          </li>
          <li>
            <strong>Não pedimos código nem confirmação extra</strong> — quem
            tiver o link consegue aceitar. Envie só para a pessoa certa.
          </li>
          <li>
            Cada link funciona <strong>uma única vez</strong>. Depois que for
            usado, perde a validade automaticamente.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="font-display italic text-base text-espresso">
          Seus links de convite
        </h5>
        {invites && invites.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant={activeInvite ? 'ghost' : 'default'}
            onClick={() => {
              if (activeInvite) {
                void onRotate()
              } else {
                void onGenerate()
              }
            }}
            isLoading={isRotatingInvite || isGeneratingInvite}
          >
            {activeInvite ? 'Gerar novo link' : 'Gerar link'}
          </Button>
        ) : null}
      </div>

      {invites === undefined ? (
        <p className="text-sm text-warm-gray/60">Carregando convites...</p>
      ) : invites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-muted-rose/30 bg-warm-white/70 p-5 text-center space-y-3">
          <p className="text-sm text-warm-gray/80">
            Você ainda não gerou nenhum link de convite.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => void onGenerate()}
            isLoading={isGeneratingInvite}
          >
            Gerar primeiro link
          </Button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {invites.map((invite) => {
            const url = buildInviteUrl(invite.token)
            const isCopied = copiedInviteToken === invite.token
            const isRevoking = revokingInviteId === invite._id
            const statusBadge =
              invite.status === 'active'
                ? {
                    label: 'Pendente',
                    className: 'bg-sage/25 text-espresso border-sage/40',
                  }
                : invite.status === 'used'
                  ? {
                      label: 'Aceito',
                      className:
                        'bg-muted-rose/25 text-espresso border-muted-rose/45',
                    }
                  : {
                      label: 'Revogado',
                      className: 'bg-warm-gray/15 text-warm-gray border-warm-gray/30',
                    }
            const acceptedBy =
              invite.status === 'used'
                ? (invite.usedByName ?? invite.usedByEmail ?? '')
                : ''
            const subline =
              invite.status === 'used' && invite.usedAt
                ? acceptedBy
                  ? `Aceito por ${acceptedBy} em ${formatInviteDate(invite.usedAt)}`
                  : `Aceito em ${formatInviteDate(invite.usedAt)}`
                : invite.status === 'revoked' && invite.revokedAt
                  ? `Revogado em ${formatInviteDate(invite.revokedAt)}`
                  : `Criado em ${formatInviteDate(invite.createdAt)}`
            return (
              <li
                key={invite._id}
                className="rounded-xl border border-muted-rose/25 bg-warm-white/90 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
                      statusBadge.className,
                    )}
                  >
                    {statusBadge.label}
                  </span>
                  <span className="text-xs text-warm-gray/70 truncate min-w-0">
                    {subline}
                  </span>
                </div>

                {invite.status === 'active' && (
                  <>
                    <Input
                      readOnly
                      value={url}
                      className="text-xs w-full"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void onCopy(invite.token)}
                      >
                        {isCopied ? 'Link copiado!' : 'Copiar link'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => void onRevoke(invite._id)}
                        isLoading={isRevoking}
                      >
                        Revogar
                      </Button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {hasUsedInvite && (
        <p className="text-[11px] text-warm-gray/55 leading-relaxed">
          Convites utilizados ficam no histórico apenas para sua referência —
          eles não podem mais ser reaproveitados.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

const STATUS_LABELS: Record<'available' | 'reserved' | 'received', string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  received: 'Recebido',
}

type HostReservationEntry = {
  _id: Id<'gifts'>
  name: string
  status: 'available' | 'reserved' | 'received'
  reservedAt?: number
  reservationMessage?: string
  guestUserId?: Id<'users'>
  guestName?: string
  guestImageUrl?: string
}

function formatReservationDate(timestamp?: number) {
  if (!timestamp) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(timestamp))
  } catch {
    return ''
  }
}

function HostReservationsPanel({
  reservations,
  isOpen,
  onToggle,
}: {
  reservations: Array<HostReservationEntry>
  isOpen: boolean
  onToggle: () => void
}) {
  const withMessage = reservations.filter((r) => r.reservationMessage?.trim())
  const withoutMessage = reservations.filter((r) => !r.reservationMessage?.trim())

  return (
    <motion.div
      layout
      className="mb-10 relative overflow-hidden rounded-[2rem] border border-muted-rose/25 bg-gradient-to-br from-warm-white via-blush/8 to-sage/8 shadow-dreamy-md"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-muted-rose/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-sage/10 blur-3xl"
      />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="relative z-10 w-full flex items-center justify-between gap-4 px-6 sm:px-8 py-6 text-left cursor-pointer"
      >
        <div className="flex items-start gap-4 min-w-0">
          <div className="shrink-0 size-11 rounded-full bg-warm-white/90 border border-muted-rose/30 flex items-center justify-center shadow-sm">
            <Sparkles className="size-5 text-muted-rose" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-accent text-xl text-muted-rose leading-none">
                recadinhos pra vocês
              </p>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-warm-white/85 border border-muted-rose/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-rose/85"
                title="Só os anfitriões enxergam essa área"
              >
                <Lock className="size-3" />
                Só anfitriões
              </span>
            </div>
            <p className="font-display italic text-2xl text-espresso mt-1 leading-tight">
              {reservations.length} convidado
              {reservations.length === 1 ? ' já escolheu um mimo' : 's já escolheram um mimo'}
            </p>
            <p className="text-sm text-warm-gray/80 mt-1">
              {withMessage.length > 0
                ? `${withMessage.length} mensage${withMessage.length === 1 ? 'm' : 'ns'} carinhosa${withMessage.length === 1 ? '' : 's'} pra você ler.`
                : 'Toque para ver quem reservou cada presente.'}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0 size-9 rounded-full bg-warm-white/80 border border-muted-rose/25 flex items-center justify-center text-muted-rose"
        >
          <ChevronDown className="size-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 overflow-hidden"
          >
            <div className="px-6 sm:px-8 pb-8 space-y-6">
              {withMessage.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Heart className="size-3.5 text-muted-rose" />
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-rose/85 font-medium">
                      Com mensagem
                    </p>
                    <div className="flex-1 h-px bg-gradient-to-r from-muted-rose/25 via-muted-rose/10 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {withMessage.map((reservation) => (
                      <ReservationMessageCard
                        key={reservation._id}
                        reservation={reservation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {withoutMessage.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="size-3.5 text-sage" />
                    <p className="text-[11px] uppercase tracking-[0.2em] text-sage/85 font-medium">
                      Sem mensagem
                    </p>
                    <div className="flex-1 h-px bg-gradient-to-r from-sage/25 via-sage/10 to-transparent" />
                  </div>
                  <ul className="space-y-2.5">
                    {withoutMessage.map((reservation) => (
                      <li
                        key={reservation._id}
                        className="flex items-center gap-3 rounded-xl border border-border/40 bg-warm-white/70 px-3 py-2.5"
                      >
                        <UserAvatar
                          src={reservation.guestImageUrl}
                          name={reservation.guestName}
                          className="size-9 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-espresso truncate">
                            <span className="font-medium">
                              {reservation.guestName || 'Convidado'}
                            </span>{' '}
                            <span className="text-warm-gray/80">reservou</span>{' '}
                            <span className="font-medium">
                              {reservation.name}
                            </span>
                          </p>
                          {reservation.reservedAt && (
                            <p className="text-[11px] text-warm-gray/55 mt-0.5">
                              {formatReservationDate(reservation.reservedAt)}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ReservationMessageCard({
  reservation,
}: {
  reservation: HostReservationEntry
}) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35 } }}
      className="relative rounded-2xl border border-muted-rose/25 bg-warm-white/95 shadow-dreamy px-5 pt-5 pb-4 overflow-hidden"
    >
      <span
        aria-hidden
        className="absolute -top-2 left-5 font-display italic text-[3.5rem] leading-none text-muted-rose/25 select-none"
      >
        “
      </span>
      <div className="relative pl-6">
        <p className="font-accent text-lg text-espresso/90 leading-relaxed">
          {reservation.reservationMessage}
        </p>
      </div>
      <div className="mt-4 pt-3 border-t border-dashed border-muted-rose/25 flex items-center gap-3">
        <UserAvatar
          src={reservation.guestImageUrl}
          name={reservation.guestName}
          className="size-9 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-espresso truncate">
            {reservation.guestName || 'Convidado'}
          </p>
          <p className="text-[11px] text-warm-gray/70 truncate">
            reservou{' '}
            <span className="text-espresso/80">{reservation.name}</span>
            {reservation.reservedAt && (
              <>
                {' '}·{' '}
                <span className="text-warm-gray/55">
                  {formatReservationDate(reservation.reservedAt)}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </motion.article>
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
            {/* bed frame — top-down view */}
            <rect x="22" y="14" width="76" height="92" rx="6" />
            {/* headboard band at the top */}
            <path d="M 22 36 L 98 36" />
            {/* left pillow */}
            <rect x="26" y="18" width="30" height="14" rx="5" />
            {/* right pillow */}
            <rect x="62" y="18" width="30" height="14" rx="5" />
            {/* blanket fold curve */}
            <path d="M 24 58 Q 60 52 96 58" />
            {/* blanket lower folds */}
            <path d="M 26 74 L 94 74" strokeOpacity="0.4" />
            <path d="M 26 88 L 94 88" strokeOpacity="0.4" />
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
