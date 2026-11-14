import { BINS } from './types'
import type { BinId, SortEvent } from './types'

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

/** matrix[wasteType][actualBin] = count */
export function confusionMatrix(scored: ScoredEvent[]): Record<BinId, Record<BinId, number>> {
  const m = {
    bio: { bio: 0, plastic: 0, mixed: 0 },
    plastic: { bio: 0, plastic: 0, mixed: 0 },
    mixed: { bio: 0, plastic: 0, mixed: 0 },
  }
  for (const e of scored) m[e.category][e.actual]++
  return m
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

export interface ButtonVsSensor {
  /** Events that have both a button press and a sensor reading. */
  total: number
  pressedRightThrewWrong: number
  pressedWrong: number
  /** Pressed the wrong button, got the red light, and threw it in the right bin after all. */
  correctedAfterFeedback: number
}

export function buttonVsSensor(events: SortEvent[]): ButtonVsSensor {
  const both = events.filter(
    (e) => e.chosenBin !== undefined && e.landedBin !== undefined && e.confidence >= LOW_CONFIDENCE,
  )
  const pressedWrong = both.filter((e) => e.chosenBin !== e.category)
  return {
    total: both.length,
    pressedRightThrewWrong: both.filter((e) => e.chosenBin === e.category && e.landedBin !== e.category).length,
    pressedWrong: pressedWrong.length,
    correctedAfterFeedback: pressedWrong.filter((e) => e.landedBin === e.category).length,
  }
}
