import { createAccount } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from '../_generated/server'
import { isDevelopmentDeployment } from '../lib/deployment'

// Seed do Convex de preview de cada branch: scripts/cloudflare/preview-build.sh
// roda `--preview-run dev/previewSeed:run` logo depois de criar o deployment.
// Cria o login de teste abaixo (o "Entrar" dos previews, src/lib/signIn.ts),
// anfitrião do casamento público "Ana & Bruno", com presentes livres,
// reservados e recebidos, e de um aniversário ainda em rascunho, sem pagamento
// (o paywall). Um convidado sem login tem o chá de bebê "Carla", onde o
// login de teste reservou um presente (a tela "Reservados"). Só dado de teste
// mora aqui.
const PREVIEW_HOST = {
  email: 'preview@mywish.test',
  password: 'Preview-MyWish-2026',
  name: 'Ana Preview',
}
const PREVIEW_GUEST = {
  email: 'convidado@mywish.test',
  name: 'Carla Convidada',
}
// A foto do evento de exemplo da página inicial. Sem ela, o casamento não
// aparece na vitrine de listas públicas, que só mostra evento com foto.
const COVER_URL = 'https://mywish.com.br/example-event.png'

export const run = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!isDevelopmentDeployment()) throw new Error('Development only')
    const { user: host } = await createAccount(ctx, {
      provider: 'password',
      account: { id: PREVIEW_HOST.email, secret: PREVIEW_HOST.password },
      profile: { email: PREVIEW_HOST.email, name: PREVIEW_HOST.name },
    })
    const { user: guest } = await createAccount(ctx, {
      provider: 'password',
      account: { id: PREVIEW_GUEST.email },
      profile: { email: PREVIEW_GUEST.email, name: PREVIEW_GUEST.name },
    })
    let coverImageId: Id<'_storage'> | undefined
    try {
      const response = await fetch(COVER_URL)
      if (response.ok)
        coverImageId = await ctx.storage.store(await response.blob())
    } catch {
      // Sem a foto o seed segue: só a vitrine da página inicial fica vazia.
    }
    await ctx.runMutation(internal.dev.previewSeed.createEvents, {
      hostId: host._id,
      guestId: guest._id,
      coverImageId,
    })
    return null
  },
})

type Gift = {
  name: string
  category: string
  description?: string
  status?: 'reserved' | 'received'
  message?: string
}

export const createEvents = internalMutation({
  args: {
    hostId: v.id('users'),
    guestId: v.id('users'),
    coverImageId: v.optional(v.id('_storage')),
  },
  returns: v.null(),
  handler: async (ctx, { hostId, guestId, coverImageId }) => {
    if (!isDevelopmentDeployment()) throw new Error('Development only')
    const wedding = await insertEvent(ctx, hostId, {
      name: 'Casamento Ana & Bruno',
      slug: 'casamento-ana-e-bruno',
      eventType: 'wedding',
      hosts: ['Ana', 'Bruno'],
      visibility: 'public',
      monetizationStatus: 'paid',
      date: '2027-03-20',
      location: 'Florianópolis, SC',
      description:
        'Lista de teste do preview. Escolha um presente e deixe um recado para os noivos.',
      coverImageId,
    })
    await insertGifts(ctx, wedding, guestId, [
      { name: 'Jogo de panelas inox', category: 'Cozinha' },
      { name: 'Cafeteira italiana', category: 'Cozinha' },
      {
        name: 'Liquidificador',
        category: 'Cozinha',
        status: 'reserved',
        message: 'Para os sucos de domingo. Felicidades!',
      },
      { name: 'Jogo de toalhas', category: 'Casa' },
      {
        name: 'Edredom queen',
        category: 'Casa',
        status: 'received',
        message: 'Que a casa nova seja quentinha.',
      },
      { name: 'Luminária de leitura', category: 'Casa' },
      {
        name: 'Jantar na lua de mel',
        category: 'Viagem',
        description: 'Uma noite especial no destino da lua de mel.',
      },
      { name: 'Passeio de barco', category: 'Viagem' },
    ])

    await insertEvent(ctx, hostId, {
      name: 'Aniversário de 30 anos da Ana',
      slug: 'aniversario-30-anos-da-ana',
      eventType: 'birthday',
      hosts: ['Ana'],
      visibility: 'draft',
      monetizationStatus: 'requires_payment',
      date: '2027-01-15',
    })

    const babyShower = await insertEvent(ctx, guestId, {
      name: 'Chá de bebê da Carla',
      slug: 'cha-de-bebe-da-carla',
      eventType: 'baby-shower',
      hosts: ['Carla'],
      visibility: 'public',
      monetizationStatus: 'paid',
      date: '2026-12-05',
      location: 'Porto Alegre, RS',
    })
    await insertGifts(ctx, babyShower, hostId, [
      {
        name: 'Carrinho de bebê',
        category: 'Passeio',
        status: 'reserved',
        message: 'Com carinho, Ana.',
      },
      { name: 'Kit de fraldas', category: 'Higiene' },
      { name: 'Body de algodão', category: 'Roupas' },
    ])
    return null
  },
})

async function insertEvent(
  ctx: MutationCtx,
  hostId: Id<'users'>,
  event: {
    name: string
    slug: string
    eventType: string
    hosts: Array<string>
    visibility: 'draft' | 'public'
    monetizationStatus: 'paid' | 'requires_payment'
    date: string
    location?: string
    description?: string
    coverImageId?: Id<'_storage'>
  },
) {
  const now = Date.now()
  const paid = event.monetizationStatus === 'paid'
  const eventId = await ctx.db.insert('events', {
    ...event,
    isPublic: event.visibility === 'public',
    partnerOneName: event.hosts[0] ?? '',
    partnerTwoName: event.hosts[1] ?? '',
    createdByUserId: hostId,
    createdByPartner: 'partnerOne',
    paidAt: paid ? now : undefined,
  })
  await ctx.db.insert('eventMembers', {
    userId: hostId,
    eventId,
    role: 'host',
    joinedAt: now,
  })
  return eventId
}

// Quem reservou entra no evento como convidado, como em gifts.reserveGift.
async function insertGifts(
  ctx: MutationCtx,
  eventId: Id<'events'>,
  reservedBy: Id<'users'>,
  gifts: Array<Gift>,
) {
  const now = Date.now()
  for (const gift of gifts) {
    await ctx.db.insert('gifts', {
      eventId,
      name: gift.name,
      description: gift.description,
      category: gift.category,
      status: gift.status ?? 'available',
      reservedBy: gift.status ? reservedBy : undefined,
      reservedAt: gift.status ? now : undefined,
      reservationMessage: gift.message,
    })
  }
  if (gifts.some((gift) => gift.status)) {
    await ctx.db.insert('eventMembers', {
      userId: reservedBy,
      eventId,
      role: 'guest',
      joinedAt: now,
    })
  }
}
