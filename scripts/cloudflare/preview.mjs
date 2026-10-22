#!/usr/bin/env node
// Nome e endereço do preview de uma branch no Worker mywish-staging.
//
// O preview da branch "feat/x" se chama "feat-x" e mora em
// https://feat-x-mywish-staging.galeria-felipe-dev.workers.dev. O endereço
// precisa ser conhecido antes do build (o Convex de preview aponta para ele no
// SITE_URL), então o nome é montado aqui, e não deixado para a Cloudflare. O
// pedaço "<nome>-mywish-staging" é um rótulo de DNS: no máximo 63 letras.
//
// Uso: node scripts/cloudflare/preview.mjs nome|site <branch>
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'

const WORKER = 'mywish-staging'
const SUBDOMINIO = 'galeria-felipe-dev.workers.dev'
const MAXIMO = 63 - `-${WORKER}`.length

export function nomeDoPreview(branch) {
  const nome = branch
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!nome) throw new Error(`A branch "${branch}" não dá nome de preview.`)
  if (nome.length <= MAXIMO) return nome
  // Branch comprida: corta e põe um pedaço do hash, para duas branches de
  // começo igual não caírem no mesmo preview.
  const hash = createHash('sha1').update(branch).digest('hex').slice(0, 6)
  return `${nome.slice(0, MAXIMO - 7).replace(/-+$/, '')}-${hash}`
}

export function siteDoPreview(branch) {
  return `https://${nomeDoPreview(branch)}-${WORKER}.${SUBDOMINIO}`
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [o, branch] = process.argv.slice(2)
  if (!branch || !['nome', 'site'].includes(o)) {
    console.error('Uso: node scripts/cloudflare/preview.mjs nome|site <branch>')
    process.exit(1)
  }
  console.log(o === 'nome' ? nomeDoPreview(branch) : siteDoPreview(branch))
}
