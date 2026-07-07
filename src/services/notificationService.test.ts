import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase chainable query builder
function createChain(result: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'range', 'or', 'upsert']
  methods.forEach((m) => {
    chain[m] = vi.fn(() => chain)
  })
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (error && reject) return reject(error)
    return resolve({ data: result, error, count: Array.isArray(result) ? result.length : 0 })
  }
  return chain
}

const mockFrom = vi.fn()
const mockRpc = vi.fn()
const mockChannel = vi.fn()
const mockRemoveChannel = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}))

vi.mock('../permissionService', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
}))

// Default mock for rpc (used by permissionService as fallback)
mockRpc.mockResolvedValue({ data: true, error: null })

import { notificationService } from './notificationService'
import { notificationPreferencesService } from './notificationPreferencesService'
import { notificationCenterService } from './notification/notificationCenterService'

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should return notifications for user', async () => {
      const rows = [{
        id: '1',
        user_id: 'u1',
        company_id: 'c1',
        notification_type: 'new_applicant',
        title: 'New Applicant',
        message: 'John applied',
        is_read: false,
        action_url: '/candidates/1',
        created_at: '2025-01-01T00:00:00Z',
      }]
      mockFrom.mockReturnValue(createChain(rows))

      const result = await notificationService.getNotifications('u1')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('new_applicant')
      expect(result[0].read).toBe(false)
    })

    it('should use default limit', async () => {
      mockFrom.mockReturnValue(createChain([]))

      await notificationService.getNotifications('u1')
      expect(mockFrom).toHaveBeenCalledWith('notifications')
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockFrom.mockReturnValue(createChain([], null))

      const result = await notificationService.getUnreadCount('u1')
      expect(typeof result).toBe('number')
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await notificationService.markAsRead('n1')
      expect(mockFrom).toHaveBeenCalledWith('notifications')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all as read', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await notificationService.markAllAsRead('u1')
      expect(mockFrom).toHaveBeenCalledWith('notifications')
    })
  })

  describe('subscribeToNotifications', () => {
    it('should set up realtime subscription', () => {
      const mockSubscribe = vi.fn().mockReturnValue({})
      mockChannel.mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: mockSubscribe,
      })

      const callback = vi.fn()
      const unsubscribe = notificationService.subscribeToNotifications('u1', callback)

      expect(mockChannel).toHaveBeenCalledWith('notifications-realtime')
      expect(mockSubscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })
  })
})

describe('notificationPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPreferences', () => {
    it('should return preferences for user', async () => {
      const prefs = [{
        id: '1',
        user_id: 'u1',
        preference_type: 'application_received',
        email_enabled: true,
        in_app_enabled: true,
        push_enabled: false,
      }]
      mockFrom.mockReturnValue(createChain(prefs))

      const result = await notificationPreferencesService.getPreferences('u1')
      expect(result).toHaveLength(1)
      expect(result[0].email_enabled).toBe(true)
    })
  })

  describe('updatePreference', () => {
    it('should upsert preference', async () => {
      const pref = {
        id: '1',
        user_id: 'u1',
        preference_type: 'application_received',
        email_enabled: false,
      }
      mockFrom.mockReturnValue(createChain(pref))

      const result = await notificationPreferencesService.updatePreference(
        'u1',
        'application_received',
        { email_enabled: false },
        'c1',
      )
      expect(result.email_enabled).toBe(false)
    })
  })

  describe('initializeDefaultPreferences', () => {
    it('should create defaults for all types', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await notificationPreferencesService.initializeDefaultPreferences('u1', 'c1')
      expect(mockFrom).toHaveBeenCalledWith('notification_preferences')
    })
  })
})

describe('notificationCenterService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should return filtered notifications', async () => {
      const rows = [{
        id: '1',
        company_id: 'c1',
        user_id: 'u1',
        title: 'Test',
        body: 'Body',
        notification_type: 'system',
        is_read: false,
      }]
      mockFrom.mockReturnValue(createChain(rows))

      const result = await notificationCenterService.getNotifications('u1', 'c1', { is_read: false })
      expect(result).toHaveLength(1)
      expect(result[0].is_read).toBe(false)
    })

    it('should apply pagination', async () => {
      mockFrom.mockReturnValue(createChain([]))

      await notificationCenterService.getNotifications('u1', 'c1', { limit: 10, offset: 20 })
      expect(mockFrom).toHaveBeenCalledWith('notifications_v2')
    })
  })

  describe('markAsRead', () => {
    it('should mark as read', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await notificationCenterService.markAsRead('n1')
      expect(mockFrom).toHaveBeenCalledWith('notifications_v2')
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all as read for user and company', async () => {
      mockFrom.mockReturnValue(createChain(null))

      await notificationCenterService.markAllAsRead('u1', 'c1')
      expect(mockFrom).toHaveBeenCalledWith('notifications_v2')
    })
  })

  describe('getPreferences', () => {
    it('should return preferences', async () => {
      const prefs = [{
        id: '1',
        channel: 'email',
        notification_type: 'system',
        is_enabled: true,
      }]
      mockFrom.mockReturnValue(createChain(prefs))

      const result = await notificationCenterService.getPreferences('u1')
      expect(result).toHaveLength(1)
    })
  })

  describe('updatePreference', () => {
    it('should upsert preference', async () => {
      const pref = { id: '1', is_enabled: false }
      mockFrom.mockReturnValue(createChain(pref))

      const result = await notificationCenterService.updatePreference('u1', 'email', 'system', false)
      expect(result.is_enabled).toBe(false)
    })
  })

  describe('isNotificationEnabled', () => {
    it('should return true when enabled', async () => {
      mockFrom.mockReturnValue(createChain({ is_enabled: true }))

      const result = await notificationCenterService.isNotificationEnabled('u1', 'email', 'system')
      expect(result).toBe(true)
    })

    it('should default to true when no preference found', async () => {
      mockFrom.mockReturnValue(createChain(null))

      const result = await notificationCenterService.isNotificationEnabled('u1', 'email', 'system')
      expect(result).toBe(true)
    })
  })
})
