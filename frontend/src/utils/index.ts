export function safeParse<T>(str: string | null | undefined, fallback: T): T {
  if (typeof str !== 'string') return fallback
  try { return JSON.parse(str) as T } catch { return fallback }
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0)
  }
  return 0
}

export const APP_VERSION = '3.1.6'
export const GITHUB_REPO = 'SubodhShah-Dev/Mero-Ghar-Logistic'
