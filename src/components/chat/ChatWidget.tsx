import { useState, useRef, useEffect } from 'react'
import { useChat } from '../../hooks/useChat'
import { useTranslation } from 'react-i18next'
import { Send, Sparkles, Bot, X, MessageSquare } from 'lucide-react'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, sendMessage, isLoading } = useChat()
  const [input, setInput] = useState('')
  const { t } = useTranslation('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages, isOpen])

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage(input)
    setInput('')
  }

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion)
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-navy-mid to-accent text-white flex items-center justify-center shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_24px_rgba(37,99,235,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 cursor-pointer"
        aria-label="Toggle AI Assistant"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div className={`absolute transition-all duration-300 transform ${isOpen ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
            <MessageSquare size={24} className="animate-pulse" />
          </div>
          <div className={`absolute transition-all duration-300 transform ${isOpen ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
            <X size={24} />
          </div>
        </div>
      </button>

      {/* Chat Window Panel */}
      <div
        className={`fixed bottom-[92px] md:bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-32px)] sm:w-[400px] h-[550px] max-h-[calc(100vh-140px)] bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-90 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-navy-deep to-navy p-4 flex items-center justify-between border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent-dim">
              <Bot size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white text-sm">{t('title')}</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-xs text-white/60 flex items-center gap-1">
                <Sparkles size={10} className="text-accent-dim" />
                {t('status')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Panel */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg scroll-smooth">
          {messages.length === 0 && (
            <div className="text-center py-8 px-4 flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center text-accent mb-3">
                <Bot size={26} />
              </div>
              <h4 className="font-semibold text-text-primary text-sm mb-1">{t('title')}</h4>
              <p className="text-xs text-text-secondary mb-6 text-center max-w-[280px]">
                {t('subtitle')}
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[300px]">
                {(t('suggestions', { returnObjects: true }) as string[]).map((suggestion: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left px-3.5 py-2.5 bg-surface hover:bg-accent-light border border-border hover:border-accent-dim rounded-xl text-xs text-text-secondary hover:text-accent transition-all duration-200 shadow-sm cursor-pointer hover:translate-x-1"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Sparkles size={13} />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-accent text-white rounded-tr-none'
                    : 'bg-surface text-text-primary border border-border rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles size={13} />
              </div>
              <div className="bg-surface border border-border rounded-2xl rounded-tl-none p-3.5 flex gap-1 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-surface border-t border-border flex gap-2 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-bg focus:border-accent focus:ring-1 focus:ring-accent outline-none text-xs text-text-primary placeholder-text-muted transition-all"
            placeholder={t('placeholder')}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all cursor-pointer shadow-[0_2px_8px_rgba(96,165,250,0.2)] flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  )
}
