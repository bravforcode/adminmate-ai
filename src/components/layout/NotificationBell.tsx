import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { notificationService, type Notification } from '../../services/notificationService'
import { cn } from '../../lib/utils'

export function NotificationBell() {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const count = useUIStore(s => s.notificationCount)
  const notifications = useUIStore(s => s.notifications)
  const setNotifications = useUIStore(s => s.setNotifications)
  const setNotificationCount = useUIStore(s => s.setNotificationCount)
  const addNotification = useUIStore(s => s.addNotification)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!profile?.id) {
      setNotifications([])
      setNotificationCount(0)
      return
    }

    let cancelled = false

    const loadNotifications = async () => {
      setLoading(true)
      try {
        const items = await notificationService.getNotifications(profile.id, 8)
        if (cancelled) return
        setNotifications(items)
        setNotificationCount(items.filter(item => !item.read).length)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadNotifications()

    const unsubscribe = notificationService.subscribeToNotifications(profile.id, (incoming) => {
      addNotification(incoming)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [profile?.id, addNotification, setNotificationCount, setNotifications])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [i18n.language],
  )

  const items = notifications.slice(0, 8)

  const markLocallyRead = (notificationId: string) => {
    const next = notifications.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item,
    )
    setNotifications(next)
    setNotificationCount(next.filter(item => !item.read).length)
  }

  const handleNotificationClick = async (notification: Notification) => {
    setActiveId(notification.id)
    try {
      if (!notification.read) {
        await notificationService.markAsRead(notification.id)
        markLocallyRead(notification.id)
      }

      setOpen(false)
      if (notification.link) {
        navigate(notification.link)
      }
    } finally {
      setActiveId(null)
    }
  }

  const handleMarkAllRead = async () => {
    if (!profile?.id || count === 0) return

    setMarkingAll(true)
    try {
      await notificationService.markAllAsRead(profile.id)
      const next = notifications.map((item) => ({ ...item, read: true }))
      setNotifications(next)
      setNotificationCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        type="button"
        aria-label={`${t('notifications_prefs.title')}${count > 0 ? ` (${count} ${t('notification_center.unread_count')})` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-tour="notifications"
        className="relative p-2 hover:text-primary dark:hover:text-accent-dim hover:bg-surface-container dark:hover:bg-surface-container-low rounded-lg transition-colors"
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1 }}
        onClick={() => setOpen(current => !current)}
      >
        <motion.div
          animate={count > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          <Bell size={20} className="text-on-surface-variant dark:text-on-surface-variant" />
        </motion.div>
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error text-xs rounded-full flex items-center justify-center font-bold"
          >
            {count > 9 ? '9+' : count}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('notification_center.title')}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-[min(92vw,24rem)] rounded-2xl border border-outline-variant bg-surface shadow-[0_24px_80px_rgba(15,23,42,0.18)] overflow-hidden z-50"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/70">
              <div>
                <p className="text-sm font-semibold text-on-surface">{t('notification_center.title')}</p>
                <p className="text-xs text-on-surface-variant">
                  {count > 0
                    ? t('notification_center.unread_summary', { count })
                    : t('notification_center.all_caught_up')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={markingAll || count === 0}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:text-on-surface-variant disabled:hover:bg-transparent"
              >
                <CheckCheck size={14} />
                {markingAll ? t('common:loading') : t('notification_center.mark_all_read')}
              </button>
            </div>

            <div className="max-h-[22rem] overflow-y-auto">
              {loading ? (
                <div className="px-4 py-10 text-sm text-center text-on-surface-variant">
                  {t('common:loading')}
                </div>
              ) : items.length === 0 ? (
                <div className="px-4 py-10 text-sm text-center text-on-surface-variant">
                  {t('notification_center.empty')}
                </div>
              ) : (
                items.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => void handleNotificationClick(notification)}
                    disabled={activeId === notification.id}
                    className={cn(
                      'w-full px-4 py-3 text-left border-b border-outline-variant/50 transition-colors hover:bg-surface-container-low',
                      !notification.read && 'bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-1.5 h-2.5 w-2.5 rounded-full shrink-0',
                          notification.read ? 'bg-outline-variant/60' : 'bg-primary',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-on-surface truncate">
                            {notification.title || t('notification_center.default_title')}
                          </p>
                          <span className="text-[11px] text-on-surface-variant whitespace-nowrap">
                            {formatter.format(new Date(notification.created_at))}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-outline-variant/70 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings/notifications')
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-on-surface hover:bg-surface-container-low"
              >
                {t('notification_center.manage')}
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
