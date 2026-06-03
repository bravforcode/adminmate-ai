import { describe, it, expect } from 'vitest'
import { formatDateLocal, daysBetween, addDays, parseISO } from '../../../src/utils/date'

describe('date utils', () => {
  it('formatDateLocal: formats date for Bangkok timezone', () => {
    const result = formatDateLocal(new Date('2024-06-15T10:00:00Z'), 'dd/MM/yyyy', 'Asia/Bangkok')
    expect(result).toBe('15/06/2024')
  })

  it('daysBetween: calculates correct difference', () => {
    expect(daysBetween('2024-01-01', '2024-01-05')).toBe(4)
  })

  it('addDays: adds days correctly', () => {
    const result = addDays(new Date('2024-01-01'), 7)
    expect(result.toISOString().split('T')[0]).toBe('2024-01-08')
  })
})
