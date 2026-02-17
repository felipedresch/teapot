import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { useEventSearch } from '../hooks/useEvents'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim()
  const shouldSearch = normalizedSearch.length >= 2
  const { events, isLoading } = useEventSearch(normalizedSearch, shouldSearch)

  return (
    <div className="max-w-5xl mx-auto px-6 py-14 space-y-8">
      <section className="text-center space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-warm-gray">teapot</p>
        <h1 className="font-display italic text-4xl md:text-5xl text-espresso">
          Seu sistema de listas para eventos
        </h1>
        <p className="text-warm-gray max-w-2xl mx-auto">
          Crie sua lista em poucos minutos ou encontre um evento pelo nome, local ou código.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hoverable>
          <CardHeader>
            <CardTitle>Criar evento</CardTitle>
            <CardDescription>
              Monte a lista mesmo sem login e finalize quando estiver pronto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full">
              <Link to="/events/create">
                <Sparkles className="size-4" />
                Criar meu evento
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-muted-rose/30 bg-blush/5">
          <CardHeader>
            <CardTitle>Pesquisar evento</CardTitle>
            <CardDescription>
              Digite ao menos 2 caracteres para buscar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: chá cozinha, campinas, cha-joana-pedro-1234"
              icon={<Search className="size-4" />}
            />
            <p className="text-xs text-warm-gray">
              O resultado mostra apenas dados públicos do evento.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-espresso">Resultados da busca</h2>
        {!shouldSearch ? (
          <p className="text-sm text-warm-gray">
            Comece digitando para procurar eventos.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-warm-gray">Buscando eventos...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-warm-gray">
            Nenhum evento encontrado com esse termo.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event._id} hoverable className="p-4 md:p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-base font-medium text-espresso">{event.name}</p>
                    {event.location ? (
                      <p className="text-xs text-warm-gray">Local: {event.location}</p>
                    ) : (
                      <p className="text-xs text-warm-gray">Local não informado</p>
                    )}
                    <p className="text-xs text-warm-gray/80">Código: {event.slug}</p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/events/$slug" params={{ slug: event.slug }}>
                      Abrir lista
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
