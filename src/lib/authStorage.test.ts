import { describe, it, expect, beforeEach } from 'vitest'
import { authStorage } from './authStorage'

describe('authStorage', () => {
  beforeEach(() => {
    authStorage.removeItem('test-key')
  })

  it('should return null for non-existent keys', () => {
    expect(authStorage.getItem('nonexistent')).toBeNull()
  })

  it('should store and retrieve values', () => {
    authStorage.setItem('test-key', 'test-value')
    expect(authStorage.getItem('test-key')).toBe('test-value')
  })

  it('should overwrite existing values', () => {
    authStorage.setItem('test-key', 'value-1')
    authStorage.setItem('test-key', 'value-2')
    expect(authStorage.getItem('test-key')).toBe('value-2')
  })

  it('should remove values', () => {
    authStorage.setItem('test-key', 'test-value')
    authStorage.removeItem('test-key')
    expect(authStorage.getItem('test-key')).toBeNull()
  })

  it('should handle multiple keys independently', () => {
    authStorage.setItem('key-a', 'value-a')
    authStorage.setItem('key-b', 'value-b')
    expect(authStorage.getItem('key-a')).toBe('value-a')
    expect(authStorage.getItem('key-b')).toBe('value-b')
    authStorage.removeItem('key-a')
    expect(authStorage.getItem('key-a')).toBeNull()
    expect(authStorage.getItem('key-b')).toBe('value-b')
  })
})
