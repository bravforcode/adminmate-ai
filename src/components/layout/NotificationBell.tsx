import { motion } from 'motion/react'
import { Bell } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'

export function NotificationBell() {
  const count = useUIStore(s => s.notificationCount)

  return (
    <motion.button
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
      className="relative p-2 hover:text-primary dark:hover:text-[#93c5fd] hover:bg-surface-container dark:hover:bg-[#1e3a5f] rounded-lg transition-colors"
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.1 }}
    >
      <motion.div
        animate={count > 0 ? { rotate: [0, -12, 12, -8, 8, 0] } : {}}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
      >
        <Bell size={20} className="text-on-surface-variant dark:text-[#94a3b8]" />
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
  )
}
