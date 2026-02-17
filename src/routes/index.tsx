import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { Gift, Heart, Sparkles } from 'lucide-react'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

export const Route = createFileRoute('/')({ component: HomePage })

// Página inicial (home) do projeto.
// Fluxos esperados aqui:
// - Host (casal) pode iniciar criação de um novo evento sem estar logado:
//   - clica no botão Criar Evento e é levado para a rota /events/create.
//   - preenche informações básicas do evento (nome, data, local, slug, etc.);
//   - adiciona ao menos um gift em memória (via Zustand);
//   - só quando clicar em "finalizar/criar evento" exigimos login Google;
//   - após login, usaremos os dados do store para criar o evento e gifts no Convex.
// - Convidado sem slug:
//   - verá uma barra de busca para encontrar eventos públicos;
//   - poderá pesquisar por nome de host, nome do evento, slug, local, etc.;
//   - ao selecionar um resultado, será redirecionado para a página pública da lista
//     de presentes daquele evento (rota por slug).
//
// Implementação futura:
// - Formulário controlado integrado com useEventCreationStore.
// - UI com duas "entradas" claras: "Criar evento" e "Pesquisar evento".
// Atualmente possui um simples placeholder que reflete um pouquinho do estilo esperado.

const ease = [0.22, 1, 0.36, 1] as const

function HomePage() {
  const config = useSiteConfig()

  return (
    <div className="relative">
      {/* ═══ Hero ═══ */}
      <section className="relative min-h-[72vh] flex flex-col items-center justify-center px-6 py-24 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-32 right-[10%] w-72 h-72 bg-blush/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 -left-16 w-80 h-80 bg-sage/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-soft-terracotta/[0.06] rounded-full blur-[140px]" />
        </div>

        <motion.div
          className="relative text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-warm-gray mb-8">
            lista de presentes
          </p>

          <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] italic leading-[1.1] mb-5">
            {config.partnerOneName}{' '}
            <span className="text-muted-rose">&</span>{' '}
            {config.partnerTwoName}
          </h1>

          {config.eventDate && (
            <p className="font-accent text-xl text-muted-rose/80 mb-8">
              {config.eventDate}
            </p>
          )}
        </motion.div>

        <motion.p
          className="relative text-warm-gray text-base md:text-lg leading-relaxed mb-10 max-w-md mx-auto text-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.12, ease }}
        >
          {config.welcomeMessage}
        </motion.p>

        <motion.div
          className="relative flex flex-wrap gap-4 justify-center"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease }}
        >
          {/* TODO: Link to /lista when route exists */}
          <Button size="lg">
            <Gift className="size-4" />
            Explorar Lista
          </Button>
          {/* TODO: Link to /events/create when ready */}
          <Button variant="secondary" size="lg">
            <Sparkles className="size-4" />
            Criar Evento
          </Button>
        </motion.div>
      </section>

      {/* ═══ Preview Section ═══ */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.45 }}
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-10 h-px bg-muted-rose/30" />
            <Heart className="size-3.5 text-muted-rose/50" />
            <div className="w-10 h-px bg-muted-rose/30" />
          </div>
          <p className="text-sm text-warm-gray">
            Uma amostra dos mimos escolhidos com carinho
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PREVIEW_GIFTS.map((gift, i) => (
            <motion.div
              key={gift.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.55 + i * 0.1,
                ease,
              }}
            >
              <Card hoverable className="p-0 overflow-hidden group">
                {/* Image placeholder with dreamy gradient */}
                <div
                  className={`aspect-[4/3] flex items-center justify-center ${gift.gradient}`}
                >
                  <gift.icon className="size-9 text-espresso/10 transition-transform duration-300 group-hover:scale-110" />
                </div>

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-base leading-snug">{gift.name}</h4>
                    <Badge variant={gift.status}>
                      {STATUS_LABELS[gift.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-warm-gray leading-relaxed mb-4">
                    {gift.description}
                  </p>
                  {gift.status === 'available' && (
                    <Button size="sm" className="w-full">
                      Quero Presentear
                    </Button>
                  )}
                  {gift.status === 'reserved' && (
                    <p className="text-xs text-muted-rose text-center py-1">
                      Alguém já escolheu este mimo
                    </p>
                  )}
                  {gift.status === 'received' && (
                    <p className="text-xs text-warm-gray text-center py-1 font-accent text-sm">
                      Recebido com carinho ♥
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ── Static data ── */

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponível',
  reserved: 'Reservado',
  received: 'Recebido',
}

const PREVIEW_GIFTS = [
  {
    name: 'Jogo de Toalhas',
    description: 'Toalhas felpudas para o novo lar, em tons suaves e acolhedores',
    status: 'available' as const,
    icon: Gift,
    gradient: 'bg-gradient-to-br from-blush/40 via-warm-white to-sage/20',
  },
  {
    name: 'Luminária de Mesa',
    description: 'Luz aconchegante para as noites tranquilas em casa',
    status: 'reserved' as const,
    icon: Sparkles,
    gradient: 'bg-gradient-to-br from-sage/30 via-warm-white to-blush/25',
  },
  {
    name: 'Conjunto de Panelas',
    description: 'Para as receitas especiais que vão perfumar o novo lar',
    status: 'received' as const,
    icon: Heart,
    gradient: 'bg-gradient-to-br from-soft-terracotta/20 via-warm-white to-sage/15',
  },
]
