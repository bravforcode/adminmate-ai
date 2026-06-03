import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../../../src/utils/currency'

describe('formatCurrency', () => {
  it('formats THB correctly', () => {
    const result = formatCurrency(50000, 'THB')
    expect(result).toContain('50,000')
  })

  it('formats VND correctly', () => {
    const result = formatCurrency(10000000, 'VND')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(5)
  })

  it('formats IDR correctly', () => {
    const result = formatCurrency(8000000, 'IDR')
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(5)
  })
})
