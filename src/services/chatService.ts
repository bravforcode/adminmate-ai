import { supabase } from '../lib/supabase'

export interface SendMessageInput {
  user_id: string
  company_id: string
  session_id: string
  sender: string
  content: string
}

export const chatService = {
  getSessions: async (userId: string) => {
    const { data, error } = await supabase.rpc('get_chat_sessions', { p_user_id: userId })
    if (error) throw error
    return data
  },

  getMessages: async (sessionId: string, companyId: string) => {
    const { data, error } = await supabase.from('chat_messages').select('id, session_id, user_id, company_id, sender, content, created_at').eq('session_id', sessionId).eq('company_id', companyId).order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  sendMessage: async (msg: SendMessageInput) => {
    const { data, error } = await supabase.from('chat_messages').insert(msg).select().single()
    if (error) throw error
    return data
  },

  getAIResponse: async (question: string, companyId: string, language: string) => {
    const { data } = await supabase.functions.invoke('mate-ai-chat', {
      body: { question, companyId, language },
    })
    return data
  },
}
