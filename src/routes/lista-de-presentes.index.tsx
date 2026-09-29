import { createFileRoute, Link } from '@tanstack/react-router'
import { occasions } from '../content/occasions'
import { pageMeta } from '../lib/seo'

export const Route = createFileRoute('/lista-de-presentes/')({
  head: () => ({
    meta: pageMeta(
      'Lista de presentes online para cada ocasião',
      'Organize presentes de diferentes lojas e compartilhe sua lista com convidados. Guias para casamento, aniversário, chá de bebê, chá de panela e casa nova.',
    ),
  }),
  component: ListsPage,
})
function ListsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-14 space-y-10">
      <header className="max-w-3xl space-y-4">
        <p className="font-accent text-3xl text-muted-rose">
          presentes com intenção
        </p>
        <h1 className="font-display text-4xl md:text-6xl text-espresso">
          Uma lista de presentes para cada ocasião
        </h1>
        <p className="text-lg text-warm-gray leading-relaxed">
          Reúna o que você gostaria de ganhar, adicione links de diferentes
          lojas e deixe os convidados reservarem os presentes. Escolha sua
          ocasião para encontrar sugestões e dicas de organização.
        </p>
      </header>
      <div className="grid md:grid-cols-2 gap-6">
        {occasions.map((item) => (
          <article
            key={item.slug}
            className="border-t border-muted-rose/30 py-6 space-y-3"
          >
            <h2 className="font-display text-3xl text-espresso">
              <Link
                to="/lista-de-presentes/$occasion"
                params={{ occasion: item.slug }}
                className="hover:text-primary"
              >
                {item.name}
              </Link>
            </h2>
            <p className="text-warm-gray leading-relaxed">{item.description}</p>
            <Link
              to="/lista-de-presentes/$occasion"
              params={{ occasion: item.slug }}
              className="inline-flex text-primary underline underline-offset-4"
            >
              Ver guia de {item.name.toLocaleLowerCase('pt-BR')}
            </Link>
          </article>
        ))}
      </div>
      <section className="space-y-4">
        <h2 className="font-display text-3xl text-espresso">
          Como funciona uma lista online?
        </h2>
        <p className="text-warm-gray leading-relaxed">
          Você monta a lista gratuitamente e paga uma única vez para liberar o
          compartilhamento. O convidado reserva o item no MyWish e compra onde
          preferir. A plataforma não vende os presentes nem faz a entrega. As
          reservas ajudam a evitar escolhas repetidas.
        </p>
        <div className="flex flex-wrap gap-5">
          <Link to="/events/create" className="text-primary underline">
            Criar minha lista
          </Link>
          <Link to="/precos" className="text-primary underline">
            Ver preços
          </Link>
          <Link to="/how-it-works" className="text-primary underline">
            Ver o passo a passo
          </Link>
        </div>
      </section>
    </div>
  )
}
