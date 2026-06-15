import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { CheckCircle, Circle, ClipboardList } from 'lucide-react'
import { EmptyState } from '../../components/shared/EmptyState'
import { ErrorState } from '../../components/shared/ErrorState'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

interface OnboardingTask {
  id: string
  task_name: string
  task_name_en: string | null
  description: string | null
  category: string | null
  timeframe: string | null
  order_index: number
  is_completed: boolean
  completed_at: string | null
}

interface OnboardingChecklist {
  id: string
  template_name: string | null
  status: string
  progress_percentage: number
  start_date: string | null
  target_completion_date: string | null
  onboarding_tasks: OnboardingTask[]
}

export function MyTasksPage() {
  const profile = useAuthStore(s => s.profile)
  const qc = useQueryClient()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const { data: checklists, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-onboarding', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .select('*, onboarding_tasks(*)')
        .eq('employee_id', profile.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as OnboardingChecklist[]
    },
    enabled: !!profile?.id,
  })

  const toggleTask = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? profile?.id : null,
        })
        .eq('id', taskId)
      if (error) throw error

      // recalculate progress on the checklist
      const checklist = checklists?.find(c => c.onboarding_tasks.some(t => t.id === taskId))
      if (checklist) {
        const updatedTasks = checklist.onboarding_tasks.map(t =>
          t.id === taskId ? { ...t, is_completed: completed } : t
        )
        const pct = updatedTasks.length
          ? Math.round((updatedTasks.filter(t => t.is_completed).length / updatedTasks.length) * 100)
          : 0
        await supabase
          .from('onboarding_checklists')
          .update({ progress_percentage: pct, status: pct === 100 ? 'completed' : 'in_progress' })
          .eq('id', checklist.id)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-onboarding', profile?.id] })
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update task'),
  })

  if (isLoading) {
    return (
      <div className="space-y-4 skeleton-stagger">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="bg-surface rounded-xl border border-outline-variant p-5">
            <div className="h-4 w-48 bg-surface-container-high rounded-lg animate-shimmer mb-3" />
            <div className="h-3 w-32 bg-surface-container-high rounded-lg animate-shimmer" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load tasks"
        message="We could not load your onboarding tasks."
        onRetry={() => refetch()}
      />
    )
  }

  // Flatten all tasks across all checklists
  const allTasks = checklists?.flatMap(c => c.onboarding_tasks) ?? []
  const categories = [...new Set(allTasks.map(t => t.category).filter(Boolean))] as string[]
  const filtered = activeCategory
    ? allTasks.filter(t => t.category === activeCategory)
    : allTasks
  const sorted = [...filtered].sort((a, b) => a.order_index - b.order_index)
  const completedCount = allTasks.filter(t => t.is_completed).length
  const progress = allTasks.length ? Math.round((completedCount / allTasks.length) * 100) : 0

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">My Onboarding Tasks</h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          Complete these tasks to finish your onboarding
        </p>
      </div>

      {checklists?.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks assigned yet"
          description="Your HR team will assign onboarding tasks once your offer is accepted."
        />
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-on-surface">Overall Progress</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              {completedCount} of {allTasks.length} tasks completed
            </p>
          </div>

          {/* Category filter tabs */}
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors',
                  activeCategory === null
                    ? 'bg-primary text-on-primary border-primary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize',
                    activeCategory === cat
                      ? 'bg-primary text-on-primary border-primary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Task list */}
          <div className="space-y-3">
            {sorted.map(task => (
              <div
                key={task.id}
                className={cn(
                  'bg-surface rounded-xl border shadow-sm p-5 flex items-start gap-4 transition-all',
                  task.is_completed
                    ? 'border-green-200 bg-green-50/40'
                    : 'border-outline-variant hover:border-primary/40'
                )}
              >
                <button
                  onClick={() => toggleTask.mutate({ taskId: task.id, completed: !task.is_completed })}
                  disabled={toggleTask.isPending}
                  className="flex-shrink-0 mt-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                  aria-label={task.is_completed ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.is_completed ? (
                    <CheckCircle size={22} className="text-green-600" />
                  ) : (
                    <Circle size={22} className="text-on-surface-variant" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-on-surface',
                    task.is_completed && 'line-through text-on-surface-variant'
                  )}>
                    {task.task_name}
                  </p>
                  {task.task_name_en && task.task_name_en !== task.task_name && (
                    <p className="text-xs text-on-surface-variant mt-0.5">{task.task_name_en}</p>
                  )}
                  {task.description && (
                    <p className="text-sm text-on-surface-variant mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {task.timeframe && (
                      <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-medium">
                        {task.timeframe}
                      </span>
                    )}
                    {task.category && (
                      <span className="text-xs text-on-surface-variant capitalize">{task.category}</span>
                    )}
                    {task.is_completed && task.completed_at && (
                      <span className="text-xs text-green-600">
                        Completed {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default MyTasksPage
