import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { compareVersions, APP_VERSION, GITHUB_REPO } from '../utils'

export default function UpdateDialog() {
  const [show, setShow] = useState(false)
  const [version, setVersion] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    const check = async () => {
      if (!navigator.onLine) return
      const dismissed = localStorage.getItem('mg_dismissed_version')
      const cacheKey = 'mg_update_cache'
      const now = Date.now()

      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
        if (cached && cached.timestamp && (now - cached.timestamp) < 7200000) {
          if (compareVersions(cached.latestVersion, APP_VERSION) > 0) {
            setVersion(cached.latestVersion)
            setUrl(cached.downloadUrl)
            if (dismissed !== cached.latestVersion) setShow(true)
          }
          return
        }
      } catch {}

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
          { headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal }
        )
        clearTimeout(timeoutId)
        if (!res.ok) return
        const data = await res.json()
        const tag = data.tag_name.replace(/^v/i, '')
        if (compareVersions(tag, APP_VERSION) <= 0) return
        const apk = data.assets?.find((a: { name: string }) => a.name.includes('.apk'))
        const dl = apk ? apk.browser_download_url : data.html_url

        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, latestVersion: tag, downloadUrl: dl }))
        setVersion(tag)
        setUrl(dl)
        if (dismissed !== tag) setShow(true)
      } catch {}
    }

    const timer = setTimeout(check, 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/72 flex items-center justify-center p-6">
      <div className="bg-forest-900 border border-saffron-400/20 rounded-2xl p-7 max-w-sm w-full text-center shadow-2xl">
        <div className="w-13 h-13 rounded-full bg-saffron-400/15 flex items-center justify-center mx-auto mb-3.5">
          <Download className="w-6 h-6 text-saffron-400" />
        </div>
        <h3 className="text-cream-50 text-lg font-bold mb-1">Update Available</h3>
        <p className="text-forest-400 text-sm mb-5">Version v{version}</p>
        <div className="flex gap-2.5">
          <button onClick={() => { localStorage.setItem('mg_dismissed_version', version); localStorage.removeItem('mg_update_cache'); setShow(false) }}
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-transparent text-forest-400 text-sm font-medium hover:text-cream-50 transition-colors">
            <X className="w-4 h-4 inline mr-1" /> Skip
          </button>
          <button onClick={() => { window.open(url, '_system'); setShow(false) }}
            className="flex-1 py-2.5 rounded-xl bg-saffron-400 text-forest-900 text-sm font-bold hover:bg-saffron-300 transition-colors">
            Download Update
          </button>
        </div>
      </div>
    </div>
  )
}
