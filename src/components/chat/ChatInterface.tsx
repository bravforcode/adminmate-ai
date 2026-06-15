import { useState, useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { useChat } from '../../hooks/useChat'
import { Send, Sparkles, Bot } from 'lucide-react'

const SUGGESTIONS = [
  'What are the work hours?',
  'How many annual leave days do I get?',
  'Tell me about health insurance benefits',
  'What is the sick leave policy?',
  'How do I request a day off?',
]

export function ChatInterface() {
  const { messages, sendMessage, isLoading } = useChat()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex-1 chat-scroll space-y-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot size={48} className="mx-auto text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-2">Mate AI Assistant</h3>
            <p className="text-sm text-on-surface-variant dark:text-[#94a3b8] mb-6">Ask me anything about company policies, benefits, or work procedures</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setInput(s); setTimeout(() => handleSend(), 100) }}
                  className="px-3 py-1.5 bg-surface-container-low dark:bg-[#1e3a5f] rounded-full text-sm hover:bg-surface-container-high dark:hover:bg-[#334155] transition-colors text-on-surface-variant dark:text-[#94a3b8]">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
            {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0"><Sparkles size={14} /></div>}
            <div className={`max-w-[75%] rounded-xl p-3 text-sm ${msg.sender === 'user' ? 'bg-primary text-on-primary' : 'bg-surface-container-low dark:bg-[#1e3a5f] text-on-surface dark:text-[#f1f5f9]'}`}>
              {DOMPurify.sanitize(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0"><Sparkles size={14} /></div>
            <div className="bg-surface-container-low dark:bg-[#1e3a5f] rounded-xl p-3 text-sm">
              <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 mt-4 pt-4 border-t border-outline-variant dark:border-[#334155]">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-3 rounded-full border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-on-surface dark:text-[#f1f5f9] focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none text-sm"
          placeholder="Ask a question about policies, benefits..." />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
