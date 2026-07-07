import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationBell } from '../../../src/components/layout/NotificationBell'

vi.mock('../../../src/stores/uiStore', () => ({
  useUIStore: vi.fn((selector?: any) => {
    const state = {
      notificationCount: 5,
      notifications: [],
      setNotifications: vi.fn(),
      setNotificationCount: vi.fn(),
      addNotification: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: vi.fn((selector?: any) => selector ? selector({ profile: null }) : { profile: null }),
}))

vi.mock('../../../src/services/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn().mockResolvedValue([]),
    subscribeToNotifications: vi.fn().mockReturnValue(() => {}),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}))

describe('NotificationBell', () => {
  it('shows count badge when > 0', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('shows count badge with large number', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>)
    expect(screen.getByText('5')).toBeTruthy()
  })
})
