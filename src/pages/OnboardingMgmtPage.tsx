import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useOnboardingChecklists } from '../hooks/useOnboarding'
import { useOffers } from '../hooks/useOffers'
import { useCreateChecklist, useUpdateTask, useRecalculateProgress } from '../hooks/useOnboarding'
import { useAuthStore } from '../stores/authStore'
import { Check, Circle, Plus, ChevronRight, X, Send, BookOpen, Heart, Scale, ExternalLink, Bot } from 'lucide-react'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'

export function OnboardingMgmtPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: checklists, isLoading } = useOnboardingChecklists()
  const { data: offers } = useOffers()
  const createChecklist = useCreateChecklist()
  const updateTask = useUpdateTask()
  const recalc = useRecalculateProgress()
  const { profile, company } = useAuthStore()

  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: "Hello! I'm Mate AI. How can I help you with your onboarding or policies today?" },
  ])
  const [input, setInput] = useState('')

  const acceptedOffers = offers?.filter((o: any) => o.status === 'accepted')

  const handleCreateChecklist = async (offer: any) => {
    try {
      await createChecklist.mutateAsync({ employeeId: offer.candidate_id, offerId: offer.id, country: company?.country || 'TH' })
      toast.success('Checklist created successfully')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create checklist')
    }
  }

  const handleToggleTask = async (task: any) => {
    await updateTask.mutateAsync({ taskId: task.id, completed: !task.is_completed })
    await recalc.mutateAsync(task.checklist_id)
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const userText = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase.functions.invoke('mate-ai-chat', {
        body: { message: userText, companyId: company?.id, context: 'onboarding' },
      })
      setMessages(prev => [...prev, { role: 'bot', text: data?.reply || "I'll look into that for you. Try asking about work hours, leave policy, or benefits." }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I couldn't process that. Please try again or check the Quick Resources section." }])
    }
  }

  const myChecklist = checklists?.find((c: any) => c.user_id === profile?.id) || checklists?.[0]
  const myTasks = myChecklist?.onboarding_tasks?.sort((a: any, b: any) => a.order_index - b.order_index) || []
  const firstIncompleteIndex = myTasks.findIndex((t: any) => !t.is_completed)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">{t('onboarding.hub') || 'Onboarding Hub'}</h1>
        <p className="text-body-md text-on-surface-variant mt-1">{t('onboarding.subtitle') || 'Manage new hires and access AI knowledge.'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* My Onboarding Checklist */}
          <div className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">{t('onboarding.my_checklist') || 'My Onboarding Checklist'}</h3>
            {myChecklist ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-on-surface-variant mb-1">
                    <span>{t('onboarding.progress') || 'Progress'}</span>
                    <span>{myChecklist.progress_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${myChecklist.progress_percentage || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {myTasks.map((task: any, idx: number) => {
                    const isCompleted = task.is_completed
                    const isCurrent = !isCompleted && idx === firstIncompleteIndex
                    const isUpcoming = !isCompleted && idx !== firstIncompleteIndex

                    return (
                      <button
                        key={task.id}
                        onClick={() => !isUpcoming && handleToggleTask(task)}
                        disabled={isUpcoming}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                          isCompleted && 'bg-surface-container-low border-outline-variant',
                          isCurrent && 'bg-surface border-primary ring-1 ring-primary',
                          isUpcoming && 'bg-surface border-outline-variant opacity-60 cursor-not-allowed'
                        )}
                      >
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                          isCompleted && 'bg-primary text-on-primary',
                          isCurrent && 'border-2 border-primary text-primary',
                          isUpcoming && 'border-2 border-outline-variant'
                        )}>
                          {isCompleted ? <Check size={14} /> : isCurrent ? <div className="w-2 h-2 bg-primary rounded-full" /> : null}
                        </div>
                        <div className="flex-1">
                          <p className={cn('text-sm font-semibold', isCompleted && 'line-through text-on-surface-variant')}>{task.task_name}</p>
                          {isCurrent && <p className="text-xs text-error mt-0.5">{t('onboarding.due_today') || 'Due Today'}</p>}
                          {isUpcoming && task.assigned_to && (
                            <p className="text-xs text-on-surface-variant mt-0.5">{t('onboarding.requires') || 'Requires'} {task.assigned_to}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="px-3 py-1 bg-primary text-on-primary text-xs font-medium rounded">
                            {t('onboarding.start') || 'Start'}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant py-4">{t('onboarding.no_checklist') || 'No active checklist.'}</p>
            )}
          </div>

          {/* Team Onboarding Status */}
          <div className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-title-lg font-semibold text-on-surface">{t('onboarding.team_status') || 'Team Onboarding Status'}</h3>
              <button className="text-sm text-primary hover:underline">{t('common.view_all') || 'View All'}</button>
            </div>
            {isLoading ? (
              <div className="text-center py-12 text-on-surface-variant">{t('common.loading') || 'Loading...'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="py-2 px-3 text-xs font-semibold text-on-surface-variant">{t('onboarding.employee') || 'Employee'}</th>
                      <th className="py-2 px-3 text-xs font-semibold text-on-surface-variant">{t('onboarding.role') || 'Role'}</th>
                      <th className="py-2 px-3 text-xs font-semibold text-on-surface-variant">{t('onboarding.progress') || 'Progress'}</th>
                      <th className="py-2 px-3 text-xs font-semibold text-on-surface-variant">{t('onboarding.status') || 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklists?.map((cl: any) => (
                      <tr key={cl.id} className="border-b border-surface-container last:border-0">
                        <td className="py-3 px-3 text-sm text-on-surface">{cl.user_profiles?.full_name}</td>
                        <td className="py-3 px-3 text-sm text-on-surface-variant">{cl.template_name}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 bg-surface-container h-1.5 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', cl.progress_percentage >= 80 ? 'bg-green-500' : cl.progress_percentage >= 40 ? 'bg-primary' : 'bg-yellow-500')} style={{ width: `${cl.progress_percentage || 0}%` }} />
                            </div>
                            <span className="text-xs text-on-surface-variant">{cl.progress_percentage || 0}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-medium',
                            cl.status === 'completed' ? 'bg-green-100 text-green-700' : cl.progress_percentage < 20 ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface'
                          )}>
                            {cl.status === 'completed' ? (t('onboarding.completed') || 'Completed') : cl.progress_percentage < 20 ? (t('onboarding.at_risk') || 'At Risk') : (t('onboarding.on_track') || 'On Track')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!checklists?.length && <p className="text-sm text-on-surface-variant py-4 text-center">{t('onboarding.no_team') || 'No team onboardings found.'}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Chat Assistant */}
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col h-[400px] overflow-hidden">
            <div className="bg-primary-container p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-surface flex items-center justify-center text-primary">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-primary-container">Mate AI</h3>
                <p className="text-xs text-inverse-primary">{t('ai.hr_assistant') || 'HR Knowledge Assistant'}</p>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-surface flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'justify-end')}>
                  {msg.role === 'bot' && (
                    <div className="w-6 h-6 rounded bg-primary-container text-on-primary flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className={cn(
                    'p-2 rounded-lg text-sm max-w-[85%]',
                    msg.role === 'bot' ? 'bg-surface-container-low rounded-tl-none text-on-surface' : 'bg-primary text-on-primary rounded-tr-none'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 bg-surface border-t border-outline-variant flex gap-2 items-center">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('ai.ask_question') || 'Ask a question...'}
                className="flex-1 bg-surface-container border-none rounded-full px-4 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 hover:bg-primary-fixed-variant transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Quick Resources */}
          <div className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-4">{t('onboarding.quick_resources') || 'Quick Resources'}</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/documents?type=handbook')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high transition-colors text-on-surface group">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-outline-variant group-hover:text-primary" />
                    <span className="text-sm">{t('resources.handbook') || 'Employee Handbook'}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant" />
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/documents?type=health_insurance')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high transition-colors text-on-surface group">
                  <div className="flex items-center gap-2">
                    <Heart size={18} className="text-outline-variant group-hover:text-primary" />
                    <span className="text-sm">{t('resources.health_benefits') || 'Health Benefits Info'}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant" />
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/documents?type=company_policy')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high transition-colors text-on-surface group">
                  <div className="flex items-center gap-2">
                    <Scale size={18} className="text-outline-variant group-hover:text-primary" />
                    <span className="text-sm">{t('resources.labor_law') || 'Local Labor Law FAQ'}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant" />
                </button>
              </li>
            </ul>
          </div>

          {/* Accepted Offers (preserved functionality) */}
          <div className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface mb-3">{t('offers.accepted') || 'Accepted Offers'}</h3>
            {acceptedOffers?.map((offer: any) => (
              <div key={offer.id} className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0">
                <div>
                  <p className="text-sm font-medium">{offer.candidates?.full_name}</p>
                  <p className="text-xs text-on-surface-variant">{offer.position_title}</p>
                </div>
                <button
                  onClick={() => handleCreateChecklist(offer)}
                  disabled={createChecklist.isPending}
                  className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded text-xs font-medium hover:opacity-90 disabled:opacity-50"
                >
                  <Plus size={12} /> {t('onboarding.create_checklist') || 'Create Checklist'}
                </button>
              </div>
            ))}
            {!acceptedOffers?.length && <p className="text-sm text-on-surface-variant py-4">{t('offers.no_accepted') || 'No accepted offers to create checklists for'}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingMgmtPage
