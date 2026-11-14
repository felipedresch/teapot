// /dev/sugestoes: vitrine dos componentes de sugestão com fixtures, só em
// desenvolvimento (src/dev/SuggestionsPlayground.tsx). No build de produção o
// import.meta.env.DEV vira false: a rota dá 404 e o import dinâmico (com as
// fixtures) some do bundle.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

const Playground = import.meta.env.DEV
  ? lazy(() => import('../dev/SuggestionsPlayground'))
  : null

// Com SSR: o beforeLoad roda no servidor, e a produção responde 404 de verdade
// (com ssr: false ela devolvia 200 e uma página vazia).
export const Route = createFileRoute('/dev/sugestoes')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  head: () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] }),
  component: () =>
    Playground ? (
      <Suspense fallback={null}>
        <Playground />
      </Suspense>
    ) : null,
})
