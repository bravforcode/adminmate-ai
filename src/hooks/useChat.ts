import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { chatService } from '../services/chatService'
import toast from 'react-hot-toast'

interface ChatMessage {
  id: string
  session_id: string
  sender: 'user' | 'ai'
  content: string
  created_at: string
}

export function useChat() {
  const { user, company } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string>(crypto.randomUUID())
  const [isLoading, setIsLoading] = useState(false)

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user?.id || !company?.id) return

    const userMsg: ChatMessage = { id: crypto.randomUUID(), session_id: sessionId, sender: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    try {
      await chatService.sendMessage({ user_id: user.id, company_id: company.id, session_id: sessionId, sender: 'user', content: text })

      setIsLoading(true)
      const lang = useAuthStore.getState().userLanguage()
      const result = await chatService.getAIResponse(text, company.id, lang)
      const aiText = result?.data?.response || 'ขออภัย ไม่สามารถตอบคำถามได้ในขณะนี้'

      const aiMsg: ChatMessage = { id: crypto.randomUUID(), session_id: sessionId, sender: 'ai', content: aiText, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
      await chatService.sendMessage({ user_id: user.id, company_id: company.id, session_id: sessionId, sender: 'ai', content: aiText })
    } catch (err) {
      toast.error('Failed to get AI response')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, user?.id, company?.id])

  return { messages, sendMessage, isLoading, sessionId, setSessionId }
}
