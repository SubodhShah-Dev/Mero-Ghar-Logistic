import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send } from 'lucide-react'
import { CHAT } from '../services/api'
import { useToast } from '../context/ToastContext'

interface ChatMessage {
  id: number
  shipment_id: number
  sender_user_id: number
  sender_role: 'customer' | 'vendor'
  message: string
  created_at: string
  sender_name: string
}

interface ChatPanelProps {
  shipmentId: number
  senderRole: 'customer' | 'vendor'
  title?: string
  onClose: () => void
}

const POLL_MS = 5000

export default function ChatPanel({ shipmentId, senderRole, title, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const load = useCallback(async () => {
    try {
      const res = await CHAT.getMessages(shipmentId)
      setMessages(res.data.messages || [])
    } catch {
      showToast('Failed to load messages', 'red')
    } finally {
      setLoading(false)
    }
  }, [shipmentId, showToast])

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
  }, [load])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await CHAT.sendMessage(shipmentId, text)
      const created = res.data?.data
      if (created) setMessages((prev) => [...prev, created])
      setDraft('')
    } catch {
      showToast('Failed to send message', 'red')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/72 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-forest-900 border border-forest-700 w-full sm:max-w-lg sm:rounded-2xl flex flex-col h-[80vh] sm:h-[560px]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-forest-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="font-display font-bold text-cream-50 text-sm">{title || 'Chat'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-forest-400 hover:text-cream-50 hover:bg-forest-800 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <p className="text-center text-forest-500 text-xs py-8">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-forest-500 text-sm py-8">
              No messages yet. Say hello to coordinate your move.
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_role === senderRole
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    mine ? 'bg-saffron-400 text-forest-900 rounded-br-sm' : 'bg-forest-800 text-cream-50 rounded-bl-sm'
                  }`}>
                    {!mine && <p className="text-[10px] font-semibold opacity-70 mb-0.5 uppercase tracking-wide">{m.sender_name}</p>}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`text-[10px] mt-1 ${mine ? 'text-forest-700' : 'text-forest-500'}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-forest-700 p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Type a message..."
            className="flex-1 bg-forest-800 border border-forest-600 rounded-sm px-4 py-3 text-cream-50 text-sm placeholder-forest-400 outline-none focus:border-saffron-400 min-h-[44px]"
          />
          <button onClick={send} disabled={sending || !draft.trim()}
            className="bg-saffron-400 hover:bg-saffron-300 disabled:opacity-40 text-forest-900 font-bold p-3 rounded-sm transition-all min-h-[44px]">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
