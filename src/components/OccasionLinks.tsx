import { Link } from '@tanstack/react-router'
import { occasions } from '../content/occasions'

export function OccasionLinks() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 py-12 space-y-6"
      aria-labelledby="occasion-links-title"
    >
      <div className="max-w-2xl space-y-3">
        <p className="font-accent text-2xl text-muted-rose">
          cada celebração, uma lista
        </p>
        <h2
          id="occasion-links-title"
          className="font-display text-3xl text-espresso"
        >
          Encontre ideias para a sua ocasião
        </h2>
        <p className="text-warm-gray leading-relaxed">
          Veja o que incluir, como organizar os presentes e como compartilhar a
          lista com seus convidados.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {occasions.map((item) => (
          <Link
            key={item.slug}
            to="/lista-de-presentes/$occasion"
            params={{ occasion: item.slug }}
            className="rounded-full border border-muted-rose/30 px-5 py-3 text-sm text-espresso hover:bg-blush/30 transition-colors"
          >
            {item.name} <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
