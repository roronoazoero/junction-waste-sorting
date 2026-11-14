import type { Station } from '../../data/types'

export interface Filters {
  site: string
  floor: string
  /** Station id, since one station sits in one room. */
  room: string
  days: number
  mode: 'all' | 'guide' | 'challenge'
}

export const DEFAULT_FILTERS: Filters = { site: '', floor: '', room: '', days: 30, mode: 'all' }

const selectClass =
  'h-10 rounded-full border border-ink/20 bg-white/80 px-4 text-sm text-ink disabled:opacity-40 focus:outline-2 focus:outline-forest'

export function FilterBar({
  stations,
  filters,
  onChange,
}: {
  stations: Station[]
  filters: Filters
  onChange: (next: Filters) => void
}) {
  const sites = [...new Set(stations.map((s) => s.site))]
  const inSite = stations.filter((s) => s.site === filters.site)
  const floors = [...new Set(inSite.map((s) => s.floor))]
  const rooms = inSite.filter((s) => !filters.floor || s.floor === filters.floor)
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Building"
        className={selectClass}
        value={filters.site}
        onChange={(e) => onChange({ ...filters, site: e.target.value, floor: '', room: '' })}
      >
        <option value="">All buildings</option>
        {sites.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Floor"
        className={selectClass}
        value={filters.floor}
        disabled={!filters.site}
        onChange={(e) => onChange({ ...filters, floor: e.target.value, room: '' })}
      >
        <option value="">All floors</option>
        {floors.map((f) => (
          <option key={f}>{f}</option>
        ))}
      </select>
      <select
        aria-label="Room"
        className={selectClass}
        value={filters.room}
        disabled={!filters.site}
        onChange={(e) => onChange({ ...filters, room: e.target.value })}
      >
        <option value="">All rooms</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.room}
          </option>
        ))}
      </select>
      <select
        aria-label="Period"
        className={selectClass}
        value={filters.days}
        onChange={(e) => onChange({ ...filters, days: Number(e.target.value) })}
      >
        <option value={1}>Today</option>
        <option value={7}>Last 7 days</option>
        <option value={14}>Last 14 days</option>
        <option value={30}>Last 30 days</option>
      </select>
      <select
        aria-label="Mode"
        className={selectClass}
        value={filters.mode}
        onChange={(e) => onChange({ ...filters, mode: e.target.value as Filters['mode'] })}
      >
        <option value="all">Both modes</option>
        <option value="challenge">Challenge mode</option>
        <option value="guide">Guide mode</option>
      </select>
      {!isDefault && (
        <button
          type="button"
          className="h-10 rounded-full px-3 text-sm text-ink/70 underline underline-offset-4 hover:text-ink"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Reset
        </button>
      )}
    </div>
  )
}
