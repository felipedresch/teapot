import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: HomePlaceholder })

function HomePlaceholder() {
  return (
    <main className="min-h-screen bg-[color:var(--color-cream)] text-[color:var(--color-espresso)] flex items-center justify-center px-6 py-16">
      <div className="relative max-w-3xl w-full">
        <div className="pointer-events-none absolute -inset-10 opacity-40 blur-3xl bg-[radial-gradient(circle_at_top,_var(--color-blush)_0,_transparent_60%),radial-gradient(circle_at_bottom,_var(--color-sage)_0,_transparent_60%)]" />

        <section
          className="relative rounded-[1.75rem] bg-[color:var(--color-warm-white)]/95 border border-[color:var(--border)]
          shadow-[var(--shadow-soft)] px-8 py-10 md:px-12 md:py-12"
        >
          <p className="text-sm uppercase tracking-[0.25em] text-[color:var(--color-warm-gray)] mb-4">
            Lista de presentes
          </p>

          <h1 className="mb-4 leading-tight">
            Um lugar aconchegante
            <br />
            para celebrar com carinho.
          </h1>

          <p className="text-[color:var(--color-warm-gray)] text-base md:text-lg leading-relaxed mb-8 max-w-xl">
            Este é o espaço onde os convidados encontram os mimos escolhidos com
            cuidado, em um ambiente que parece papelaria artesanal:
            delicado, acolhedor e pensado nos detalhes.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium text-[color:var(--primary-foreground)]
              bg-[color:var(--primary)] shadow-[var(--shadow-card)] transition-transform transition-shadow duration-200
              hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(61,53,48,0.16)]"
            >
              Explorar lista de presentes
            </button>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium
              border border-[color:var(--color-muted-rose)]/60 text-[color:var(--color-espresso)]
              bg-[color:var(--color-cream)]/60 hover:bg-[color:var(--color-blush)]/30 transition-colors"
            >
              Entrar como convidado
            </button>
          </div>

          <div className="mt-8 grid gap-4 text-xs text-[color:var(--color-warm-gray)] md:grid-cols-3">
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--color-espresso)]">
                Visual dreamy stationery
              </p>
              <p>
                Paleta cream, blush, sage e terracotta com sombras difusas e
                bordas generosas.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--color-espresso)]">
                Tipografia com personalidade
              </p>
              <p>
                Títulos em Fraunces, corpo em DM Sans para um ar romântico e
                contemporâneo.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-[color:var(--color-espresso)]">
                Experiência acolhedora
              </p>
              <p>
                Layout respirado, foco na emoção do gesto de presentear,
                não em UI de dashboard.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
