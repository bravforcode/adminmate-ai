import { supabase } from '../lib/supabase'

export const chatService = {
  getSessions: async (userId: string) => {
    const { data, error } = await supabase.rpc('get_chat_sessions', { p_user_id: userId })
    if (error) throw error
    return data
  },

  getMessages: async (sessionId: string) => {
    const { data, error } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
    if (error) throw error
    return data
  },

  sendMessage: async (msg: { user_id: string; company_id: string; session_id: string; sender: string; content: string }) => {
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
