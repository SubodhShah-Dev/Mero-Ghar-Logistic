import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export default function GoToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-5 z-40 w-11 h-11 bg-saffron-400 hover:bg-saffron-300 text-forest-900 rounded-full flex items-center justify-center shadow-lg transition-all hover:-translate-y-1"
      aria-label="Go to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  )
}
