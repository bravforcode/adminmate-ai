import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import crypto from 'crypto'

export interface WebhookSubscriptionInput {
  company_id: string
  client_id: string
  event_types: string[]
  url: string
  secret: string
}

export interface WebhookSubscription {
  id: string
  company_id: string
  client_id: string
  event_types: string[]
  url: string
  secret_hash: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WebhookDeliveryAttempt {
  id: string
  company_id: string
  subscription_id: string
  event_type: string
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt_number: number
  status: string
  next_retry_at: string | null
  created_at: string
}

const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 1000

function computeHmacSha256(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

function calculateNextRetry(attemptNumber: number): Date {
  const delay = BASE_BACKOFF_MS * Math.pow(2, attemptNumber - 1)
  return new Date(Date.now() + delay)
}

export const webhookService = {
  createSubscription: async (input: WebhookSubscriptionInput): Promise<WebhookSubscription> => {
    if (!(await hasPermission('webhook', 'write'))) {
      throw new Error('Insufficient permissions: webhook_write required')
    }

    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        company_id: input.company_id,
        client_id: input.client_id,
        event_types: input.event_types,
        url: input.url,
        secret_hash: input.secret,
      })
      .select()
      .single()

    if (error) throw error
    return data as WebhookSubscription
  },

  triggerEvent: async (
    companyId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<WebhookDeliveryAttempt[]> => {
    const { data: subscriptions, error: subError } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('event_types', JSON.stringify([eventType]))

    if (subError) throw subError

    const attempts: WebhookDeliveryAttempt[] = []

    for (const sub of (subscriptions ?? []) as WebhookSubscription[]) {
      const body = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        company_id: companyId,
        data: payload,
      })

      const signature = computeHmacSha256(sub.secret_hash, body)

      const { data: attempt, error: attemptError } = await supabase
        .from('webhook_delivery_attempts')
        .insert({
          company_id: companyId,
          subscription_id: sub.id,
          event_type: eventType,
          payload: { body: JSON.parse(body), signature, url: sub.url },
          status: 'pending',
          attempt_number: 1,
        })
        .select()
        .single()

      if (attemptError) throw attemptError

      try {
        const response = await fetch(sub.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': eventType,
          },
          body,
          signal: AbortSignal.timeout(10000),
        })

        const responseBody = await response.text()

        await supabase
          .from('webhook_delivery_attempts')
          .update({
            response_status: response.status,
            response_body: responseBody.substring(0, 1000),
            status: response.ok ? 'delivered' : 'failed',
          })
          .eq('id', attempt.id)

        if (!response.ok) {
          const nextRetry = calculateNextRetry(1)
          await supabase
            .from('webhook_delivery_attempts')
            .update({ next_retry_at: nextRetry.toISOString() })
            .eq('id', attempt.id)
        }
      } catch (fetchError) {
        const nextRetry = calculateNextRetry(1)
        await supabase
          .from('webhook_delivery_attempts')
          .update({
            status: 'failed',
            response_body: fetchError instanceof Error ? fetchError.message : 'Unknown error',
            next_retry_at: nextRetry.toISOString(),
          })
          .eq('id', attempt.id)
      }

      attempts.push(attempt as WebhookDeliveryAttempt)
    }

    return attempts
  },

  retryDelivery: async (attemptId: string): Promise<WebhookDeliveryAttempt> => {
    if (!(await hasPermission('webhook', 'write'))) {
      throw new Error('Insufficient permissions: webhook_write required')
    }

    const { data: original, error: fetchError } = await supabase
      .from('webhook_delivery_attempts')
      .select('*, webhook_subscriptions!inner(*)')
      .eq('id', attemptId)
      .single()

    if (fetchError || !original) throw new Error('Delivery attempt not found')

    const attempt = original as WebhookDeliveryAttempt & {
      webhook_subscriptions: WebhookSubscription
    }
    const sub = attempt.webhook_subscriptions

    if (attempt.attempt_number >= MAX_RETRIES) {
      throw new Error(`Max retries (${MAX_RETRIES}) exceeded for attempt ${attemptId}`)
    }

    const newAttemptNumber = attempt.attempt_number + 1
    const body = JSON.stringify(attempt.payload.body)
    const signature = computeHmacSha256(sub.secret_hash, body)

    const { data: newAttempt, error: insertError } = await supabase
      .from('webhook_delivery_attempts')
      .insert({
        company_id: attempt.company_id,
        subscription_id: attempt.subscription_id,
        event_type: attempt.event_type,
        payload: { ...attempt.payload, signature },
        attempt_number: newAttemptNumber,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) throw insertError

    try {
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': attempt.event_type,
        },
        body,
        signal: AbortSignal.timeout(10000),
      })

      const responseBody = await response.text()

      await supabase
        .from('webhook_delivery_attempts')
        .update({
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          status: response.ok ? 'delivered' : 'failed',
        })
        .eq('id', newAttempt.id)

      if (!response.ok) {
        const nextRetry = calculateNextRetry(newAttemptNumber)
        await supabase
          .from('webhook_delivery_attempts')
          .update({ next_retry_at: nextRetry.toISOString() })
          .eq('id', newAttempt.id)
      }
    } catch (fetchError) {
      const nextRetry = calculateNextRetry(newAttemptNumber)
      await supabase
        .from('webhook_delivery_attempts')
        .update({
          status: 'failed',
          response_body: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          next_retry_at: nextRetry.toISOString(),
        })
        .eq('id', newAttempt.id)
    }

    return newAttempt as WebhookDeliveryAttempt
  },

  getDeliveryAttempts: async (
    subscriptionId: string,
    limit = 50
  ): Promise<WebhookDeliveryAttempt[]> => {
    if (!(await hasPermission('webhook', 'read'))) {
      throw new Error('Insufficient permissions: webhook_read required')
    }

    const { data, error } = await supabase
      .from('webhook_delivery_attempts')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return (data ?? []) as WebhookDeliveryAttempt[]
  },

  listSubscriptions: async (companyId: string): Promise<WebhookSubscription[]> => {
    if (!(await hasPermission('webhook', 'read'))) {
      throw new Error('Insufficient permissions: webhook_read required')
    }

    const { data, error } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as WebhookSubscription[]
  },

  deleteSubscription: async (subscriptionId: string): Promise<void> => {
    if (!(await hasPermission('webhook', 'write'))) {
      throw new Error('Insufficient permissions: webhook_write required')
    }

    const { error } = await supabase
      .from('webhook_subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) throw error
  },

  verifySignature: (secret: string, body: string, signature: string): boolean => {
    const expected = computeHmacSha256(secret, body)
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  },
}
