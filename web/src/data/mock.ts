import type { BinId, SortEvent, Station } from './types'

// Deterministic fake data in the same shape the station will send.

export const MOCK_STATIONS: Station[] = [
  { id: 'vare-1', site: 'Aalto Väre', floor: 'Floor 1', room: 'Lobby café', kind: 'university', inputs: 'both' },
  { id: 'vare-2', site: 'Aalto Väre', floor: 'Floor 2', room: 'Studio wing', kind: 'university', inputs: 'sensor' },
  { id: 'school-1', site: 'Otaniemi School', floor: 'Floor 1', room: 'Canteen', kind: 'school', inputs: 'both' },
  { id: 'school-2', site: 'Otaniemi School', floor: 'Floor 2', room: 'Class 3B', kind: 'school', inputs: 'buttons' },
  { id: 'office-4', site: 'Kamppi Office', floor: 'Floor 4', room: 'Kitchen', kind: 'office', inputs: 'sensor' },
  { id: 'office-6', site: 'Kamppi Office', floor: 'Floor 6', room: 'Open office', kind: 'office', inputs: 'buttons' },
]

const VOLUME: Record<string, number> = {
  'vare-1': 1.5, 'vare-2': 0.7, 'school-1': 1.3, 'school-2': 0.5, 'office-4': 1.0, 'office-6': 0.6,
}
const ERROR_FACTOR: Record<string, number> = {
  'vare-1': 1.1, 'vare-2': 0.9, 'school-1': 1.25, 'school-2': 0.8, 'office-4': 1.0, 'office-6': 1.15,
}

// Plastic and bio-waste leak into mixed waste most often.
const BASE_ERROR: Record<BinId, number> = { bio: 0.18, plastic: 0.34, mixed: 0.12 }
const WRONG_TARGETS: Record<BinId, [BinId, number][]> = {
  bio: [['mixed', 0.8], ['plastic', 0.2]],
  plastic: [['mixed', 0.85], ['bio', 0.15]],
  mixed: [['plastic', 0.6], ['bio', 0.4]],
}

const DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000
const END = new Date(2026, 10, 14, 15, 0).getTime()

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateMockEvents(): SortEvent[] {
  const rng = mulberry32(2026)
  const pickWrong = (cat: BinId): BinId => {
    const [first, second] = WRONG_TARGETS[cat]
    return rng() < first[1] ? first[0] : second[0]
  }
  const events: SortEvent[] = []

  for (let d = DAYS - 1; d >= 0; d--) {
    const dayStart = new Date(END - d * DAY_MS)
    dayStart.setHours(0, 0, 0, 0)
    const weekend = dayStart.getDay() === 0 || dayStart.getDay() === 6
    // Learning effect: people get better over the month.
    const learning = 1.3 - 0.6 * ((DAYS - 1 - d) / (DAYS - 1))

    for (const st of MOCK_STATIONS) {
      const n = Math.round((40 + rng() * 40) * VOLUME[st.id] * (weekend ? 0.15 : 1))
      for (let i = 0; i < n; i++) {
        const hour = 8 + ((rng() + rng() + rng()) / 3) * 9 // peaks around lunch
        const ts = dayStart.getTime() + hour * 60 * 60 * 1000
        if (ts > END) continue

        const r = rng()
        const category: BinId = r < 0.35 ? 'bio' : r < 0.65 ? 'plastic' : 'mixed'
        const mode = st.inputs === 'buttons' || rng() < 0.7 ? 'challenge' : 'guide'
        const pError = BASE_ERROR[category] * learning * ERROR_FACTOR[st.id] * (mode === 'guide' ? 0.45 : 1)
        const intended = rng() < pError ? pickWrong(category) : category
        const confidence = rng() < 0.07 ? 0.4 + rng() * 0.19 : 0.62 + rng() * 0.37

        const event: SortEvent = { ts, stationId: st.id, category, confidence, mode }
        if (st.inputs !== 'sensor') event.chosenBin = intended
        if (st.inputs === 'sensor') event.landedBin = intended
        if (st.inputs === 'both') {
          if (intended === category) {
            // Knew the right bin, occasionally still missed the opening.
            event.landedBin = rng() < 0.05 ? pickWrong(category) : category
          } else {
            // Pressed wrong, saw the red light, and often corrected the throw.
            event.landedBin = rng() < 0.45 ? category : intended
          }
        }
        events.push(event)
      }
    }
  }
  return events.sort((a, b) => a.ts - b.ts)
}
