import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { CHATBOT } from '../services/api'

interface Message {
  text: string
  isUser: boolean
}

const LOCAL_ANSWERS: Record<string, string> = {
  'hi': 'Namaste! 👋 How can I help you with your move today?',
  'hello': 'Namaste! 👋 How can I help you with your move today?',
  'help': 'I can help you with:\n📋 Booking a move\n🚛 Vehicle types & pricing\n🗺️ Province coverage\n💳 Payment methods (eSewa, Khalti, Cash)\n📦 Fragile & special items\n🛡️ Insurance & add-ons\n📊 Tracking your booking\n❓ Any other questions!',
  'book': 'To book a move, log in and fill out our 5-step booking form. You will need your pickup/drop locations, home size, items, vehicle type, preferred date, and contact info. A coordinator will call you within 2 hours with a quote.',
  'price': 'Pricing depends on distance, home size, vehicle type, and add-on services. For a full 1 BHK move in Kathmandu Valley, expect NPR 4,000-8,000. Inter-city moves start at NPR 12,000. Get a free exact quote by submitting the booking form.',
  'vehicle': 'We offer: 🛺 Cargo Tempo (narrow lanes, valley), 🚛 Mini Truck (inter-city), 🚚 Large Truck (full household). Select the right one in Step 3 of the booking form.',
  'payment': 'We accept: 💜 eSewa, 🟣 Khalti, 💙 IME Pay, 🏦 ConnectIPS, and 💵 Cash. Digital payments via our secure payment overlay.',
  'esewa': 'Yes, we accept eSewa! Select eSewa as payment method in Step 5, and you will be redirected to complete the payment after form submission.',
  'khalti': 'Yes, we accept Khalti! Select Khalti in Step 5, and complete payment after form submission.',
}

function getLocalReply(input: string): string | null {
  const clean = input.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  if (clean.includes('price') || clean.includes('cost') || clean.includes('quote') || clean.includes('rate')) return LOCAL_ANSWERS.price
  if (clean.includes('vehicle') || clean.includes('truck') || clean.includes('tempo') || clean.includes('cargo')) return LOCAL_ANSWERS.vehicle
  if (clean.includes('payment') || clean.includes('pay')) return LOCAL_ANSWERS.payment
  if (clean.includes('esewa')) return LOCAL_ANSWERS.esewa
  if (clean.includes('khalti')) return LOCAL_ANSWERS.khalti
  if (clean.includes('book') || clean.includes('form') || clean.includes('schedule')) return LOCAL_ANSWERS.book
  if (clean.includes('help') || clean.includes('command') || clean.includes('can you')) return LOCAL_ANSWERS.help
  if (clean.startsWith('hi') || clean.startsWith('hel') || clean === 'h' || clean === 'hy') return LOCAL_ANSWERS.hi
  if (clean.startsWith('hel') || clean === 'hello' || clean === 'hlo') return LOCAL_ANSWERS.hello
  return null
}

const QUICK_CHIPS = ['📋 Book a Move', '🚛 Pricing', '🗺️ Coverage', '💳 Payments', '❓ Help']

export default function MeroBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ text: 'Namaste! 👋 I am MeroBot. How can I help with your move?', isUser: false }])
    }
  }, [open, messages.length])

  const sendMessage = async (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { text, isUser: true }])
    setInput('')

    const local = getLocalReply(text)
    if (local) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { text: local, isUser: false }])
      }, 300)
      return
    }

    setLoading(true)
    try {
      const res = await CHATBOT.sendMessage(text)
      const data = res.data
      const reply = data.response || data.reply || data.message || 'Sorry, I could not process that. Try asking about booking, pricing, or payment.'
      setMessages((prev) => [...prev, { text: reply, isUser: false }])
    } catch {
      setMessages((prev) => [...prev, { text: 'Sorry, I am offline right now. Please try again later or contact support.', isUser: false }])
    } finally {
      setLoading(false)
    }
  }

  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y })
  }

  const onPointerUp = () => { dragging.current = false }

  return (
    <>
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-32px)] bg-forest-900 border border-forest-700 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: '520px', transform: `translate(${pos.x}px, ${pos.y}px)` }}>
          <div className="flex items-center justify-between px-4 py-3 bg-forest-800 border-b border-forest-700">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 bg-saffron-400 rounded flex items-center justify-center text-forest-900 text-xs font-black">M</span>
              <span className="text-cream-50 font-semibold text-sm">MeroBot</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-forest-400 hover:text-cream-50 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed ${
                  m.isUser ? 'bg-saffron-400 text-forest-900' : 'bg-forest-800 text-cream-50'
                }`} style={{ whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-forest-800 text-cream-50 px-3.5 py-2.5 rounded-xl text-sm">Typing...</div>
              </div>
            )}

            {messages.length === 1 && !messages[0].isUser && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_CHIPS.map((chip) => (
                  <button key={chip} onClick={() => sendMessage(chip.replace(/^[^\s]+\s/, ''))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-saffron-400/30 text-saffron-300 hover:bg-saffron-400/10 transition-colors">
                    {chip}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); sendMessage(input) }} className="flex items-center gap-2 p-3 border-t border-forest-700 bg-forest-800">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything..."
              className="flex-1 bg-forest-900 border border-forest-600 rounded-lg px-3 py-2 text-sm text-cream-50 placeholder-forest-400 outline-none focus:border-saffron-400" />
            <button type="submit" className="bg-saffron-400 hover:bg-saffron-300 text-forest-900 p-2 rounded-lg transition-colors" disabled={loading}>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <button ref={dragRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-5 z-50 w-14 h-14 bg-saffron-400 hover:bg-saffron-300 text-forest-900 rounded-full flex items-center justify-center shadow-xl transition-all hover:-translate-y-1 active:scale-95 touch-none"
        style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
        aria-label="Chat with MeroBot">
        {open ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </>
  )
}
