import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { ArrowRight, Search, Sparkles, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useEventSearch } from '../hooks/useEvents'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

export const Route = createFileRoute('/')({ component: HomePage })

const ease = [0.22, 1, 0.36, 1] as const

function HomePage() {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim()
  const shouldSearch = normalizedSearch.length >= 2
  const { events, isLoading } = useEventSearch(normalizedSearch, shouldSearch)
  const searchRef = useRef<HTMLDivElement>(null)

  return (
    <div className="overflow-hidden">
      {/* ═══ HERO ═══ */}
      <section className="relative min-h-[78vh] flex flex-col items-center justify-center px-6 pt-12 pb-20">
        {/* Decorative background shapes */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-20 w-[26rem] h-[26rem] bg-sage/10 rounded-full blur-[120px]" />
          <div className="absolute top-[30%] -right-16 w-[20rem] h-[20rem] bg-blush/20 rounded-full blur-[100px]" />
          <div className="absolute -bottom-24 left-[35%] w-[18rem] h-[18rem] bg-soft-terracotta/8 rounded-full blur-[80px]" />
        </div>

        <div className="relative text-center">
          <motion.p
            className="font-accent text-2xl md:text-3xl text-primary"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            bem-vindo ao
          </motion.p>

          <motion.h1
            className="font-display italic text-[4.5rem] sm:text-[6rem] md:text-[8rem] lg:text-[10rem] leading-[0.85] tracking-tight mt-1"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.1 }}
          >
            <span className="text-expresso">my</span>
            <span className="text-primary">wish</span>
          </motion.h1>

          <motion.p
            className="mt-6 md:mt-8 text-warm-gray text-base md:text-lg max-w-sm md:max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.25 }}
          >
            O cantinho mais aconchegante para criar listas de presentes e
            celebrar com quem importa.
          </motion.p>

          <motion.div
            className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.38 }}
          >
            <Button asChild size="lg">
              <Link to="/events/create">
                <Sparkles className="size-4" />
                Criar minha lista
              </Link>
            </Button>
            <button
              type="button"
              onClick={() =>
                searchRef.current?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                })
              }
              className="text-sm text-warm-gray hover:text-espresso transition-colors duration-300 underline underline-offset-4 decoration-muted-rose/40 hover:decoration-muted-rose"
            >
              Procurar um evento
            </button>
          </motion.div>
        </div>

        {/* Decorative ornament */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          <OrnamentDivider className="w-24 text-muted-rose/25" />
        </motion.div>
      </section>

      {/* ═══ CONTENT ═══ */}
      <section className="px-6 pb-28 md:pb-36">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* ── Create CTA ── */}
          <motion.div
            className="lg:col-span-7 order-2 lg:order-1"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease }}
          >
            <div className="relative bg-warm-white rounded-[2rem] border border-blush/50 p-8 sm:p-10 md:p-14 overflow-hidden shadow-dreamy-md">
              {/* Corner ornaments */}
              <div className="absolute top-5 left-5 w-10 h-10 border-l-[1.5px] border-t-[1.5px] border-muted-rose/20 rounded-tl-lg" />
              <div className="absolute bottom-5 right-5 w-10 h-10 border-r-[1.5px] border-b-[1.5px] border-muted-rose/20 rounded-br-lg" />
              <div className="absolute -top-6 -right-6 w-36 h-36 bg-sage/8 rounded-full blur-3xl pointer-events-none" />

              <p className="font-accent text-xl text-muted-rose">
                para quem ama celebrar
              </p>
              <h2 className="font-display italic text-3xl md:text-4xl text-espresso mt-2 leading-[1.1]">
                Crie sua lista de presentes
              </h2>
              <p className="text-warm-gray mt-4 leading-relaxed max-w-lg">
                Monte tudo sem precisar de login. Adicione presentes,
                personalize com carinho e compartilhe quando estiver pronto.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link to="/events/create">
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* ── Search ── */}
          <motion.div
            ref={searchRef}
            className="lg:col-span-5 order-1 lg:order-2"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease, delay: 0.1 }}
          >
            <div className="space-y-5">
              <div>
                <p className="font-accent text-2xl text-warm-gray">
                  procurando algo?
                </p>
                <p className="text-sm text-warm-gray/60 mt-1">
                  Busque por nome, local ou código do evento.
                </p>
              </div>

              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="nome, local ou código..."
                icon={<Search className="size-4" />}
              />

              <div className="space-y-2.5 min-h-[48px]">
                <AnimatePresence mode="wait">
                  {!shouldSearch ? (
                    <motion.p
                      key="hint"
                      className="text-xs text-warm-gray/50 pl-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      Digite ao menos 2 caracteres.
                    </motion.p>
                  ) : isLoading ? (
                    <motion.div
                      key="loading"
                      className="space-y-2.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-[52px] rounded-xl bg-blush/15 animate-shimmer"
                        />
                      ))}
                    </motion.div>
                  ) : events.length === 0 ? (
                    <motion.p
                      key="empty"
                      className="text-sm text-warm-gray/60 pl-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      Nenhum evento encontrado.
                    </motion.p>
                  ) : (
                    <motion.div
                      key="results"
                      className="space-y-2"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: { staggerChildren: 0.05 },
                        },
                      }}
                    >
                      {events.map((event) => {
                        const partnerOne = event.partnerOneName?.trim() || ''
                        const partnerTwo = event.partnerTwoName?.trim() || ''
                        const hostsName = partnerTwo
                          ? `${partnerOne} & ${partnerTwo}`
                          : partnerOne || 'Anfitriões não informados'
                        return (
                          <motion.div
                            key={event._id}
                            variants={{
                              hidden: { opacity: 0, y: 10 },
                              visible: {
                                opacity: 1,
                                y: 0,
                                transition: { duration: 0.35, ease },
                              },
                            }}
                          >
                            <Link
                              to="/events/$slug"
                              params={{ slug: event.slug }}
                              className="group flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-warm-white/80 px-4 py-4 transition-all duration-200 hover:shadow-dreamy hover:border-muted-rose/30 hover:-translate-y-px"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="text-sm font-medium text-espresso">
                                  {event.name || 'Evento sem nome'}
                                </p>
                                <p className="text-xs text-warm-gray/70">
                                  {hostsName}
                                </p>
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-xs text-warm-gray/60">
                                    <MapPin className="size-3 shrink-0" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.description && (
                                  <p className="text-xs text-warm-gray/60 line-clamp-2 mt-1.5">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              <ArrowRight className="size-3.5 text-warm-gray/30 group-hover:text-muted-rose transition-colors shrink-0 mt-0.5" />
                            </Link>
                          </motion.div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

function OrnamentDivider({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M0 12 C20 4, 40 20, 60 12 C80 4, 100 20, 120 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="60" cy="12" r="2" fill="currentColor" opacity="0.5" />
    </svg>
  )
}
