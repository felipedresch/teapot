import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPixPayment } from '../convex/payments'
vi.mock('@convex-dev/auth/server', () => ({
  getAuthUserId: async () => 'user_test',
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('Pix description sent to AbacatePay', () => {
  it.each([
    'Aniversario | Ana',
    'Casamento 🎉 👨‍👩‍👧‍👦 🇧🇷 1️⃣',
    'Chá de bebê — João & María',
    '<script>"teste"</script> \\ / { } [ ] ~ ^ ` @ # $ % * + = : ; ! ?',
    'Linha\n\t\r\u0000\u200b\u202e invisível',
    '🎁'.repeat(600),
    '',
    'Á'.repeat(600),
  ])('creates a safe checkout for %s', async (eventName) => {
    vi.stubEnv('ABACATEPAY_API_KEY', 'test-key')
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: {
              id: 'pix_test',
              brCode: 'code',
              brCodeBase64: 'image',
              expiresAt: '2026-10-01T00:00:00Z',
            },
          }),
          { status: 200 },
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const ctx = {
      runQuery: vi
        .fn()
        .mockResolvedValue({
          isHost: true,
          isUnlocked: false,
          eventName,
          prices: { single: 990, lifetime: 2990 },
          category: 'common',
        }),
      runMutation: vi
        .fn()
        .mockResolvedValueOnce('payment_test')
        .mockResolvedValueOnce({
          status: 'pending',
          amount: 990,
          currency: 'BRL',
        }),
      runAction: vi.fn(),
    }
    await (createPixPayment as unknown as { _handler: Function })._handler(
      ctx,
      { eventId: 'event_test', tier: 'single' },
    )
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]
        .body as string,
    )
    expect(body.data.description).toMatch(/^[A-Za-z0-9 ]+$/)
    expect(body.data.description.length).toBeLessThanOrEqual(140)
    expect(body.data.description).toContain('MyWish')
    expect(body.data.amount).toBe(990)
    expect(body.data.metadata.eventId).toBe('event_test')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
