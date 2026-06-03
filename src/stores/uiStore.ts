import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  notificationCount: number
  language: string
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  openModal: (name: string) => void
  closeModal: () => void
  setNotificationCount: (count: number) => void
  setLanguage: (lang: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeModal: null,
  notificationCount: 0,
  language: 'th',
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),
  setNotificationCount: (count) => set({ notificationCount: count }),
  setLanguage: (lang) => set({ language: lang }),
}))
