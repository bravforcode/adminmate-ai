import { ChatInterface } from '../components/chat/ChatInterface'

export function ChatPage() {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Mate AI Assistant</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Ask questions about company policies, benefits, leave, and work procedures</p>
      </div>
      <div className="bg-surface rounded-xl border border-outline-variant p-6 h-[calc(100vh-220px)]">
        <ChatInterface />
      </div>
    </div>
  )
}

export default ChatPage
