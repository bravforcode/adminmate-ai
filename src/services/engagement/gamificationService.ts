import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Gamification Engine Service
   Points ledger, badges, leaderboards, recognition notifications.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface PointsEntry {
  id: string
  company_id: string
  employee_id: string
  points: number
  category: string
  reason: string
  awarded_by?: string
  created_at: string
}

export interface Badge {
  id: string
  company_id: string
  name: string
  description: string
  icon: string
  category: string
  required_points: number
  required_streak?: number
  is_active: boolean
  created_at: string
}

export interface EmployeeBadge {
  id: string
  company_id: string
  employee_id: string
  badge_id: string
  awarded_at: string
  badge?: Badge
}

export interface LeaderboardEntry {
  employee_id: string
  employee_name: string
  department?: string
  total_points: number
  rank: number
  badges_count: number
}

export interface Recognition {
  id: string
  company_id: string
  from_employee_id: string
  to_employee_id: string
  message: string
  points: number
  badge_id?: string
  is_public: boolean
  created_at: string
}

// ── Point Categories ────────────────────────────────────────

export const POINT_CATEGORIES = {
  PERFORMANCE: { name: 'Performance', color: '#22C55E' },
  TEAMWORK: { name: 'Teamwork', color: '#3B82F6' },
  INNOVATION: { name: 'Innovation', color: '#8B5CF6' },
  CUSTOMER: { name: 'Customer Excellence', color: '#F59E0B' },
  ATTENDANCE: { name: 'Perfect Attendance', color: '#10B981' },
  LEARNING: { name: 'Learning & Development', color: '#EC4899' },
  RECOGNITION: { name: 'Peer Recognition', color: '#6366F1' },
} as const

// ── Points Management ───────────────────────────────────────

export async function awardPoints(
  companyId: string,
  employeeId: string,
  points: number,
  category: string,
  reason: string,
  awardedBy?: string
): Promise<PointsEntry> {
  const canWrite = await hasPermission('engagement', 'write')
  if (!canWrite) throw new Error('Requires engagement_write permission')

  const { data, error } = await supabase
    .from('gamification_points')
    .insert({
      company_id: companyId,
      employee_id: employeeId,
      points,
      category,
      reason,
      awarded_by: awardedBy,
    })
    .select()
    .single()

  if (error) throw error

  // Check for badge awards
  await checkBadgeAwards(companyId, employeeId)

  // Send recognition notification if public
  if (awardedBy) {
    await sendRecognitionNotification(companyId, employeeId, awardedBy, points, reason)
  }

  return data as PointsEntry
}

export async function getPointsBalance(
  companyId: string,
  employeeId: string
): Promise<{ total: number; byCategory: Record<string, number> }> {
  const { data } = await supabase
    .from('gamification_points')
    .select('points, category')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)

  const entries = (data ?? []) as Array<{ points: number; category: string }>
  const total = entries.reduce((sum, e) => sum + e.points, 0)
  const byCategory: Record<string, number> = {}

  for (const entry of entries) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + entry.points
  }

  return { total, byCategory }
}

export async function getPointsHistory(
  companyId: string,
  employeeId: string,
  limit = 50
): Promise<PointsEntry[]> {
  const { data, error } = await supabase
    .from('gamification_points')
    .select('*')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as PointsEntry[]
}

// ── Badge Management ────────────────────────────────────────

export async function listBadges(companyId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('gamification_badges')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('required_points', { ascending: true })

  if (error) throw error
  return (data ?? []) as Badge[]
}

export async function getEmployeeBadges(
  companyId: string,
  employeeId: string
): Promise<EmployeeBadge[]> {
  const { data, error } = await supabase
    .from('gamification_employee_badges')
    .select('*, badge:gamification_badges(*)')
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .order('awarded_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as EmployeeBadge[]
}

async function checkBadgeAwards(
  companyId: string,
  employeeId: string
): Promise<void> {
  // Get employee's current points
  const { total } = await getPointsBalance(companyId, employeeId)

  // Get all badges for company
  const badges = await listBadges(companyId)

  // Get already-awarded badge IDs
  const { data: awarded } = await supabase
    .from('gamification_employee_badges')
    .select('badge_id')
    .eq('employee_id', employeeId)

  const awardedIds = new Set((awarded ?? []).map((a: { badge_id: string }) => a.badge_id))

  // Award new badges
  for (const badge of badges) {
    if (awardedIds.has(badge.id)) continue
    if (total >= badge.required_points) {
      await supabase
        .from('gamification_employee_badges')
        .insert({
          company_id: companyId,
          employee_id: employeeId,
          badge_id: badge.id,
        })

      // Notify via LINE
      await sendBadgeNotification(companyId, employeeId, badge)
    }
  }
}

// ── Leaderboard ─────────────────────────────────────────────

export async function getLeaderboard(
  companyId: string,
  options?: { department?: string; limit?: number }
): Promise<LeaderboardEntry[]> {
  const limit = options?.limit ?? 20

  // Aggregate points by employee
  let query = supabase
    .from('gamification_points')
    .select('employee_id, points')
    .eq('company_id', companyId)

  const { data: pointsData } = await query
  const pointsArray = (pointsData ?? []) as Array<{ employee_id: string; points: number }>

  // Sum points per employee
  const pointsMap = new Map<string, number>()
  for (const entry of pointsArray) {
    pointsMap.set(entry.employee_id, (pointsMap.get(entry.employee_id) || 0) + entry.points)
  }

  // Get employee details
  const employeeIds = [...pointsMap.keys()]
  if (employeeIds.length === 0) return []

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, full_name, company_id')
    .in('id', employeeIds)
    .eq('company_id', companyId)

  // Get badge counts
  const { data: badgeCounts } = await supabase
    .from('gamification_employee_badges')
    .select('employee_id')
    .eq('company_id', companyId)
    .in('employee_id', employeeIds)

  const badgeCountMap = new Map<string, number>()
  for (const b of (badgeCounts ?? []) as Array<{ employee_id: string }>) {
    badgeCountMap.set(b.employee_id, (badgeCountMap.get(b.employee_id) || 0) + 1)
  }

  // Build leaderboard
  const entries: LeaderboardEntry[] = employeeIds.map((id) => {
    const profile = (profiles ?? []).find((p: { id: string }) => p.id === id)
    return {
      employee_id: id,
      employee_name: profile?.full_name ?? 'Unknown',
      total_points: pointsMap.get(id) || 0,
      rank: 0, // Will be set after sorting
      badges_count: badgeCountMap.get(id) || 0,
    }
  })

  // Sort by points and assign ranks
  entries.sort((a, b) => b.total_points - a.total_points)
  entries.forEach((e, i) => { e.rank = i + 1 })

  return entries.slice(0, limit)
}

// ── Recognition ─────────────────────────────────────────────

export async function sendRecognition(
  companyId: string,
  fromEmployeeId: string,
  toEmployeeId: string,
  message: string,
  points: number,
  _isPublic = true
): Promise<Recognition> {
  const { data, error } = await supabase
    .from('gamification_recognitions')
    .insert({
      company_id: companyId,
      from_employee_id: fromEmployeeId,
      to_employee_id: toEmployeeId,
      message,
      points,
      is_public: _isPublic,
    })
    .select()
    .single()

  if (error) throw error

  // Award points
  await awardPoints(
    companyId,
    toEmployeeId,
    points,
    'RECOGNITION',
    `Recognition from colleague: ${message}`,
    fromEmployeeId
  )

  return data as Recognition
}

export async function getRecognitions(
  companyId: string,
  options?: { employeeId?: string; limit?: number }
): Promise<Recognition[]> {
  let query = supabase
    .from('gamification_recognitions')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })

  if (options?.employeeId) {
    query = query.eq('to_employee_id', options.employeeId)
  }

  query = query.limit(options?.limit ?? 20)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Recognition[]
}

// ── Notifications ───────────────────────────────────────────

async function sendBadgeNotification(
  _companyId: string,
  employeeId: string,
  badge: Badge
): Promise<void> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('line_user_id')
    .eq('id', employeeId)
    .single()

  if (profile?.line_user_id) {
    const { sendLINEMessage } = await import('../lineService')
    await sendLINEMessage(profile.line_user_id, {
      type: 'text',
      text: `🏆 New Badge Earned!\n\nYou've earned the "${badge.name}" badge!\n${badge.description}\n\nKeep up the great work!`,
    })
  }
}

async function sendRecognitionNotification(
  _companyId: string,
  toEmployeeId: string,
  fromEmployeeId: string,
  points: number,
  reason: string
): Promise<void> {
  const { data: toProfile } = await supabase
    .from('user_profiles')
    .select('line_user_id, full_name')
    .eq('id', toEmployeeId)
    .single()

  const { data: fromProfile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', fromEmployeeId)
    .single()

  if (toProfile?.line_user_id) {
    const { sendLINEMessage } = await import('../lineService')
    await sendLINEMessage(toProfile.line_user_id, {
      type: 'text',
      text: `🎉 Recognition!\n\n${fromProfile?.full_name ?? 'A colleague'} recognized you with +${points} points!\n"${reason}"\n\nKeep up the great work!`,
    })
  }
}
