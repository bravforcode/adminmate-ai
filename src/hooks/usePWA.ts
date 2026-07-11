import { useState, useEffect, useCallback } from 'react'

/* ============================================================
   PWA Hook
   Manages service worker registration, push subscriptions,
   and offline action queueing.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

interface PWAState {
  isOnline: boolean
  isInstallable: boolean
  isInstalled: boolean
  pushSubscription: PushSubscription | null
  pendingActions: number
}

interface OfflineAction {
  type: string
  payload: Record<string, unknown>
  timestamp: number
}

// ── Hook ────────────────────────────────────────────────────

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstallable: false,
    isInstalled: false,
    pushSubscription: null,
    pendingActions: 0,
  })

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setState(s => ({ ...s, isOnline: true }))
    const handleOffline = () => setState(s => ({ ...s, isOnline: false }))

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setState(s => ({ ...s, isInstallable: true }))
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setState(s => ({ ...s, isInstalled: true }))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Listen for synced actions
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_ACTION_SYNCED') {
        setState(s => ({ ...s, pendingActions: Math.max(0, s.pendingActions - 1) }))
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [])

  // Install PWA
  const install = useCallback(async () => {
    const promptEvent = new Event('beforeinstallprompt') as any
    if (promptEvent.prompt) {
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      if (outcome === 'accepted') {
        setState(s => ({ ...s, isInstalled: true, isInstallable: false }))
      }
    }
  }, [])

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (vapidPublicKey: string) => {
    const registration = await navigator.serviceWorker?.ready
    if (!registration) return null

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidPublicKey,
    })

    setState(s => ({ ...s, pushSubscription: subscription }))
    return subscription
  }, [])

  // Queue action for offline sync
  const queueOfflineAction = useCallback(async (action: OfflineAction) => {
    const registration = await navigator.serviceWorker?.ready
    if (!registration) return

    registration.active?.postMessage({
      type: 'QUEUE_OFFLINE_ACTION',
      action,
    })

    setState(s => ({ ...s, pendingActions: s.pendingActions + 1 }))
  }, [])

  // Get pending offline actions count
  const getPendingActionsCount = useCallback(async (): Promise<number> => {
    if (!('caches' in window)) return 0

    try {
      const cache = await caches.open('adminmate-offline-v2')
      const requests = await cache.keys()
      return requests.filter(r => r.url.includes('/offline-action/')).length
    } catch {
      return 0
    }
  }, [])

  // Refresh pending count on mount
  useEffect(() => {
    getPendingActionsCount().then(count => {
      setState(s => ({ ...s, pendingActions: count }))
    })
  }, [getPendingActionsCount])

  return {
    ...state,
    install,
    subscribeToPush,
    queueOfflineAction,
    getPendingActionsCount,
  }
}
