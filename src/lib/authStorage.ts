const memoryStore: Record<string, string> = {}

export const authStorage = {
  getItem: (key: string) => {
    return memoryStore[key] || null
  },
  setItem: (key: string, value: string) => {
    memoryStore[key] = value
  },
  removeItem: (key: string) => {
    delete memoryStore[key]
  },
}
