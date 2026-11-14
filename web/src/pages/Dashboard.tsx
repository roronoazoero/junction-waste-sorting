import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccuracyTrend } from '../components/dash/AccuracyTrend'
import { BinCards } from '../components/dash/BinCards'
import { pct } from '../components/dash/Card'
import { DEFAULT_FILTERS, FilterBar } from '../components/dash/FilterBar'
import type { Filters } from '../components/dash/FilterBar'
import { GlassStat, Leaderboard } from '../components/dash/Glass'
import { EventFeed, MisSortedPanel } from '../components/dash/Panels'
import { NatureBackdrop } from '../components/ui/Nature'
import {
  accuracy,
  accuracyByDay,
  accuracyByGroup,
  averagePurity,
  binPurity,
  binsNow,
  misSortFlows,
  score,
} from '../data/metrics'
import { getEmptyings, getEvents, getStations, IS_LIVE } from '../data/source'
import { BIN_LABEL } from '../data/types'
import type { EmptiedEvent, SortEvent, Station } from '../data/types'

const DAY_MS = 24 * 60 * 60 * 1000

export default function Dashboard() {
  const [stations, setStations] = useState<Station[]>([])
  const [events, setEvents] = useState<SortEvent[] | null>(null)
  const [emptyings, setEmptyings] = useState<EmptiedEvent[]>([])
  const [error, setError] = useState(false)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)

  useEffect(() => {
    let live = true
    const load = () =>
      Promise.all([getStations(), getEvents(), getEmptyings()])
        .then(([s, e, emptied]) => {
          if (!live) return
          setStations(s)
          setEvents(e)
          setEmptyings(emptied)
          setError(false)
        })
        .catch(() => live && setError(true))
    load()
    // Real data keeps arriving, so ask again every few seconds.
    const timer = IS_LIVE ? setInterval(load, 4000) : undefined
    return () => {
      live = false
      clearInterval(timer)
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

  // Bin contents follow the location filter only: what is in a bin does not depend on the period or mode.
  const nowBins = useMemo(() => {
    const ids = stations
      .filter(
        (s) =>
          (!filters.site || s.site === filters.site) &&
          (!filters.floor || s.floor === filters.floor) &&
          (!filters.room || s.id === filters.room),
      )
      .map((s) => s.id)
    return binsNow(events ?? [], emptyings, ids)
  }, [events, emptyings, stations, filters.site, filters.floor, filters.room])

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
      trend: accuracyByDay(scored),
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

  const latest = events && events.length > 0 ? new Date(events[events.length - 1].ts) : null

  return (
    <div className="min-h-screen bg-[#f0f0ea] text-ink">
      <section className="relative isolate overflow-hidden rounded-b-[2rem] text-white">
        <NatureBackdrop />
        <div className="mx-auto max-w-6xl px-4 pt-5 pb-8 sm:px-6">
          <header className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Binwise home"
              className="flex size-11 items-center justify-center rounded-full bg-lime text-lg font-semibold text-forest-deep"
            >
              B
            </Link>
            <nav className="glass flex gap-1 !rounded-full p-1 text-sm">
              <span className="rounded-full bg-white px-4 py-2 font-medium text-ink">Overview</span>
              <Link to="/" className="rounded-full px-4 py-2 text-white/90 transition-colors duration-150 hover:bg-white/10">
                How it works
              </Link>
            </nav>
          </header>

          <div className="mt-10 flex flex-wrap items-end gap-x-4 gap-y-2">
            <h1 className="display text-5xl sm:text-7xl">{where}</h1>
            {latest && (
              <span className="mb-1 rounded-full border border-white/40 px-3 py-1 text-sm sm:mb-2">
                Updated {latest.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}
              </span>
            )}
          </div>
          <p className="mt-2 text-white/75">
            Sorting statistics. Counts only, no images.
            {IS_LIVE && error && events !== null ? ' Connection to the data server lost; showing the last data received.' : ''}
          </p>

          <div className="mt-6">
            <FilterBar stations={stations} filters={filters} onChange={setFilters} />
          </div>

          {events === null ? (
            <p className="py-24 text-center text-white/75">
              {error ? 'Cannot reach the data server. Is it running?' : 'Loading…'}
            </p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <GlassStat label="Sorted correctly" value={pct(stats.accuracy)} />
                  <GlassStat label="Average bin purity" value={pct(stats.avgPurity)} note="correct contents per bin" />
                </div>
                <AccuracyTrend points={stats.trend} />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <GlassStat
                    label="Items thrown"
                    value={filtered.length.toLocaleString()}
                    note={notScored > 0 ? `${notScored.toLocaleString()} not scored (unsure)` : undefined}
                  />
                  <GlassStat
                    label="Biggest problem"
                    value={worst ? pct(worst.rate) : '–'}
                    note={
                      worst
                        ? `of ${BIN_LABEL[worst.from].toLowerCase()} goes to ${BIN_LABEL[worst.to].toLowerCase()}`
                        : 'nothing sorted wrong'
                    }
                  />
                </div>
                <Leaderboard level={stats.level} groups={stats.groups} onPick={filters.room ? undefined : pickLocation} />
              </div>
            </div>
          )}
        </div>
      </section>

      {events !== null && (
        <main className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
          <div className="px-1">
            <h2 className="text-2xl font-medium tracking-tight">What is in each bin now</h2>
            <p className="mt-1 text-sm text-ink/60">
              Counted since each bin was last emptied. The period and mode filters do not apply here.
            </p>
          </div>
          <BinCards bins={nowBins} stations={stationById} now={latest ? latest.getTime() : 0} />

          <MisSortedPanel flows={stats.flows} />
          <EventFeed events={filtered} stations={stationById} />

          <p className="px-1 pt-2 text-sm text-ink/50">
            {IS_LIVE ? 'Live data from the station.' : 'Showing demo data in the format the station sends.'} No images are
            captured or stored, only counts.
          </p>
        </main>
      )}
    </div>
  )
}
