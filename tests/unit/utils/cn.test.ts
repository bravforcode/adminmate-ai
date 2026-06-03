import { describe, it, expect } from 'vitest'
import { cn } from '../../../src/utils/cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('filters falsy values', () => {
    expect(cn('text-sm', false && 'hidden', undefined, 'font-bold')).toBe('text-sm font-bold')
  })

  it('handles conditional classes', () => {
    const active = true
    const disabled = false
    expect(cn('base', active && 'bg-primary', disabled && 'opacity-50')).toBe('base bg-primary')
  })

  it('resolves tailwind conflicts via twMerge', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })
})
