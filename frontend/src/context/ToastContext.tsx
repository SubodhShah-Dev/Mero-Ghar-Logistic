import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type ToastColor = 'green' | 'red' | 'gold' | 'blue'

interface Toast {
  id: number
  message: string
  color: ToastColor
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, color?: ToastColor) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, color: ToastColor = 'gold') => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, color }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[calc(100%-32px)] max-w-[400px] pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 bg-forest-900 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-cream-50 shadow-lg pointer-events-auto animate-fade-up"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor:
                  t.color === 'green' ? '#4caf7d'
                  : t.color === 'red' ? '#e05e5e'
                  : t.color === 'blue' ? '#60a5fa'
                  : '#f8c06a',
              }}
            />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
