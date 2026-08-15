const PLATE_REGEX = /^(KH|JA|BA|GA|LU|KA|SU)\s?(\d{1,2})\s?([A-Z]{1,2})\s?(\d{1,4})$/

export const PHONE_REGEX = /^[0-9]{10}$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Normalize a Nepali number plate to "BA 1 KA 1234"; null when unrecognized.
export const normalizePlateNumber = (plate: string): string | null => {
  const s = plate.toUpperCase().replace(/[-\s]+/g, ' ').trim()
  const m = s.match(PLATE_REGEX)
  if (!m) return null
  return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`
}
