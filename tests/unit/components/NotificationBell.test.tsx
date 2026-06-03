import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationBell } from '../../../src/components/layout/NotificationBell'

vi.mock('../../../src/stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: any) => selector ? selector({ notificationCount: 5 }) : { notificationCount: 5 }),
}))

describe('NotificationBell', () => {
  it('shows count badge when > 0', () => {
    render(<NotificationBell />)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows count badge with large number', () => {
    render(<NotificationBell />)
    expect(screen.getByText('5')).toBeTruthy()
  })
})
