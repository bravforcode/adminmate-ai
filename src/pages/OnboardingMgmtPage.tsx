import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useOnboardingChecklists } from '../hooks/useOnboarding'
import { useOffers } from '../hooks/useOffers'
import { useCreateChecklist, useUpdateTask, useRecalculateProgress } from '../hooks/useOnboarding'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/Button'
import { Check, Plus, Send, BookOpen, Heart, Scale, ExternalLink, Bot, Users } from 'lucide-react'
import { cn } from '../utils/cn'
import toast from 'react-hot-toast'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { Offer } from '../types/models'

export function OnboardingMgmtPage() {
  const { t } = useTranslation(['onboarding', 'common'])
  const navigate = useNavigate()
  const { data: checklists, isLoading, isError, error, refetch } = useOnboardingChecklists()
  const { data: offers } = useOffers()
  const createChecklist = useCreateChecklist()
  const updateTask = useUpdateTask()
  const recalc = useRecalculateProgress()
  const { profile, company } = useAuthStore()

  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([
    { role: 'bot', text: t('onboarding.ai.greeting') },
  ])
  const [input, setInput] = useState('')

  const acceptedOffers = offers?.filter((o: Offer) => o.status === 'accepted')

  const handleCreateChecklist = async (offer: Offer) => {
    try {
      await createChecklist.mutateAsync({ employeeId: offer.candidate_id ?? '', offerId: offer.id, country: company?.country || 'TH' })
      toast.success(t('create_success'))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('create_failed'))
    }
  }

  const handleToggleTask = async (task: { id: string; is_completed?: boolean; checklist_id?: string }) => {
    try {
      await updateTask.mutateAsync({ taskId: task.id, completed: !task.is_completed })
      await recalc.mutateAsync(task.checklist_id ?? '')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('update_failed'))
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return
    const userText = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase.functions.invoke('mate-ai-chat', {
        body: { question: userText, companyId: company?.id, language: profile?.language_preference || 'en' },
      })
      setMessages(prev => [...prev, { role: 'bot', text: data?.reply || t('onboarding.ai.fallback_reply') }])
    } catch (err) {
      if (import.meta.env.DEV) console.error('[OnboardingMgmtPage] AI chat failed:', err)
      setMessages(prev => [...prev, { role: 'bot', text: t('onboarding.ai.error_reply') }])
    }
  }

  const myChecklist = checklists?.find((c: { user_id?: string }) => c.user_id === profile?.id) || checklists?.[0]
  const myTasks = myChecklist?.onboarding_tasks?.sort((a: { order_index?: number }, b: { order_index?: number }) => (a.order_index ?? 0) - (b.order_index ?? 0)) || []
  const firstIncompleteIndex = myTasks.findIndex((t: { is_completed?: boolean }) => !t.is_completed)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface dark:text-[#f1f5f9]">{t('onboarding.hub')}</h1>
        <p className="text-body-md text-on-surface-variant dark:text-[#94a3b8] mt-1">{t('onboarding.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6 w-full min-w-0">
          <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface dark:text-[#f1f5f9] mb-4">{t('onboarding.my_checklist')}</h3>
            {myChecklist ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-on-surface-variant dark:text-[#94a3b8] mb-1">
                    <span>{t('onboarding.progress')}</span>
                    <span>{myChecklist.progress_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high dark:bg-[#334155] h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${myChecklist.progress_percentage || 0}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {myTasks.map((task: { id: string; task_name?: string; is_completed?: boolean; assigned_to?: string }, idx: number) => {
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
                          isCompleted && 'bg-surface-container-low dark:bg-[#1e3a5f] border-outline-variant dark:border-[#334155]',
                          isCurrent && 'bg-surface dark:bg-[#1e293b] border-primary dark:border-[#3b82f6] ring-1 ring-primary dark:ring-[#3b82f6]',
                          isUpcoming && 'bg-surface dark:bg-[#1e293b] border-outline-variant dark:border-[#334155] opacity-60 cursor-not-allowed'
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
                          <p className={cn('text-sm font-semibold dark:text-[#f1f5f9]', isCompleted && 'line-through text-on-surface-variant dark:text-[#94a3b8]')}>{task.task_name}</p>
                          {isCurrent && <p className="text-xs text-error mt-0.5">{t('onboarding.due_today')}</p>}
                          {isUpcoming && task.assigned_to && (
                            <p className="text-xs text-on-surface-variant mt-0.5">{t('onboarding.requires')} {task.assigned_to}</p>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="px-3 py-1 bg-primary text-on-primary text-xs font-medium rounded">
                            {t('onboarding.start')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-on-surface-variant dark:text-[#94a3b8] py-4">{t('onboarding.no_checklist')}</p>
            )}
          </div>

          <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
              <h3 className="text-title-lg font-semibold text-on-surface dark:text-[#f1f5f9]">{t('onboarding.team_status')}</h3>
              <Button variant="link" size="sm" onClick={() => navigate('/recruitment/candidates')}>{t('onboarding.view_all')}</Button>
            </div>
            {isError ? (
              <ErrorState
                title={t('onboarding.error_title')}
                message={(error as Error)?.message || t('onboarding.error_description')}
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <LoadingState variant="table" rows={4} message={t('common:loading')} />
            ) : (
              <div className="table-responsive overflow-x-auto -mx-6 px-6">
                {checklists && checklists.length > 0 ? (
                  <table role="table" className="table-card-mobile w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="bg-surface-container dark:bg-[#334155]/50 border-b border-outline-variant/50 dark:border-[#334155]/50">
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">{t('onboarding.employee')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">{t('onboarding.role')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">{t('onboarding.progress')}</th>
                        <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-[#94a3b8]">{t('onboarding.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklists?.map((cl: { id: string; template_name?: string; progress_percentage?: number; status?: string; user_profiles?: { full_name?: string } }) => (
                        <tr key={cl.id} className="border-b border-outline-variant/50 dark:border-[#334155]/50 hover:bg-surface-container-high/50 dark:hover:bg-[#334155]/30 transition-colors duration-150 last:border-0">
                          <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label={t('onboarding.employee')}>{cl.user_profiles?.full_name}</td>
                          <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9] text-on-surface-variant" data-label={t('onboarding.role')}>{cl.template_name}</td>
                          <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label={t('onboarding.progress')}>
                            <div className="flex items-center gap-2 w-24 sm:w-32">
                              <div className="flex-1 bg-surface-container dark:bg-[#334155] h-1.5 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', (cl.progress_percentage ?? 0) >= 80 ? 'bg-green-500' : (cl.progress_percentage ?? 0) >= 40 ? 'bg-primary' : 'bg-yellow-500')} style={{ width: `${cl.progress_percentage || 0}%` }} />
                              </div>
                              <span className="text-xs text-on-surface-variant dark:text-[#94a3b8]">{cl.progress_percentage || 0}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-on-surface dark:text-[#f1f5f9]" data-label={t('onboarding.status')}>
                            <span className={cn(
                              'inline-block px-2 py-0.5 rounded text-xs font-medium',
                              cl.status === 'completed' ? 'bg-green-100 dark:bg-[#052e16]/30 text-green-700 dark:text-[#4ade80]' : (cl.progress_percentage ?? 0) < 20 ? 'bg-error-container dark:bg-[#450a0a]/30 text-on-error-container dark:text-[#f87171]' : 'bg-surface-container-high dark:bg-[#334155] text-on-surface dark:text-[#f1f5f9]'
                            )}>
                              {cl.status === 'completed' ? t('onboarding.completed') : (cl.progress_percentage ?? 0) < 20 ? t('onboarding.at_risk') : t('onboarding.on_track')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState
                    icon={Users}
                    title={t('onboarding.empty_team_title')}
                    description={t('onboarding.empty_team_description')}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] shadow-sm flex flex-col h-[400px] overflow-hidden">
            <div className="bg-primary-container dark:bg-[#1e40af] p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-surface dark:bg-[#1e293b] flex items-center justify-center text-primary dark:text-[#93c5fd]">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-on-primary-container dark:text-[#f1f5f9]">Mate AI</h3>
                <p className="text-xs text-inverse-primary dark:text-[#94a3b8]">{t('onboarding.ai.hr_assistant')}</p>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-surface dark:bg-[#1e293b] flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-2', msg.role === 'user' && 'justify-end')}>
                  {msg.role === 'bot' && (
                    <div className="w-6 h-6 rounded bg-primary-container dark:bg-[#1e40af] text-on-primary dark:text-[#93c5fd] flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} />
                    </div>
                  )}
                  <div className={cn(
                    'p-2 rounded-lg text-sm max-w-[85%]',
                    msg.role === 'bot' ? 'bg-surface-container-low dark:bg-[#1e3a5f] rounded-tl-none text-on-surface dark:text-[#f1f5f9]' : 'bg-primary dark:bg-[#3b82f6] text-on-primary dark:text-[#fff] rounded-tr-none'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 bg-surface dark:bg-[#1e293b] border-t border-outline-variant dark:border-[#334155] flex gap-2 items-center">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder={t('onboarding.ai.ask_question')}
                className="flex-1 bg-surface-container dark:bg-[#0f172a] border-none rounded-full px-4 py-2 text-sm text-on-surface dark:text-[#f1f5f9] focus:ring-1 focus:ring-primary outline-none"
              />
              <Button
                variant="default"
                size="icon_md"
                radius="pill"
                onClick={handleSendMessage}
                icon={<Send size={18} />}
              />
            </div>
          </div>

          <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface dark:text-[#f1f5f9] mb-4">{t('onboarding.quick_resources')}</h3>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/documents?type=handbook')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high dark:hover:bg-[#334155] transition-colors text-on-surface dark:text-[#f1f5f9] group">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-outline-variant dark:text-[#64748b] group-hover:text-primary dark:group-hover:text-[#93c5fd]" />
                    <span className="text-sm">{t('onboarding.resources.handbook')}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant dark:text-[#64748b]" />
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/documents?type=health_insurance')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high dark:hover:bg-[#334155] transition-colors text-on-surface dark:text-[#f1f5f9] group">
                  <div className="flex items-center gap-2">
                    <Heart size={18} className="text-outline-variant dark:text-[#64748b] group-hover:text-primary dark:group-hover:text-[#93c5fd]" />
                    <span className="text-sm">{t('onboarding.resources.health_benefits')}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant dark:text-[#64748b]" />
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/documents?type=company_policy')} className="w-full flex items-center justify-between p-2 rounded hover:bg-surface-container-high dark:hover:bg-[#334155] transition-colors text-on-surface dark:text-[#f1f5f9] group">
                  <div className="flex items-center gap-2">
                    <Scale size={18} className="text-outline-variant dark:text-[#64748b] group-hover:text-primary dark:group-hover:text-[#93c5fd]" />
                    <span className="text-sm">{t('onboarding.resources.labor_law')}</span>
                  </div>
                  <ExternalLink size={14} className="text-outline-variant dark:text-[#64748b]" />
                </button>
              </li>
            </ul>
          </div>

          <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6 shadow-sm">
            <h3 className="text-title-lg font-semibold text-on-surface dark:text-[#f1f5f9] mb-3">{t('onboarding.accepted_offers')}</h3>
            {acceptedOffers && acceptedOffers.length > 0 ? (
              acceptedOffers.map((offer: Offer) => (
                <div key={offer.id} className="flex items-center justify-between py-2 border-b border-outline-variant dark:border-[#334155] last:border-0">
                  <div>
                    <p className="text-sm font-medium dark:text-[#f1f5f9]">{offer.candidates?.full_name}</p>
                    <p className="text-xs text-on-surface-variant dark:text-[#94a3b8]">{offer.position_title}</p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleCreateChecklist(offer)}
                    disabled={createChecklist.isPending}
                    icon={<Plus size={12} />}
                  >
                    {t('onboarding.create_checklist')}
                  </Button>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Users}
                title={t('onboarding.no_offers')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingMgmtPage
