// Distance-based quote: base fee + per-km rate, rounded to the nearest 50 NPR.
// Mirrors backend/controllers/shipmentController.js (QUOTE_RATES / quoteFor) so
// the estimate shown in the booking form matches the payment amount.

export const QUOTE_RATES: Record<string, { base: number; perKm: number }> = {
  'Cargo Tempo': { base: 800, perKm: 30 },
  'Mini Truck': { base: 1000, perKm: 35 },
  'Large Truck': { base: 1200, perKm: 45 },
}

export const FLAT_QUOTE_BY_VEHICLE: Record<string, number> = {
  'Cargo Tempo': 4000,
  'Mini Truck': 8000,
  'Large Truck': 12000,
}

export const quoteFor = (vehicle: string, distanceKm: number | null): number => {
  const rate = QUOTE_RATES[vehicle]
  if (!rate) return FLAT_QUOTE_BY_VEHICLE[vehicle] || 0
  if (distanceKm == null) return FLAT_QUOTE_BY_VEHICLE[vehicle] || 0
  const raw = rate.base + rate.perKm * (Number(distanceKm) || 0)
  return Math.round(raw / 50) * 50
}
