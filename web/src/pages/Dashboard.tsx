import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccuracyTrend } from '../components/dash/AccuracyTrend'
import { pct } from '../components/dash/Card'
import { DEFAULT_FILTERS, FilterBar } from '../components/dash/FilterBar'
import type { Filters } from '../components/dash/FilterBar'
import {
  BinPurityPanel,
  ButtonVsSensorPanel,
  ConfusionPanel,
  EventFeed,
  KpiRow,
  LocationPanel,
  MisSortedPanel,
} from '../components/dash/Panels'
import {
  accuracy,
  accuracyByDay,
  accuracyByGroup,
  averagePurity,
  binPurity,
  buttonVsSensor,
  confusionMatrix,
  misSortFlows,
  score,
} from '../data/metrics'
import { getEvents, getStations } from '../data/source'
import { BIN_LABEL } from '../data/types'
import type { SortEvent, Station } from '../data/types'

const DAY_MS = 24 * 60 * 60 * 1000

export default function Dashboard() {
  const [stations, setStations] = useState<Station[]>([])
  const [events, setEvents] = useState<SortEvent[] | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  useEffect(() => {
    let live = true
    Promise.all([getStations(), getEvents()]).then(([s, e]) => {
      if (!live) return
      setStations(s)
      setEvents(e)
    })
    return () => {
      live = false
    }
  }, [])

  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations])

  const filtered = useMemo(() => {
    if (!events || events.length === 0) return []
    const latest = events[events.length - 1].ts
    const dayStart = new Date(latest)
    dayStart.setHours(0, 0, 0, 0)
    const from = dayStart.getTime() - (filters.days - 1) * DAY_MS
    return events.filter((e) => {
      const st = stationById.get(e.stationId)
      if (!st || e.ts < from) return false
      if (filters.site && st.site !== filters.site) return false
      if (filters.floor && st.floor !== filters.floor) return false
      if (filters.room && st.id !== filters.room) return false
      return filters.mode === 'all' || e.mode === filters.mode
    })
  }, [events, filters, stationById])

  const stats = useMemo(() => {
    const scored = score(filtered)
    const purities = binPurity(scored)
    const flows = misSortFlows(scored)
    const level: 'building' | 'floor' | 'room' = !filters.site ? 'building' : !filters.floor ? 'floor' : 'room'
    const groups = accuracyByGroup(scored, (e) => {
      const st = stationById.get(e.stationId) as Station
      return level === 'building' ? st.site : level === 'floor' ? st.floor : st.room
    })
    return {
      scored,
      purities,
      flows,
      level,
      groups,
      accuracy: accuracy(scored),
      avgPurity: averagePurity(purities),
      matrix: confusionMatrix(scored),
      trend: accuracyByDay(scored),
      both: buttonVsSensor(filtered),
    }
  }, [filtered, filters.site, filters.floor, stationById])

  const pickLocation = (key: string) => {
    if (stats.level === 'building') setFilters({ ...filters, site: key, floor: '', room: '' })
    else if (stats.level === 'floor') setFilters({ ...filters, floor: key, room: '' })
    else {
      const st = stations.find((s) => s.site === filters.site && s.floor === filters.floor && s.room === key)
      if (st) setFilters({ ...filters, room: st.id })
    }
  }

  const worst = stats.flows.find((f) => f.count > 0)
  const notScored = filtered.length - stats.scored.length
  const where = filters.room
    ? `${stationById.get(filters.room)?.site}, ${stationById.get(filters.room)?.room}`
    : [filters.site, filters.floor].filter(Boolean).join(', ') || 'All buildings'

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight text-forest">
            Binwise
          </Link>
          <Link to="/" className="text-sm text-ink/70 underline underline-offset-4 hover:text-ink">
            How it works
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
        <div>
          <p className="text-sm text-ink/60">Sorting statistics</p>
          <h1 className="display mt-1 text-4xl sm:text-6xl">{where}</h1>
        </div>

        <FilterBar stations={stations} filters={filters} onChange={setFilters} />

        {events === null ? (
          <p className="py-20 text-center text-ink/60">Loading…</p>
        ) : (
          <>
            <KpiRow
              items={[
                {
                  label: 'Items thrown',
                  value: filtered.length.toLocaleString(),
                  note: notScored > 0 ? `${notScored.toLocaleString()} not scored (unsure)` : undefined,
                },
                { label: 'Sorted correctly', value: pct(stats.accuracy) },
                { label: 'Average bin purity', value: pct(stats.avgPurity), note: 'correct contents per bin' },
                {
                  label: 'Biggest problem',
                  value: worst ? pct(worst.rate) : '–',
                  note: worst
                    ? `of ${BIN_LABEL[worst.from].toLowerCase()} goes to ${BIN_LABEL[worst.to].toLowerCase()}`
                    : 'nothing sorted wrong',
                },
              ]}
            />

            <BinPurityPanel purities={stats.purities} />

            <div className="grid gap-4 lg:grid-cols-2">
              <MisSortedPanel flows={stats.flows} />
              <LocationPanel
                level={stats.level}
                groups={stats.groups}
                onPick={filters.room ? undefined : pickLocation}
              />
            </div>

            <AccuracyTrend points={stats.trend} />

            <div className="grid gap-4 lg:grid-cols-2">
              <ConfusionPanel matrix={stats.matrix} />
              <ButtonVsSensorPanel stats={stats.both} />
            </div>

            <EventFeed events={filtered} stations={stationById} />

            <p className="pt-2 text-sm text-ink/50">
              Showing demo data in the format the station sends. No images are captured or stored, only counts.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
