#!/usr/bin/env node
// Gera src/content/giftInsights.ts: o levantamento "presentes mais pedidos"
// a partir das listas reais do MyWish em produção.
//
//   node scripts/dados-presentes.mjs            # lê a produção pelo `npx convex data --prod`
//   node scripts/dados-presentes.mjs <pasta>    # lê events.jsonl e gifts.jsonl já baixados
//
// Só saem números agregados: nenhum nome de pessoa, evento, link ou texto
// livre. Um item só aparece quando está em pelo menos MIN_LISTS listas
// diferentes. Rodar de novo todo mês mantém a página /dados atualizada.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MIN_GIFTS_PER_LIST = 5
const MIN_LISTS = 5
const TOP = 25

// Ordem importa: a primeira regra que casar com o nome normalizado vence.
const ITEMS = [
  ['Panela de pressão', /panela de pressao|pressao/],
  ['Jogo de panelas', /(jogo|conjunto|kit|set) de panela|panelas/],
  ['Frigideira', /frigideira/],
  ['Liquidificador', /liquidificador/],
  ['Batedeira', /batedeira/],
  ['Mixer', /mixer/],
  ['Air fryer', /air ?fryer|fritadeira/],
  ['Sanduicheira', /sanduicheira|\bgrill\b/],
  ['Cafeteira', /cafeteira|maquina de cafe/],
  ['Chaleira elétrica', /chaleira/],
  ['Micro-ondas', /micro ?ondas/],
  ['Forno elétrico', /forno eletrico/],
  ['Garrafa térmica', /garrafa termica/],
  ['Escorredor de macarrão', /escorredor de (macarrao|massa)/],
  ['Escorredor de louça', /escorredor de lou|escorredor$|escorredor de prato/],
  ['Tábua de passar', /tabua de passar/],
  ['Tábua de corte', /tabua/],
  ['Jogo de facas', /(jogo|kit|conjunto) de faca|facas/],
  ['Faqueiro e talheres', /faqueiro|talher/],
  [
    'Jogo de pratos',
    /prato(?! de)|aparelho de jantar|jogo de jantar/,
  ],
  ['Jogo de copos', /\bcopos?\b/],
  ['Xícaras e canecas', /xicara|caneca/],
  ['Jogo de taças', /\btacas?\b/],
  ['Jogo americano', /jogo americano|lugar americano/],
  ['Toalha de mesa', /toalha de mesa|trilho de mesa/],
  ['Pano de prato', /pano de prato|panos de prato/],
  ['Potes herméticos', /\bpotes?\b|mantimento/],
  ['Porta-temperos', /tempero/],
  ['Formas e assadeiras', /\bformas?\b|assadeira|travessa|refrataria/],
  ['Ralador', /ralador/],
  ['Jarra', /\bjarras?\b/],
  ['Boleira', /boleira/],
  ['Fruteira', /fruteira/],
  ['Peneira', /peneira/],
  ['Utensílios de cozinha', /utensilio|espatula|concha/],
  ['Lixeira', /lixeira/],
  ['Ferro de passar', /ferro de passar|ferro a vapor/],
  ['Cesto de roupa', /\bcestos?\b/],
  ['Varal', /\bvaral\b/],
  ['Aspirador de pó', /aspirador/],
  [
    'Mop, rodo e vassoura',
    /\bmop\b|\brodo\b|vassoura|\bbaldes?\b|pano de chao/,
  ],
  ['Ventilador', /ventilador/],
  ['Cabides', /cabide/],
  [
    'Jogo de cama e lençóis',
    /jogo de cama|lencol|cobre leito|cama posta|colcha/,
  ],
  ['Edredom, manta ou cobertor', /edredom|\bmantas?\b|cobertor/],
  ['Travesseiros', /travesseiro/],
  ['Toalhas de banho', /toalha|toalhas/],
  ['Tapete', /tapete/],
  ['Kit banheiro', /kit banheiro|jogo de banheiro|kit de banheiro/],
  ['Cortina', /cortina/],
]

const OCCASIONS = {
  housewarming: 'chaDeCasaNova',
  'bridal-shower': 'chaDePanela',
}

const STORES = [
  ['Shopee', /shopee|shp\.ee/],
  ['Mercado Livre', /mercadolivre|mercadolibre|meli\.la/],
  ['Amazon', /amazon\.|amzn\.|(^|\/\/)a\.co\//],
  ['Magazine Luiza', /magazineluiza|magalu/],
  ['Shein', /shein/],
]

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classify(name) {
  const n = normalize(name)
  for (const [label, re] of ITEMS) if (re.test(n)) return label
  return null
}

function readTable(dir, table) {
  const text = dir
    ? readFileSync(join(dir, `${table}.jsonl`), 'utf8')
    : execFileSync(
        'npx',
        [
          'convex',
          'data',
          table,
          '--prod',
          '--limit',
          '50000',
          '--format',
          'jsonLines',
        ],
        { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
      )
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

const round = (value) => Math.round(value * 100)
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] ?? 0
}

const dir = process.argv[2]
const events = new Map(readTable(dir, 'events').map((e) => [e._id, e]))
const gifts = readTable(dir, 'gifts')

const giftsByList = new Map()
for (const gift of gifts) {
  if (!events.has(gift.eventId)) continue
  const list = giftsByList.get(gift.eventId) ?? []
  list.push(gift)
  giftsByList.set(gift.eventId, list)
}

const isReserved = (g) => g.status === 'reserved' || g.status === 'received'
const lists = [...giftsByList].filter(([, g]) => g.length >= MIN_GIFTS_PER_LIST)
const sharedLists = lists.filter(([, g]) => g.some(isReserved))

function summarize(entries) {
  const shared = entries.filter(([, g]) => g.some(isReserved))
  const perItem = new Map()
  for (const [listId, listGifts] of entries) {
    const isShared = listGifts.some(isReserved)
    for (const gift of listGifts) {
      const label = classify(gift.name)
      if (!label) continue
      const item = perItem.get(label) ?? {
        lists: new Set(),
        sharedGifts: 0,
        reservedGifts: 0,
      }
      item.lists.add(listId)
      if (isShared) {
        item.sharedGifts++
        if (isReserved(gift)) item.reservedGifts++
      }
      perItem.set(label, item)
    }
  }
  const items = [...perItem]
    .filter(([, i]) => i.lists.size >= MIN_LISTS)
    .map(([name, i]) => ({
      name,
      listShare: round(i.lists.size / entries.length),
      reservedShare:
        i.sharedGifts >= 10 ? round(i.reservedGifts / i.sharedGifts) : null,
    }))
    .sort((a, b) => b.listShare - a.listShare || a.name.localeCompare(b.name))
    .slice(0, TOP)
  const sharedGifts = shared.flatMap(([, g]) => g)
  return {
    lists: entries.length,
    medianGifts: median(entries.map(([, g]) => g.length)),
    reservedShare: sharedGifts.length
      ? round(sharedGifts.filter(isReserved).length / sharedGifts.length)
      : 0,
    items,
  }
}

const byOccasion = {}
for (const [type, key] of Object.entries(OCCASIONS))
  byOccasion[key] = summarize(
    lists.filter(([id]) => events.get(id).eventType === type),
  )

const allGifts = lists.flatMap(([, g]) => g)
const withLink = allGifts.filter((g) => g.referenceUrl)
const stores = STORES.map(([name, re]) => ({
  name,
  share: round(
    withLink.filter((g) => re.test(g.referenceUrl)).length / withLink.length,
  ),
}))

const dates = lists.map(([id]) => events.get(id)._creationTime)
const month = (ms) => new Date(ms).toISOString().slice(0, 7)

const insights = {
  generatedAt: new Date().toISOString().slice(0, 10),
  period: { from: month(Math.min(...dates)), to: month(Math.max(...dates)) },
  lists: lists.length,
  sharedLists: sharedLists.length,
  gifts: allGifts.length,
  medianGifts: median(lists.map(([, g]) => g.length)),
  linkShare: round(withLink.length / allGifts.length),
  stores,
  occasions: byOccasion,
}

const out = `// Gerado por scripts/dados-presentes.mjs em ${insights.generatedAt}. Não editar à mão.
// Números agregados e anônimos das listas do MyWish (ver /dados/presentes-mais-pedidos).

export type GiftInsightItem = {
  name: string
  /** % das listas da ocasião que incluem o item */
  listShare: number
  /** % desses presentes reservados por convidados, nas listas já compartilhadas (null = amostra pequena) */
  reservedShare: number | null
}

export type OccasionInsights = {
  lists: number
  medianGifts: number
  reservedShare: number
  items: GiftInsightItem[]
}

export const giftInsights = ${JSON.stringify(insights, null, 2)} as const satisfies {
  generatedAt: string
  period: { from: string; to: string }
  lists: number
  sharedLists: number
  gifts: number
  medianGifts: number
  linkShare: number
  stores: Array<{ name: string; share: number }>
  occasions: Record<'chaDeCasaNova' | 'chaDePanela', OccasionInsights>
}
`
writeFileSync(new URL('../src/content/giftInsights.ts', import.meta.url), out)
console.log(
  `giftInsights: ${insights.lists} listas, ${insights.gifts} presentes, período ${insights.period.from} a ${insights.period.to}`,
)
