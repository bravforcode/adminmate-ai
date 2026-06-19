/**
 * localStorage-backed storage adapter for Supabase auth.
 * Survives page reloads (OAuth redirect = full page reload).
 */
export const authStorage = {
  getItem: (key: string): string | null => {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      window.localStorage.setItem(key, value)
    } catch { /* localStorage may be full or unavailable */ }
  },
  removeItem: (key: string): void => {
    try {
      window.localStorage.removeItem(key)
    } catch { /* localStorage may be unavailable */ }
  },
}
