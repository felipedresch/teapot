// Página de desenvolvimento (/dev/sugestoes) com os componentes reais das
// sugestões da Shopee e as fixtures de src/dev/shopeeFixtures.ts, em todos os
// estados. Serve para conferir o visual sem login (o de produção é Google) e
// sem credenciais da Shopee. Só existe com `npm run dev`.
import { useMemo, useState } from 'react'
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react'
import { GiftSuggestions } from '../components/gift-suggestions/GiftSuggestions'
import type {
  SuggestionIdeaView,
  SuggestionProduct,
} from '../components/gift-suggestions/types'
import { AffiliateDisclosureNote } from '../components/GiftReferenceLink'
import { Button } from '../components/ui/button'
import { parseProductOffers } from '../../convex/lib/shopeeAffiliateApi'
import { rankSuggestions } from '../../convex/lib/suggestionRanking'
import { SUGGESTION_OCCASIONS } from '../../convex/lib/suggestionIdeas'
import { giftInsights } from '../content/giftInsights'
import { SHOPEE_FIXTURE_RESPONSES } from './shopeeFixtures'
import { FIXTURE_IMAGES } from './fixtureImages'

const DISCLOSURE = { enabled: true, amazon: false, shopee: true }

const SHARES = Object.fromEntries(
  giftInsights.occasions.chaDeCasaNova.items.map((i) => [i.name, i.listShare]),
)

// Ideias de casa nova: as que têm resposta de exemplo passam pelo mesmo
// ranking do cron; as outras ficam sem produto (estado "sem resultados").
function buildIdeas(options: { brokenImages?: boolean } = {}) {
  return SUGGESTION_OCCASIONS.casaNova.ideas.map((idea): SuggestionIdeaView => {
    const response = SHOPEE_FIXTURE_RESPONSES[idea.keyword]
    const products = response
      ? rankSuggestions(parseProductOffers(response)).map((p) => ({
          slot: p.slot,
          itemId: p.itemId,
          name: p.name,
          imageUrl: options.brokenImages
            ? p.imageUrl
            : (FIXTURE_IMAGES[p.itemId] ?? p.imageUrl),
          price: p.price,
          rating: p.rating ?? undefined,
          sales: p.sales ?? undefined,
          productLink: p.productLink,
        }))
      : []
    return {
      ideaId: idea.id,
      label: idea.label,
      category: idea.category,
      products,
    }
  })
}

function Frame({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} data-shot={id} className="space-y-3">
      <p className="text-[10.5px] uppercase tracking-[0.22em] text-muted-rose/80">
        {title}
      </p>
      {children}
    </section>
  )
}

export default function SuggestionsPlayground() {
  const ideas = useMemo(() => buildIdeas(), [])
  const brokenIdeas = useMemo(() => buildIdeas({ brokenImages: true }), [])
  const [added, setAdded] = useState<string | null>(null)
  const [lastAdded, setLastAdded] = useState<SuggestionProduct | null>(null)

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-10 sm:px-6">
      <header>
        <p className="font-accent text-xl text-muted-rose">
          só em desenvolvimento
        </p>
        <h1 className="font-display italic text-3xl text-espresso">
          Sugestões da Shopee
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          Componentes reais com dados de exemplo. Imagens ilustrativas.
        </p>
      </header>

      <Frame id="aberto" title="Anfitrião · chip aberto">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={ideas}
          listShares={SHARES}
          disclosure={DISCLOSURE}
          defaultIdeaId="potes-hermeticos"
          addedItemIds={new Set(added ? [added] : [])}
          onAdd={(product) => {
            setAdded(product.itemId)
            setLastAdded(product)
          }}
        />
        {lastAdded ? (
          <p className="text-xs text-warm-gray">
            Formulário recebeu: <b>{lastAdded.name}</b> ·{' '}
            {lastAdded.productLink}
          </p>
        ) : null}
      </Frame>

      <Frame id="adicionado" title="Anfitrião · depois de Adicionar">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={ideas}
          listShares={SHARES}
          disclosure={DISCLOSURE}
          defaultIdeaId="jogo-pratos"
          addedItemIds={new Set(['202'])}
          onAdd={() => {}}
        />
      </Frame>

      <Frame id="inicial" title="Anfitrião · nenhum chip escolhido">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={ideas}
          listShares={SHARES}
          disclosure={DISCLOSURE}
          onAdd={() => {}}
        />
      </Frame>

      <Frame id="carregando" title="Anfitrião · carregando">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={undefined}
          disclosure={DISCLOSURE}
          onAdd={() => {}}
        />
      </Frame>

      <Frame id="sem-resultados" title="Anfitrião · ideia sem resultados">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={ideas}
          listShares={SHARES}
          disclosure={DISCLOSURE}
          defaultIdeaId="tapete"
          onAdd={() => {}}
        />
      </Frame>

      <Frame id="imagem-quebrada" title="Anfitrião · imagem quebrada">
        <GiftSuggestions
          occasionLabel="chá de casa nova"
          ideas={brokenIdeas}
          listShares={SHARES}
          disclosure={DISCLOSURE}
          defaultIdeaId="toalhas-banho"
          onAdd={() => {}}
        />
      </Frame>

      <Frame id="convidado" title="Convidado · presente sem link">
        <div className="max-w-xs rounded-2xl border border-gift-available/20 bg-gift-available/10 p-5 flex flex-col min-h-[20rem]">
          <div className="mb-3 h-36 rounded-xl border border-border/95 bg-blush/20" />
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display italic text-xl text-espresso">
              Jarra de vidro
            </h3>
            <span className="rounded-full border border-sage/40 bg-sage/15 px-2.5 py-0.5 text-xs">
              Disponível
            </span>
          </div>
          <p className="mt-2 text-sm text-warm-gray">Para suco, de 1 litro</p>
          <div className="mt-1 min-h-6">
            <a
              className="inline-flex items-center gap-1 text-xs text-warm-gray/80 hover:text-espresso hover:underline underline-offset-2"
              href="#convidado"
            >
              <ShoppingBag className="size-3" strokeWidth={1.8} />
              Ver opções na Shopee
            </a>
          </div>
          <div className="mt-auto">
            <Button size="sm" className="w-full">
              <Heart className="size-3.5" />
              Quero presentear
            </Button>
          </div>
        </div>
        <div className="max-w-xs">
          <a
            className="inline-flex items-center gap-1 text-xs font-semibold text-espresso/85"
            href="#convidado"
          >
            Ver referência
            <ArrowRight className="size-3" />
          </a>
        </div>
        <AffiliateDisclosureNote
          disclosure={DISCLOSURE}
          className="text-[11px] leading-relaxed text-warm-gray/60"
        />
      </Frame>
    </div>
  )
}
