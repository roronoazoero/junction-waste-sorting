import { BINS } from './types'
import type { BinId, EmptiedEvent, SortEvent } from './types'

/** Below this the station showed "?"; those events are counted but not scored. */
export const LOW_CONFIDENCE = 0.6

/** Where the item went. The sensor wins when both inputs exist: it is where the item really landed. */
export function actualBin(e: SortEvent): BinId | undefined {
  return e.landedBin ?? e.chosenBin
}

export type ScoredEvent = SortEvent & { actual: BinId; correct: boolean }

/** Events that can be judged: confident classification and a known bin. */
export function score(events: SortEvent[]): ScoredEvent[] {
  const out: ScoredEvent[] = []
  for (const e of events) {
    const actual = actualBin(e)
    if (actual === undefined || e.confidence < LOW_CONFIDENCE) continue
    out.push({ ...e, actual, correct: actual === e.category })
  }
  return out
}

export function accuracy(scored: ScoredEvent[]): number | null {
  if (scored.length === 0) return null
  return scored.filter((e) => e.correct).length / scored.length
}

export interface BinPurity {
  bin: BinId
  total: number
  /** Share of the bin's contents that belong there. Null when the bin is empty. */
  purity: number | null
  /** What is in the bin, by waste type. */
  contents: Record<BinId, number>
}

export function binPurity(scored: ScoredEvent[]): BinPurity[] {
  return BINS.map((bin) => {
    const inBin = scored.filter((e) => e.actual === bin)
    const contents = { bio: 0, plastic: 0, mixed: 0 }
    for (const e of inBin) contents[e.category]++
    return { bin, total: inBin.length, purity: inBin.length ? contents[bin] / inBin.length : null, contents }
  })
}

export function averagePurity(purities: BinPurity[]): number | null {
  const known = purities.filter((p) => p.purity !== null)
  if (known.length === 0) return null
  return known.reduce((sum, p) => sum + (p.purity as number), 0) / known.length
}

export interface MisSortFlow {
  from: BinId
  to: BinId
  count: number
  /** Share of all `from` items that ended up in `to`. */
  rate: number
}

/** "Plastic ends up in mixed" flows, worst first. */
export function misSortFlows(scored: ScoredEvent[]): MisSortFlow[] {
  const flows: MisSortFlow[] = []
  for (const from of BINS) {
    const ofType = scored.filter((e) => e.category === from)
    for (const to of BINS) {
      if (to === from) continue
      const count = ofType.filter((e) => e.actual === to).length
      flows.push({ from, to, count, rate: ofType.length ? count / ofType.length : 0 })
    }
  }
  return flows.sort((a, b) => b.rate - a.rate)
}

export interface DayPoint {
  day: number
  label: string
  accuracy: number
  count: number
}

export function accuracyByDay(scored: ScoredEvent[]): DayPoint[] {
  const byDay = new Map<number, { right: number; count: number }>()
  for (const e of scored) {
    const d = new Date(e.ts)
    d.setHours(0, 0, 0, 0)
    const bucket = byDay.get(d.getTime()) ?? { right: 0, count: 0 }
    bucket.count++
    if (e.correct) bucket.right++
    byDay.set(d.getTime(), bucket)
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, b]) => ({
      day,
      label: new Date(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      accuracy: Math.round((b.right / b.count) * 1000) / 10,
      count: b.count,
    }))
}

export interface GroupStat {
  key: string
  count: number
  accuracy: number | null
}

export function accuracyByGroup(scored: ScoredEvent[], keyOf: (e: ScoredEvent) => string): GroupStat[] {
  const groups = new Map<string, ScoredEvent[]>()
  for (const e of scored) {
    const key = keyOf(e)
    const list = groups.get(key)
    if (list) list.push(e)
    else groups.set(key, [e])
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, count: list.length, accuracy: accuracy(list) }))
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
}

/** Rough number of items a bin holds before it needs emptying. Tune per site. */
export const BIN_CAPACITY_ITEMS = 150

export interface BinStationFill {
  stationId: string
  /** Items in this station's bin since it was last emptied. */
  count: number
  /** Null if the bin has never been reported as emptied. */
  lastEmptied: number | null
}

export interface BinNow extends BinPurity {
  /** Every item in the bin right now, including ones the classifier was unsure about. */
  inBin: number
  perStation: BinStationFill[]
  fullest: BinStationFill | null
}

/**
 * What is in each bin right now: throws since that station's bin was last emptied.
 * Nothing is deleted on emptying; the count simply starts from the latest emptied event.
 */
export function binsNow(events: SortEvent[], emptyings: EmptiedEvent[], stationIds: string[]): BinNow[] {
  const last = new Map<string, number>()
  for (const e of emptyings) {
    const key = e.stationId + '|' + e.bin
    if (e.ts > (last.get(key) ?? 0)) last.set(key, e.ts)
  }
  const wanted = new Set(stationIds)
  const current = events.filter((e) => {
    const bin = actualBin(e)
    if (bin === undefined || !wanted.has(e.stationId)) return false
    return e.ts > (last.get(e.stationId + '|' + bin) ?? 0)
  })
  const purities = binPurity(score(current))
  return purities.map((p) => {
    const perStation = stationIds.map((stationId) => ({
      stationId,
      count: current.filter((e) => e.stationId === stationId && actualBin(e) === p.bin).length,
      lastEmptied: last.get(stationId + '|' + p.bin) ?? null,
    }))
    const fullest = perStation.reduce<BinStationFill | null>((a, b) => (a === null || b.count > a.count ? b : a), null)
    return { ...p, inBin: perStation.reduce((sum, s) => sum + s.count, 0), perStation, fullest }
  })
}
