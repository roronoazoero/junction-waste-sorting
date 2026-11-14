import type { GroupStat } from '../../data/metrics'
import { pct } from './Card'

/** A small frosted number tile for the dashboard hero. */
export function GlassStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="glass p-4 sm:p-5">
      <p className="text-sm text-white/75">{label}</p>
      <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">{value}</p>
      {note && <p className="mt-1 text-xs text-white/70">{note}</p>}
    </div>
  )
}

/** Locations ranked by sorting accuracy, best first. */
export function Leaderboard({
  level,
  groups,
  onPick,
}: {
  level: 'building' | 'floor' | 'room'
  groups: GroupStat[]
  onPick?: (key: string) => void
}) {
  const ranked = [...groups].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
  return (
    <section className="glass p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium tracking-tight">Leaderboard</h2>
        <p className="text-sm text-white/70">Best sorting {level}s</p>
      </div>
      {ranked.length === 0 ? (
        <p className="py-8 text-sm text-white/70">No throws in this selection yet.</p>
      ) : (
        <ol className="mt-3 space-y-1">
          {ranked.map((g, i) => {
            const row = (
              <span className="flex items-center gap-3">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                    i === 0 ? 'bg-lime text-forest-deep' : 'bg-white/15 text-white'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">{g.key}</span>
                    <span className="text-xl font-medium tabular-nums">{pct(g.accuracy)}</span>
                  </span>
                  <span className="mt-1.5 block h-1.5 rounded-full bg-white/20">
                    <span
                      className={`block h-full rounded-full ${i === 0 ? 'bg-lime' : 'bg-white/80'}`}
                      style={{ width: pct(g.accuracy ?? 0) }}
                    />
                  </span>
                  <span className="mt-1 block text-xs text-white/70">{g.count.toLocaleString()} {g.count === 1 ? 'item' : 'items'} sorted</span>
                </span>
              </span>
            )
            return (
              <li key={g.key}>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(g.key)}
                    className="block w-full rounded-2xl p-2 text-left transition-colors duration-150 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-lime"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="p-2">{row}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {onPick && ranked.length > 0 && <p className="mt-2 px-2 text-xs text-white/60">Select a row to look closer.</p>}
    </section>
  )
}
