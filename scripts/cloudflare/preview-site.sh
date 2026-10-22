#!/bin/sh
# Roda dentro do `npx convex deploy` de preview-build.sh, com VITE_CONVEX_URL já
# apontando para o Convex de preview da branch e PREVIEW_SITE com o endereço do
# preview na Cloudflare.
set -eu

SITE="${PREVIEW_SITE:?}"
BRANCH="${WORKERS_CI_BRANCH:?}"

# O Convex Auth volta do login para o SITE_URL. Os outros valores do Convex de
# preview vêm das variáveis padrão de preview do projeto (docs/CLOUDFLARE.md).
npx convex env set --preview-name "$BRANCH" SITE_URL "$SITE"

# O build é o do Worker mywish-staging, que guarda os previews. O "Entrar" usa
# o login de teste do seed (src/lib/signIn.ts), e preview não manda análise:
# o build sai sem a chave do PostHog.
CLOUDFLARE_ENV=staging VITE_PREVIEW_LOGIN=true VITE_POSTHOG_KEY= npm run build
