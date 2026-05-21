export type PaywallCategory = 'common' | 'premium'
export type PaymentTier = 'single' | 'lifetime'
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'refunded'
  | 'disputed'

export function formatBRL(cents: number) {
  const amount = (cents ?? 0) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatTimeRemaining(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return { minutes: 0, seconds: 0, label: '00:00', expired: true }
  }
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return {
    minutes,
    seconds,
    label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    expired: false,
  }
}

export function getCategoryCopy(category: PaywallCategory) {
  if (category === 'premium') {
    return {
      eyebrow: 'pra essa celebração',
      headline: 'sua lista está quase pronta',
      lead: (giftCount: number) =>
        `Você adicionou ${giftCount} ${giftCount === 1 ? 'presente' : 'presentes'} com tanto carinho. Agora, só falta compartilhar com quem vai celebrar com você.`,
      sharedFooter: 'pagamento único, sem mensalidade — sua, pra sempre sua.',
      singleCardTitle: 'Este evento',
      singleCardEyebrow: 'só essa celebração',
      singleCardSubtitle:
        'Sua lista de presentes no ar pra esse momento que vocês estão preparando — até o grande dia, e depois também.',
      lifetimeCardTitle: 'Listas ilimitadas',
      lifetimeCardEyebrow: 'para sempre, para tudo que vier',
      lifetimeCardSubtitle:
        'Crie e compartilhe quantas listas quiser, pra sempre. Casamento, bodas, e tudo que vier depois.',
      cta: 'Liberar agora',
    }
  }
  return {
    eyebrow: 'pra essa celebração',
    headline: 'sua lista está quase pronta',
    lead: (giftCount: number) =>
      `Você adicionou ${giftCount} ${giftCount === 1 ? 'presente' : 'presentes'} com tanto carinho. Agora, só falta compartilhar com quem você ama.`,
    sharedFooter: 'pagamento único, sem mensalidade — sua, pra sempre sua.',
    singleCardTitle: 'Esta lista',
    singleCardEyebrow: 'só essa celebração, acesso vitalício',
    singleCardSubtitle:
      'Sua lista no ar pra esse momento que você está montando com tanto carinho — do convite ao último presente.',
    lifetimeCardTitle: 'Listas ilimitadas',
    lifetimeCardEyebrow: 'para sempre, para tudo que vier',
    lifetimeCardSubtitle:
      'Crie e compartilhe quantas listas quiser, pra sempre. Aniversários, chás, formaturas e tudo que vier depois.',
    cta: 'Liberar agora',
  }
}
