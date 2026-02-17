import { createFileRoute } from '@tanstack/react-router'
import { useAuthActions } from '@convex-dev/auth/react'
import { useMutation } from 'convex/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useEventCreationStore } from '../store/eventCreationStore'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { DatePicker } from '../components/ui/date-picker'

// Página dedicada (opcional) para o fluxo de criação/edição do evento.
// Dependendo do design, parte desse fluxo pode ficar na própria home (/),
// mas esta rota existe para:
// - Ter um espaço mais focado de "wizard" de criação do evento;
// - Consumir e editar o estado do eventCreationStore;
// - Depois do login Google, redirecionar o usuário para cá para finalizar
//   a criação (chamando as mutations Convex).
//
// Fluxo esperado:
// - Usuário (possível host) chega na home e escolhe "Criar meu evento".
// - Navegamos para /events/create.
// - Ele preenche:
//   - dados básicos do evento (draftEvent no store);
//   - adiciona alguns gifts locais (draftGifts no store).
// - Ao clicar em "finalizar / publicar", se não estiver logado:
//   - disparamos login com Google;
//   - após login, recuperamos o estado do store;
//   - chamamos createEvent + createGift(s);
//   - então redirecionamos para a página pública do evento (/events/$slug)
//     ou para uma página de dashboard de host, dependendo do design futuro.

export const Route = createFileRoute('/events/create')({
  component: EventCreatePageShell,
})

function EventCreatePageShell() {
  const navigate = Route.useNavigate()
  const { signIn } = useAuthActions()
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser()
  const createEvent = useMutation(api.events.createEvent)
  const createGift = useMutation(api.gifts.createGift)

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

  const availableGiftCategories = useMemo(
    () => [...DEFAULT_GIFT_CATEGORIES, ...customGiftCategories],
    [customGiftCategories],
  )

  const eventData = useMemo(
    () =>
      draftEvent ?? {
        name: '',
        partnerOneName: '',
        partnerTwoName: '',
        createdByPartner: 'partnerOne' as const,
        date: '',
        location: '',
        description: '',
      },
    [draftEvent],
  )

  useEffect(() => {
    if (!draftEvent) {
      setDraftEvent(eventData)
    }
  }, [draftEvent, eventData, setDraftEvent])

  const updateEvent = useCallback(
    (patch: Partial<typeof eventData>) => {
      setDraftEvent({
        ...eventData,
        ...patch,
      })
    },
    [eventData, setDraftEvent],
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

    if (!draftEvent.partnerOneName.trim() || !draftEvent.partnerTwoName.trim()) {
      setError('Informe os nomes do casal.')
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
        name: draftEvent.name.trim(),
        partnerOneName: draftEvent.partnerOneName.trim(),
        partnerTwoName: draftEvent.partnerTwoName.trim(),
        createdByPartner: draftEvent.createdByPartner,
        date: draftEvent.date?.trim() || undefined,
        location: draftEvent.location?.trim() || undefined,
        description: draftEvent.description?.trim() || undefined,
      })

      for (const draftGift of draftGifts) {
        await createGift({
          eventId,
          name: draftGift.name.trim(),
          description: draftGift.description?.trim() || undefined,
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
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div className="text-center space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-warm-gray">novo evento</p>
        <h1 className="font-display italic text-4xl md:text-5xl text-espresso">
          Criar lista de presentes
        </h1>
        <p className="text-warm-gray max-w-2xl mx-auto">
          Preencha os dados principais, adicione os presentes e publique quando estiver pronto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do evento</CardTitle>
          <CardDescription>
            Essas informações serão usadas na página pública do evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do evento"
              value={eventData.name}
              onChange={(event) => updateEvent({ name: event.target.value })}
              placeholder="Ex.: Chá de Casa Nova"
            />
            <Input
              label="Parceiro(a) 1"
              value={eventData.partnerOneName}
              onChange={(event) =>
                updateEvent({ partnerOneName: event.target.value })
              }
              placeholder="Nome da pessoa 1"
            />
            <Input
              label="Parceiro(a) 2"
              value={eventData.partnerTwoName}
              onChange={(event) =>
                updateEvent({ partnerTwoName: event.target.value })
              }
              placeholder="Nome da pessoa 2"
            />
            <Input
              label="Local (opcional)"
              value={eventData.location ?? ''}
              onChange={(event) => updateEvent({ location: event.target.value })}
              placeholder="Cidade, bairro ou referência"
            />
            <DatePicker
              label="Data (opcional)"
              value={eventData.date ?? ''}
              onChange={(value) => updateEvent({ date: value })}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-espresso/80 pl-0.5">
              Qual dos membros do casal e voce?
            </p>
            <p className="text-xs text-warm-gray">
              O outro membro sera convidado depois automaticamente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={
                eventData.createdByPartner === 'partnerOne' ? 'default' : 'secondary'
              }
              size="sm"
              onClick={() => updateEvent({ createdByPartner: 'partnerOne' })}
            >
              Eu sou: {eventData.partnerOneName || 'Parceiro(a) 1'}
            </Button>
            <Button
              type="button"
              variant={
                eventData.createdByPartner === 'partnerTwo' ? 'default' : 'secondary'
              }
              size="sm"
              onClick={() => updateEvent({ createdByPartner: 'partnerTwo' })}
            >
              Eu sou: {eventData.partnerTwoName || 'Parceiro(a) 2'}
            </Button>
          </div>
          <Input
            label="Descrição (opcional)"
            value={eventData.description ?? ''}
            onChange={(event) => updateEvent({ description: event.target.value })}
            placeholder="Conte um pouco sobre esse momento"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presentes</CardTitle>
          <CardDescription>
            Comece com uma lista inicial. Depois você pode ajustar com calma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do presente"
              value={giftName}
              onChange={(event) => setGiftName(event.target.value)}
              placeholder="Ex.: Jogo de panelas"
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-espresso/80 pl-0.5">
                Categoria (opcional)
              </label>
              <select
                value={giftCategory}
                onChange={(event) => setGiftCategory(event.target.value)}
                className="flex w-full rounded-xl border border-border bg-warm-white px-4 py-3 text-base text-espresso transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="">Sem categoria</option>
                {availableGiftCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
                <option value="__custom__">Criar categoria personalizada...</option>
              </select>
            </div>
            {giftCategory === '__custom__' ? (
              <div className="md:col-span-2 flex flex-col md:flex-row gap-2">
                <Input
                  value={customCategoryInput}
                  onChange={(event) => setCustomCategoryInput(event.target.value)}
                  placeholder="Ex.: Área gourmet"
                  label="Nova categoria"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="md:self-end"
                  onClick={handleAddCustomCategory}
                >
                  Salvar categoria
                </Button>
              </div>
            ) : null}
            <Input
              label="Descrição (opcional)"
              value={giftDescription}
              onChange={(event) => setGiftDescription(event.target.value)}
              placeholder="Detalhes que ajudam o convidado"
            />
            <Input
              label="Link de referência (opcional)"
              value={giftReferenceUrl}
              onChange={(event) => setGiftReferenceUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button type="button" variant="outline" onClick={handleAddGift}>
            <Plus className="size-4" />
            Adicionar presente
          </Button>

          <div className="space-y-3">
            {draftGifts.length === 0 ? (
              <p className="text-sm text-warm-gray">Nenhum presente adicionado ainda.</p>
            ) : (
              draftGifts.map((gift) => (
                <div
                  key={gift.tempId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/50 p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-espresso">{gift.name}</p>
                    {gift.description ? (
                      <p className="text-sm text-warm-gray">{gift.description}</p>
                    ) : null}
                    <div className="flex items-center gap-2">
                      {gift.category ? <Badge variant="outline">{gift.category}</Badge> : null}
                      {gift.referenceUrl ? (
                        <a
                          className="text-xs text-muted-rose hover:underline"
                          href={gift.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Referência
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => removeDraftGift(gift.tempId)}
                    aria-label="Remover presente"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
          {error}
        </p>
      ) : null}
      {createdSlug ? (
        <p className="text-sm text-espresso bg-blush/20 border border-muted-rose/30 rounded-xl px-4 py-3">
          Evento criado com sucesso. Codigo do evento: <span className="font-medium">{createdSlug}</span>
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button size="lg" onClick={() => void handlePublishClick()} isLoading={isPublishing}>
          Finalizar e publicar evento
        </Button>
      </div>
    </div>
  )
}

const DEFAULT_GIFT_CATEGORIES: string[] = [
  'Cozinha',
  'Quarto',
  'Sala',
  'Banheiro',
  'Decoracao',
  'Eletro',
]

