#!/bin/sh
# Comando de preview do Worker mywish-staging (Workers Builds, aba Previews
# Base): sobe o build de preview-build.sh como um Preview da Cloudflare, no
# endereço de preview.mjs.
set -eu

if [ -f .sem-preview ]; then
  echo "Sem preview para esta branch."
  exit 0
fi
BRANCH="${WORKERS_CI_BRANCH:?}"
NOME="$(node scripts/cloudflare/preview.mjs nome "$BRANCH")"

npx wrangler preview --name "$NOME"
echo "Preview: $(node scripts/cloudflare/preview.mjs site "$BRANCH")"
