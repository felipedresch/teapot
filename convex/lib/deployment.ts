// Ambiente lógico do deployment Convex, pela variável MYWISH_DEPLOYMENT_ENV.
// Só os previews das branches a têm, com "development" (variáveis padrão de
// preview do projeto, docs/CLOUDFLARE.md). Sem ela, vale produção: o seguro.
export function isDevelopmentDeployment(): boolean {
  return (
    process.env.MYWISH_DEPLOYMENT_ENV?.trim().toLowerCase() === 'development'
  )
}
