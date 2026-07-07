import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { TourOverlay } from './TourOverlay'

interface TourStep {
  target: string
  titleKey: string
  contentKey: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const HR_TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="sidebar"]', titleKey: 'tour.sidebar.title', contentKey: 'tour.sidebar.content', placement: 'right' },
  { target: '[data-tour="search"]', titleKey: 'tour.search.title', contentKey: 'tour.search.content', placement: 'bottom' },
  { target: '[data-tour="notifications"]', titleKey: 'tour.notifications.title', contentKey: 'tour.notifications.content', placement: 'bottom' },
  { target: '[data-tour="language"]', titleKey: 'tour.language.title', contentKey: 'tour.language.content', placement: 'bottom' },
  { target: '[data-tour="chatbot"]', titleKey: 'tour.chatbot.title', contentKey: 'tour.chatbot.content', placement: 'left' },
  { target: '[data-tour="dashboard-stats"]', titleKey: 'tour.dashboard.title', contentKey: 'tour.dashboard.content', placement: 'bottom' },
  { target: '[data-tour="quick-actions"]', titleKey: 'tour.quickActions.title', contentKey: 'tour.quickActions.content', placement: 'top' },
  { target: '[data-tour="jobs-table"]', titleKey: 'tour.jobs.title', contentKey: 'tour.jobs.content', placement: 'top' },
  { target: '[data-tour="candidates-table"]', titleKey: 'tour.candidates.title', contentKey: 'tour.candidates.content', placement: 'top' },
  { target: '[data-tour="pipeline-board"]', titleKey: 'tour.pipeline.title', contentKey: 'tour.pipeline.content', placement: 'bottom' },
  { target: '[data-tour="add-new-button"]', titleKey: 'tour.addNew.title', contentKey: 'tour.addNew.content', placement: 'left' },
  { target: '[data-tour="settings-menu"]', titleKey: 'tour.settings.title', contentKey: 'tour.settings.content', placement: 'right' },
  { target: '[data-tour="billing-section"]', titleKey: 'tour.billing.title', contentKey: 'tour.billing.content', placement: 'bottom' },
  { target: '[data-tour="documents-upload"]', titleKey: 'tour.documents.title', contentKey: 'tour.documents.content', placement: 'bottom' },
  { target: '[data-tour="reports-charts"]', titleKey: 'tour.reports.title', contentKey: 'tour.reports.content', placement: 'top' },
  { target: '[data-tour="leave-balance"]', titleKey: 'tour.leave.title', contentKey: 'tour.leave.content', placement: 'bottom' },
  { target: '[data-tour="onboarding-checklist"]', titleKey: 'tour.onboarding.title', contentKey: 'tour.onboarding.content', placement: 'bottom' },
  { target: '[data-tour="profile-section"]', titleKey: 'tour.profile.title', contentKey: 'tour.profile.content', placement: 'right' },
]

export const TOUR_KEY_PREFIX = 'adminmate_tour_completed_'
export const TOUR_IDS = ['onboarding', 'dashboard', 'jobs', 'candidates', 'pipeline', 'settings', 'documents', 'reports', 'leave', 'onboarding-hr'] as const

export function getTourKey(tourId: string): string {
  return `${TOUR_KEY_PREFIX}${tourId}`
}

export function resetAllTours() {
  TOUR_IDS.forEach(id => localStorage.removeItem(getTourKey(id)))
}

export function OnboardingTour() {
  const { t } = useTranslation('common')
  const profile = useAuthStore(s => s.profile)
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const allSteps = HR_TOUR_STEPS

  const findNextValidStep = useCallback((stepIndex: number, steps: TourStep[]): number => {
    for (let i = stepIndex; i < steps.length; i++) {
      const el = document.querySelector(steps[i].target)
      if (el) return i
    }
    return -1
  }, [])

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY_PREFIX + 'onboarding')
    if (!completed && profile) {
      const timer = setTimeout(() => {
        const firstValid = findNextValidStep(0, allSteps)
        if (firstValid !== -1) {
          setCurrentStep(firstValid)
          setIsActive(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [profile, allSteps, findNextValidStep])

  useEffect(() => {
    if (!isActive) return
    const step = allSteps[currentStep]
    if (!step) {
      complete()
      return
    }
    const el = document.querySelector(step.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      goNext()
    }
  }, [isActive, currentStep, allSteps])

  const goNext = () => {
    const next = findNextValidStep(currentStep + 1, allSteps)
    if (next !== -1) {
      setCurrentStep(next)
    } else {
      complete()
    }
  }

  const goPrev = () => {
    for (let i = currentStep - 1; i >= 0; i--) {
      const el = document.querySelector(allSteps[i].target)
      if (el) {
        setCurrentStep(i)
        return
      }
    }
  }

  const complete = () => {
    localStorage.setItem(TOUR_KEY_PREFIX + 'onboarding', 'true')
    setIsActive(false)
  }

  if (!isActive || !targetRect) return null

  const step = allSteps[currentStep]
  if (!step) return null

  const totalVisible = allSteps.filter(s => document.querySelector(s.target)).length
  const visibleIndex = allSteps.slice(0, currentStep + 1).filter(s => document.querySelector(s.target)).length

  return (
    <TourOverlay
      targetRect={targetRect}
      title={t(step.titleKey)}
      content={t(step.contentKey)}
      placement={step.placement ?? 'bottom'}
      stepNumber={visibleIndex}
      totalSteps={totalVisible}
      isFirstStep={visibleIndex === 1}
      isLastStep={visibleIndex === totalVisible}
      onNext={goNext}
      onPrev={goPrev}
      onSkip={complete}
      onFinish={complete}
    />
  )
}
