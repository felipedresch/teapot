#!/bin/sh
# Comando de build dos previews do Worker mywish-staging (Workers Builds, aba
# Previews Base). A master (Worker mywish) e a staging (Worker mywish-staging)
# têm o build delas na aba Production de cada Worker.
#
# Cada branch ganha um Convex de preview próprio no projeto teapot, com o seed
# de convex/dev/previewSeed.ts, e o site é construído apontando para ele.
# Nenhum preview usa o Convex de dev, o de produção nem o de outra branch. A
# Action apagar-preview.yml apaga o Convex da branch quando o PR fecha.
set -eu

BRANCH="${WORKERS_CI_BRANCH:?Falta WORKERS_CI_BRANCH, que o Workers Builds define.}"
case "$BRANCH" in
  staging)
    echo "A staging tem o build dela na aba Production do Worker mywish-staging." >&2
    exit 1
    ;;
  master|dev)
    # A master é a produção, no Worker mywish. A dev é a branch de trabalho,
    # que cada um roda com o próprio Convex de dev (`npx convex dev`). Sem
    # preview, como no Harmony; preview-deploy.sh vê a marca e não sobe nada.
    echo "A branch $BRANCH não tem preview."
    : > .sem-preview
    exit 0
    ;;
esac
: "${CONVEX_PREVIEW_DEPLOY_KEY:?Falta o segredo de build CONVEX_PREVIEW_DEPLOY_KEY na aba Previews Base do Worker mywish-staging.}"
PREVIEW_SITE="$(node scripts/cloudflare/preview.mjs site "$BRANCH")"
export PREVIEW_SITE
echo "Preview em $PREVIEW_SITE"

# Uma CONVEX_DEPLOYMENT no ambiente teria prioridade sobre a chave de preview.
unset CONVEX_DEPLOYMENT
export CONVEX_DEPLOY_KEY="$CONVEX_PREVIEW_DEPLOY_KEY"

# --preview-create recria o preview a cada push: banco limpo e seed de novo.
npx convex deploy \
  --preview-create "$BRANCH" \
  --typecheck enable \
  --cmd-url-env-var-name VITE_CONVEX_URL \
  --cmd 'sh scripts/cloudflare/preview-site.sh' \
  --preview-run dev/previewSeed:run
