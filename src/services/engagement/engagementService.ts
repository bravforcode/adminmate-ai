import { supabase } from '../../lib/supabase'

/* ============================================================
   Engagement, Recognition & Surveys Service
   Campaigns, anonymous responses, recognition, reward points.

   AI RULES:
   - AI CAN summarize engagement scores (aggregated).
   - AI CAN suggest recognition types.
   - AI CANNOT access individual anonymous responses.
   - AI CANNOT create recognition on behalf of a user.
   - Minimum group size threshold enforced for anonymity.
   ============================================================ */

// ── Types ──

export type TemplateType = 'pulse' | 'engagement' | 'satisfaction' | 'exit' | 'onboarding' | 'custom'
export type CampaignStatus = 'draft' | 'active' | 'closed' | 'cancelled'
export type RecognitionType = 'kudos' | 'milestone' | 'peer' | 'manager' | 'spot' | 'values'

export interface SurveyTemplate {
  id: string
  company_id: string
  name: string
  template_type: TemplateType
  questions: SurveyQuestion[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SurveyQuestion {
  key: string
  label: string
  type: 'rating' | 'text' | 'single_choice' | 'multiple_choice'
  options?: string[]
  required?: boolean
}

export interface SurveyCampaign {
  id: string
  company_id: string
  template_id: string
  name: string
  target_audience: string
  is_anonymous: boolean
  min_group_size: number
  start_date: string
  end_date: string
  status: CampaignStatus
  created_by?: string
  created_at: string
  updated_at: string
}

export interface SurveyResponse {
  id: string
  company_id: string
  campaign_id: string
  respondent_id: string
  answers: Record<string, unknown>
  submitted_at: string
  is_anonymous: boolean
  created_at: string
}

export interface EngagementScore {
  id: string
  company_id: string
  campaign_id: string
  department_id?: string
  score: number
  response_count: number
  created_at: string
}

export interface RecognitionEvent {
  id: string
  company_id: string
  sender_id: string
  recipient_id: string
  recognition_type: RecognitionType
  message: string
  points: number
  is_public: boolean
  created_at: string
}

export interface RewardPoints {
  id: string
  company_id: string
  employee_id: string
  balance: number
  earned_total: number
  redeemed_total: number
  updated_at: string
}

// ── Input Types ──

export interface CreateCampaignInput {
  template_id: string
  name: string
  target_audience?: string
  is_anonymous?: boolean
  min_group_size?: number
  start_date: string
  end_date: string
  status?: CampaignStatus
}

export interface SubmitResponseInput {
  campaign_id: string
  respondent_id: string
  answers: Record<string, unknown>
  is_anonymous?: boolean
}

export interface GiveRecognitionInput {
  recipient_id: string
  recognition_type: RecognitionType
  message: string
  points?: number
  is_public?: boolean
}

// ── Constants ──

const DEFAULT_MIN_GROUP_SIZE = 5

// ── Service ──

export const engagementService = {
  async createCampaign(
    companyId: string,
    input: CreateCampaignInput,
    createdBy: string
  ): Promise<SurveyCampaign> {
    const { data, error } = await supabase
      .from('survey_campaigns')
      .insert({
        company_id: companyId,
        template_id: input.template_id,
        name: input.name,
        target_audience: input.target_audience ?? 'all',
        is_anonymous: input.is_anonymous ?? true,
        min_group_size: input.min_group_size ?? DEFAULT_MIN_GROUP_SIZE,
        start_date: input.start_date,
        end_date: input.end_date,
        status: input.status ?? 'draft',
        created_by: createdBy,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create campaign: ${error.message}`)
    return data as SurveyCampaign
  },

  async submitResponse(
    campaignId: string,
    respondentId: string,
    answers: Record<string, unknown>,
    companyId: string,
    isAnonymous: boolean = true
  ): Promise<SurveyResponse> {
    // Validate campaign exists and is active
    const { data: campaign, error: campErr } = await supabase
      .from('survey_campaigns')
      .select('status, is_anonymous')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single()
    if (campErr || !campaign) throw new Error('Campaign not found')
    if (campaign.status !== 'active') throw new Error('Campaign is not active')

    // Enforce anonymous flag from campaign setting
    const effectiveAnonymous = campaign.is_anonymous ? true : isAnonymous

    const { data, error } = await supabase
      .from('survey_responses')
      .upsert(
        {
          company_id: companyId,
          campaign_id: campaignId,
          respondent_id: respondentId,
          answers,
          is_anonymous: effectiveAnonymous,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,campaign_id,respondent_id' }
      )
      .select()
      .single()
    if (error) throw new Error(`Failed to submit response: ${error.message}`)
    return data as SurveyResponse
  },

  async getCampaignResponses(
    campaignId: string,
    companyId: string,
    options?: { stripAnonymous?: boolean }
  ): Promise<SurveyResponse[]> {
    // Validate campaign exists
    const { data: campaign, error: campErr } = await supabase
      .from('survey_campaigns')
      .select('is_anonymous, min_group_size')
      .eq('id', campaignId)
      .eq('company_id', companyId)
      .single()
    if (campErr || !campaign) throw new Error('Campaign not found')

    const { data, error } = await supabase
      .from('survey_responses')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('company_id', companyId)
      .order('submitted_at', { ascending: true })
    if (error) throw new Error(`Failed to fetch responses: ${error.message}`)

    let responses = (data ?? []) as SurveyResponse[]

    // Enforce minimum group size: if below threshold, return no individual responses
    if (campaign.is_anonymous && responses.length < campaign.min_group_size) {
      return []
    }

    // Strip respondent_id for anonymous responses when requested
    if (options?.stripAnonymous !== false && campaign.is_anonymous) {
      responses = responses.map(r => ({
        ...r,
        respondent_id: r.is_anonymous ? 'anonymous' : r.respondent_id,
      }))
    }

    return responses
  },

  async giveRecognition(
    companyId: string,
    senderId: string,
    input: GiveRecognitionInput
  ): Promise<RecognitionEvent> {
    if (senderId === input.recipient_id) {
      throw new Error('Cannot recognize yourself')
    }
    if (!input.message || input.message.trim().length === 0) {
      throw new Error('Recognition message is required')
    }

    const { data, error } = await supabase
      .from('recognition_events')
      .insert({
        company_id: companyId,
        sender_id: senderId,
        recipient_id: input.recipient_id,
        recognition_type: input.recognition_type,
        message: input.message.trim(),
        points: input.points ?? 0,
        is_public: input.is_public ?? true,
      })
      .select()
      .single()
    if (error) throw new Error(`Failed to create recognition: ${error.message}`)

    // Award points if positive
    if (input.points && input.points > 0) {
      await engagementService.awardPoints(companyId, input.recipient_id, input.points)
    }

    return data as RecognitionEvent
  },

  async getRewardBalance(employeeId: string): Promise<RewardPoints> {
    const { data, error } = await supabase
      .from('reward_points')
      .select('*')
      .eq('employee_id', employeeId)
      .single()
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch reward balance: ${error.message}`)
    }
    if (!data) {
      // Return zero balance if no record exists
      return {
        id: '',
        company_id: '',
        employee_id: employeeId,
        balance: 0,
        earned_total: 0,
        redeemed_total: 0,
        updated_at: new Date().toISOString(),
      }
    }
    return data as RewardPoints
  },

  async awardPoints(
    companyId: string,
    employeeId: string,
    points: number
  ): Promise<RewardPoints> {
    if (points <= 0) throw new Error('Points must be positive')

    const { data, error } = await supabase
      .from('reward_points')
      .upsert(
        {
          company_id: companyId,
          employee_id: employeeId,
          balance: points,
          earned_total: points,
          redeemed_total: 0,
        },
        { onConflict: 'company_id,employee_id' }
      )
      .select()
      .single()
    if (error) throw new Error(`Failed to award points: ${error.message}`)
    return data as RewardPoints
  },
}


