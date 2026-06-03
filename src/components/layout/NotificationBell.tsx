import { Bell } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

export function NotificationBell() {
  const count = useUIStore(s => s.notificationCount)

  return (
    <button className="relative p-2 hover:text-primary hover:bg-surface-container rounded-lg transition-colors">
      <Bell size={20} className="text-on-surface-variant" />
      {count > 0 && (
        <span className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error text-xs rounded-full flex items-center justify-center font-bold">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}
