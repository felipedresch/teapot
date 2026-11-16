// Carrega a curadoria manual (scripts/sugestoes/curadoria.json) na tabela
// productSuggestions, a mesma que o cron da Open API preenche. Cada ideia
// vai para todas as ocasiões que a usam (convex/lib/suggestionIdeas.ts).
//
//   node scripts/sugestoes/carregar.mjs           # produção
//   node scripts/sugestoes/carregar.mjs --dev     # deployment de dev
//   node scripts/sugestoes/carregar.mjs --check   # só valida o arquivo
//
// Só entra produto com `link` (link curto de afiliado do painel da Shopee).
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { SUGGESTION_OCCASIONS } from '../../convex/lib/suggestionIdeas.ts'

const args = new Set(process.argv.slice(2))
const curadoria = JSON.parse(
  readFileSync(new URL('./curadoria.json', import.meta.url), 'utf8'),
)

const targetsByIdea = new Map()
for (const [occasion, config] of Object.entries(SUGGESTION_OCCASIONS)) {
  for (const idea of config.ideas) {
    const targets = targetsByIdea.get(idea.id) ?? []
    targets.push({ occasion, ideaId: idea.id })
    targetsByIdea.set(idea.id, targets)
  }
}

const SLOTS = new Set(['budget', 'popular', 'gift'])
const jobs = []
for (const [ideaId, items] of Object.entries(curadoria.ideias)) {
  const targets = targetsByIdea.get(ideaId)
  if (!targets) throw new Error(`Ideia desconhecida: ${ideaId}`)
  const products = []
  for (const item of items) {
    if (!SLOTS.has(item.slot)) throw new Error(`Faixa inválida em ${ideaId}`)
    if (!item.link) {
      console.warn(`sem link, fica de fora: ${ideaId} / ${item.name}`)
      continue
    }
    if (!/^https:\/\/s\.shopee\.com\.br\/\w+$/.test(item.link)) {
      throw new Error(`Link fora do formato curto: ${item.link}`)
    }
    products.push({
      slot: item.slot,
      itemId: item.itemId,
      name: item.name,
      imageUrl: `https://down-br.img.susercontent.com/file/${item.image}`,
      price: item.price,
      rating: item.rating,
      sales: item.sales,
      commissionRate: item.commissionRate,
      productLink: item.link,
    })
  }
  if (products.length) jobs.push({ ideaId, targets, products })
}

console.log(
  `${jobs.length} ideias, ${jobs.reduce((n, job) => n + job.products.length, 0)} produtos`,
)
if (args.has('--check')) process.exit(0)

for (const job of jobs) {
  const payload = JSON.stringify({
    targets: job.targets,
    products: job.products,
  })
  execFileSync(
    'npx',
    [
      'convex',
      'run',
      ...(args.has('--dev') ? [] : ['--prod']),
      'productSuggestions:replaceIdeaSuggestions',
      payload,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  console.log(
    `ok ${job.ideaId} → ${job.targets.map((t) => t.occasion).join(', ')}`,
  )
}
