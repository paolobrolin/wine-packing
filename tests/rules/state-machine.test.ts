import { describe, it, expect } from 'vitest'
import { canTransition, transition, timestampField, type BottleState } from '../../src/rules/state-machine'

describe('canTransition', () => {
  const valid: [BottleState, BottleState][] = [
    ['pending', 'packed'],
    ['packed', 'in_transit'],
    ['packed', 'pending'],
    ['packed', 'shelved'],
    ['in_transit', 'shelved'],
    ['in_transit', 'packed'],
    ['shelved', 'synced'],
  ]
  valid.forEach(([from, to]) => {
    it(`allows ${from} → ${to}`, () => expect(canTransition(from, to)).toBe(true))
  })

  const invalid: [BottleState, BottleState][] = [
    ['pending', 'in_transit'],
    ['pending', 'shelved'],
    ['pending', 'synced'],
    ['packed', 'synced'],
    ['in_transit', 'pending'],
    ['in_transit', 'synced'],
    ['shelved', 'pending'],
    ['shelved', 'packed'],
    ['synced', 'pending'],
    ['synced', 'packed'],
  ]
  invalid.forEach(([from, to]) => {
    it(`blocks ${from} → ${to}`, () => expect(canTransition(from, to)).toBe(false))
  })
})

describe('transition', () => {
  it('returns the new state on valid transition', () => {
    expect(transition('pending', 'packed')).toBe('packed')
  })

  it('throws on invalid transition', () => {
    expect(() => transition('pending', 'synced')).toThrow('Invalid transition: pending → synced')
  })
})

describe('timestampField', () => {
  it('returns null for pending', () => expect(timestampField('pending')).toBeNull())
  it('returns packed_at for packed', () => expect(timestampField('packed')).toBe('packed_at'))
  it('returns in_transit_at for in_transit', () => expect(timestampField('in_transit')).toBe('in_transit_at'))
  it('returns shelved_at for shelved', () => expect(timestampField('shelved')).toBe('shelved_at'))
  it('returns synced_at for synced', () => expect(timestampField('synced')).toBe('synced_at'))
})
