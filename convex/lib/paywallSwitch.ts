// Interruptor da cobrança. É o único lugar que decide se o MyWish cobra.
//
// true: montar a lista é grátis e compartilhar custa um Pix único (R$ 9,90 ou
// R$ 29,90, convex/payments.ts). false: tudo grátis. Listas criadas ou
// publicadas com a cobrança desligada ficam 'grandfathered' (grátis para
// sempre), mesmo se a cobrança voltar.
//
// O site lê esta mesma constante: páginas, metadados, blog (marcadores
// <!-- pago --> e <!-- gratis -->, docs/BLOG.md) e /llms.txt mudam junto.
// Como virar: docs/PAYWALL.md.
export const PAYWALL_ENABLED = true

export type MonetizationStatus = 'grandfathered' | 'requires_payment' | 'paid'

/**
 * Situação de cobrança que vale agora. Com a cobrança desligada, uma lista
 * que esperava pagamento conta como grátis; quem grava o evento (publicar,
 * editar) guarda essa situação, e `payments:liberarListasPendentes` faz o
 * mesmo com todas de uma vez.
 */
export function effectiveMonetizationStatus(
  status: MonetizationStatus | undefined,
  paywallEnabled = PAYWALL_ENABLED,
): MonetizationStatus {
  const stored = status ?? 'grandfathered'
  if (!paywallEnabled && stored === 'requires_payment') return 'grandfathered'
  return stored
}

/** Situação de uma lista nova. */
export function newEventMonetizationStatus(
  hasLifetimeAccess: boolean,
  paywallEnabled = PAYWALL_ENABLED,
): MonetizationStatus {
  if (hasLifetimeAccess) return 'paid'
  return paywallEnabled ? 'requires_payment' : 'grandfathered'
}
