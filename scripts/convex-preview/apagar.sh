#!/bin/sh
# Apaga o Convex de preview de uma branch. Roda na Action apagar-preview.yml
# quando o PR fecha; à mão:
# CONVEX_PREVIEW_DEPLOY_KEY=... sh scripts/convex-preview/apagar.sh <branch>
#
# O preview da branch "feat/x" tem a referência "preview/feat-x" no projeto
# teapot (scripts/cloudflare/preview-build.sh). A chave de preview só enxerga e
# só apaga deployments de preview desse projeto: não alcança dev nem produção.
set -eu

BRANCH="${1:?Diga a branch do PR}"
: "${CONVEX_PREVIEW_DEPLOY_KEY:?Falta CONVEX_PREVIEW_DEPLOY_KEY}"
REFERENCE="preview/$(printf '%s' "$BRANCH" | tr 'A-Z' 'a-z' | sed -E 's/[^a-z0-9-]+/-/g')"
API=https://api.convex.dev/v1
AUTH="Authorization: Bearer $CONVEX_PREVIEW_DEPLOY_KEY"

# O CLI resolve a referência para o nome do deployment (playful-otter-123).
NAME=$(env -u CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY="$CONVEX_PREVIEW_DEPLOY_KEY" \
  npx -y convex@1.45.0 dashboard --no-open --deployment "$REFERENCE" 2>/dev/null \
  | sed -nE 's#.*dashboard\.convex\.dev/d/([a-z]+-[a-z]+-[0-9]+).*#\1#p' | head -1) || true
if [ -z "$NAME" ]; then
  echo "Nenhum Convex de preview para $BRANCH ($REFERENCE): já expirou ou nunca subiu."
  exit 0
fi

TYPE=$(curl -fsS -H "$AUTH" "$API/deployments/$NAME" | sed -nE 's/.*"deploymentType":"([a-z]+)".*/\1/p')
if [ "$TYPE" != preview ]; then
  echo "::error::$NAME não é um deployment de preview ($TYPE). Nada foi apagado." >&2
  exit 1
fi
curl -fsS -X POST -H "$AUTH" "$API/deployments/$NAME/delete" > /dev/null
echo "Convex de preview $NAME ($REFERENCE) apagado."
