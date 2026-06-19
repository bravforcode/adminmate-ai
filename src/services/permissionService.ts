import { supabase } from '../lib/supabase'

/**
 * Server-side permission check via Supabase RPC.
 * Use this in service layer, NOT just in UI guards.
 */

export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_permission', {
    p_resource: resource,
    p_action: action,
  })
  if (error) {
    console.error('Permission check failed:', error.message)
    return false
  }
  return data === true
}

export async function hasRole(roleName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    p_role_name: roleName,
  })
  if (error) {
    console.error('Role check failed:', error.message)
    return false
  }
  return data === true
}

export async function hasAnyRole(roleNames: string[]): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_any_role', {
    p_role_names: roleNames,
  })
  if (error) {
    console.error('Role check failed:', error.message)
    return false
  }
  return data === true
}

export async function getUserRoleNames(): Promise<string[]> {
  const { data, error } = await supabase.rpc('user_role_names', {})
  if (error) {
    console.error('Failed to fetch role names:', error.message)
    return []
  }
  return data ?? []
}

/**
 * Check multiple permissions at once.
 * Returns a map of "resource:action" -> boolean.
 */
export async function checkPermissions(
  checks: Array<{ resource: string; action: string }>
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}
  await Promise.all(
    checks.map(async ({ resource, action }) => {
      const key = `${resource}:${action}`
      results[key] = await hasPermission(resource, action)
    })
  )
  return results
}
