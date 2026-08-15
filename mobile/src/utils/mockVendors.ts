import type { VendorItem } from '../components/VendorSelectionModal'

// ── Mock vendor generator (perf validation) ─────────────────────────────────
// Generates a large vendor list (1,000+) with realistic Nepali plate numbers
// and vehicle models so the VendorSelectionModal FlatList can be validated at
// 60fps on Android. Opt-in: set MOCK_PERF_ENABLED to true (or rely on the
// __DEV__ default) when measuring scroll performance; production uses real
// API data, so keep it false for release builds.

export const MOCK_PERF_ENABLED = false

const ZONES = ['BA', 'JA', 'KA', 'LU', 'GA', 'BHA', 'MA', 'NA', 'RA', 'SA', 'SU', 'DH', 'KO', 'PA']
const DISTRICTS = ['PA', 'KA', 'KHA', 'GA', 'CHA', 'THA', 'DA', 'TA', 'BA', 'RA', 'NA', 'MA', 'SA', 'JA']
const MODELS = [
  { name: 'Tata Ace', vehicle_type: 'Cargo Tempo' },
  { name: 'Tata 407', vehicle_type: 'Mini Truck' },
  { name: 'Tata 909', vehicle_type: 'Large Truck' },
  { name: 'Mahindra Bolero Pikup', vehicle_type: 'Cargo Tempo' },
  { name: 'Isuzu Elf', vehicle_type: 'Mini Truck' },
  { name: 'Ashok Leyland Dost', vehicle_type: 'Large Truck' },
]
const REGIONS = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kaski', 'Morang', 'Parsa',
  'Rupandehi', 'Banke', 'Surkhet', 'Kailali', 'Chitwan', 'Makwanpur',
  'Dhanusha', 'Sunsari', 'Dhankuta', 'Palpa',
]

const mulberry32 = (seed: number) => {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateMockVendors(count: number): VendorItem[] {
  const rand = mulberry32(20260815)
  const vendors: VendorItem[] = []
  for (let i = 0; i < count; i++) {
    const model = MODELS[Math.floor(rand() * MODELS.length)]
    const zone = ZONES[Math.floor(rand() * ZONES.length)]
    const zoneNum = 1 + Math.floor(rand() * 9)
    const district = DISTRICTS[Math.floor(rand() * DISTRICTS.length)]
    const serial = 100 + Math.floor(rand() * 9000)
    const rating = Math.round((3.5 + rand() * 1.5) * 10) / 10
    vendors.push({
      id: i + 1,
      business_name: `MeroMover ${i + 1}`,
      service_region: REGIONS[Math.floor(rand() * REGIONS.length)],
      rating,
      total_jobs: Math.floor(rand() * 500),
      branch_name: REGIONS[Math.floor(rand() * REGIONS.length)],
      match_tier: rand() > 0.5 ? 'exact' : 'province',
      plate_number: `${zone} ${zoneNum} ${district} ${serial}`,
      vehicle_name: model.name,
      vehicle_type: model.vehicle_type,
    })
  }
  return vendors
}
