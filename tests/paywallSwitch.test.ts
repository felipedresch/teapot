import { describe, expect, it } from 'vitest'
import {
  effectiveMonetizationStatus,
  newEventMonetizationStatus,
} from '../convex/lib/paywallSwitch'

describe('interruptor da cobrança', () => {
  it('com a cobrança ligada, lista nova espera pagamento', () => {
    expect(newEventMonetizationStatus(false, true)).toBe('requires_payment')
    expect(newEventMonetizationStatus(true, true)).toBe('paid')
  })

  it('com a cobrança desligada, lista nova nasce grátis', () => {
    expect(newEventMonetizationStatus(false, false)).toBe('grandfathered')
    expect(newEventMonetizationStatus(true, false)).toBe('paid')
  })

  it('com a cobrança desligada, lista pendente conta como grátis', () => {
    expect(effectiveMonetizationStatus('requires_payment', false)).toBe(
      'grandfathered',
    )
    expect(effectiveMonetizationStatus('requires_payment', true)).toBe(
      'requires_payment',
    )
  })

  it('não mexe em listas pagas nem nas antigas', () => {
    for (const enabled of [true, false]) {
      expect(effectiveMonetizationStatus('paid', enabled)).toBe('paid')
      expect(effectiveMonetizationStatus(undefined, enabled)).toBe(
        'grandfathered',
      )
    }
  })
})
