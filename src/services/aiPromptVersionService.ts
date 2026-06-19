import { supabase } from '../lib/supabase'
import type { AIPromptVersion } from '../types/aiRecruiting'

/* ============================================================
   AI Prompt Version Service
   Manages prompt templates for versioning and audit.
   ============================================================ */

export async function getPromptVersions(featureKey: string): Promise<AIPromptVersion[]> {
  const { data, error } = await supabase
    .from('ai_prompt_versions')
    .select('*')
    .eq('feature_key', featureKey)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as AIPromptVersion[]
}

export async function getActivePrompt(featureKey: string): Promise<AIPromptVersion | null> {
  const { data, error } = await supabase
    .from('ai_prompt_versions')
    .select('*')
    .eq('feature_key', featureKey)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as unknown as AIPromptVersion | null
}

export async function createPromptVersion(
  prompt: Omit<AIPromptVersion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AIPromptVersion> {
  const { data, error } = await supabase
    .from('ai_prompt_versions')
    .insert(prompt)
    .select()
    .single()
  if (error) throw error
  return data as unknown as AIPromptVersion
}

export async function deactivatePrompt(id: string): Promise<void> {
  const { error } = await supabase
    .from('ai_prompt_versions')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
