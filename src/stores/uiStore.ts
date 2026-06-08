import { create } from 'zustand'
import type { Notification } from '../services/notificationService'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  notificationCount: number
  notifications: Notification[]
  language: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (name: string) => void
  closeModal: () => void
  setNotificationCount: (count: number) => void
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  setLanguage: (lang: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  notificationCount: 0,
  notifications: [],
  language: 'th',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      notificationCount: s.notificationCount + 1,
    })),
  setLanguage: (lang) => set({ language: lang }),
}))
