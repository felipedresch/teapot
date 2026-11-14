import { Link } from '@tanstack/react-router'
import { track } from '../integrations/posthog/events'

// Chamada para criar lista dentro dos artigos do blog, conforme o campo
// `occasion` do artigo (docs/BLOG.md). O post de ideias de aniversário, por
// exemplo, é citado pelo Copilot centenas de vezes por mês: quem chega por ali
// procura ideia de presente, e parte dessas pessoas vai fazer aniversário também.
export type BlogOccasion =
  | 'aniversario'
  | 'casamento'
  | 'cha-de-panela'
  | 'casa-nova'
  | 'cha-de-bebe'

const COPY: Record<
  BlogOccasion | 'geral',
  {
    kicker: string
    title: string
    text: string
    button: string
    guide?: string
  }
> = {
  aniversario: {
    kicker: 'vai fazer aniversário?',
    title: 'Transforme essas ideias na sua lista de aniversário',
    text: 'Junte os presentes que você quer ganhar, de qualquer loja, e mande um link para os amigos. Cada pessoa reserva o que vai dar e ninguém repete presente.',
    button: 'Criar minha lista de aniversário',
    guide: 'Como montar a lista de aniversário',
  },
  casamento: {
    kicker: 'para o casal',
    title: 'Monte a lista de casamento de vocês',
    text: 'Presentes de qualquer loja numa página só, com reserva para os convidados não repetirem. Montar é grátis.',
    button: 'Criar lista de casamento',
    guide: 'Guia da lista de casamento',
  },
  'cha-de-panela': {
    kicker: 'mão na massa',
    title: 'Monte sua lista de chá de panela',
    text: 'Coloque os utensílios que faltam, com links de qualquer loja, e deixe os convidados reservarem para não repetir presente.',
    button: 'Criar lista de chá de panela',
    guide: 'Os itens mais pedidos no chá de panela',
  },
  'casa-nova': {
    kicker: 'casa nova, lista nova',
    title: 'Monte sua lista de chá de casa nova',
    text: 'Organize o que falta por cômodo, com links de qualquer loja, e mande um link para os convidados reservarem.',
    button: 'Criar lista de casa nova',
    guide: 'Os itens mais pedidos no chá de casa nova',
  },
  'cha-de-bebe': {
    kicker: 'para o enxoval',
    title: 'Monte a lista do chá de bebê',
    text: 'Descreva tamanhos e quantidades, junte links de qualquer loja e deixe os convidados reservarem o que vão dar.',
    button: 'Criar lista de chá de bebê',
    guide: 'Guia da lista de chá de bebê',
  },
  geral: {
    kicker: 'coloque em prática',
    title: 'Monte sua lista de presentes',
    text: 'Presentes de qualquer loja numa página só, com reserva para ninguém repetir. Monte grátis e libere o compartilhamento a partir de R$ 9,90.',
    button: 'Criar minha lista',
  },
}

export function BlogOccasionCta({
  occasion,
  slug,
  position,
}: {
  occasion: BlogOccasion | null
  slug: string
  position: 'meio' | 'fim'
}) {
  const copy = COPY[occasion ?? 'geral']
  const onClick = (target: 'criar' | 'guia') =>
    track.blogCtaClicked({
      slug,
      occasion: occasion ?? 'geral',
      position,
      target,
    })

  return (
    <aside
      className={
        position === 'meio'
          ? 'not-prose my-10 rounded-3xl border border-muted-rose/30 bg-blush/20 p-6 md:p-8 space-y-3'
          : 'rounded-3xl bg-blush/20 p-6 md:p-8 space-y-3'
      }
    >
      <p className="font-accent text-2xl text-muted-rose">{copy.kicker}</p>
      <p className="font-display text-2xl text-espresso leading-snug">
        {copy.title}
      </p>
      <p className="text-warm-gray leading-relaxed">{copy.text}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <Link
          to="/events/create"
          onClick={() => onClick('criar')}
          className="inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90"
        >
          {copy.button}
        </Link>
        {occasion && copy.guide && (
          <Link
            to={
              occasion === 'cha-de-panela' || occasion === 'casa-nova'
                ? '/dados/presentes-mais-pedidos'
                : '/lista-de-presentes/$occasion'
            }
            params={{ occasion }}
            onClick={() => onClick('guia')}
            className="text-primary underline underline-offset-4"
          >
            {copy.guide}
          </Link>
        )}
      </div>
      {position === 'fim' && (
        <p className="text-sm text-warm-gray">
          Montar é grátis. Para compartilhar, pagamento único a partir de R$
          9,90.{' '}
          <Link to="/precos" className="underline">
            Ver preços
          </Link>
        </p>
      )}
    </aside>
  )
}
