import { BIN_CAPACITY_ITEMS } from '../../data/metrics'
import type { BinNow } from '../../data/metrics'
import { BIN_LABEL, BIN_LABEL_FI, BINS } from '../../data/types'
import type { Station } from '../../data/types'
import { BIN_BG, pct } from './Card'

function ago(from: number | null, now: number): string {
  if (from === null) return 'never emptied'
  const hours = Math.max(0, (now - from) / 3_600_000)
  if (hours < 1) return 'emptied less than an hour ago'
  if (hours < 24) return `emptied ${Math.round(hours)} h ago`
  const days = Math.round(hours / 24)
  return `emptied ${days} day${days === 1 ? '' : 's'} ago`
}

/** One card per bin: what is in it right now, counted since it was last emptied. */
export function BinCards({
  bins,
  stations,
  now,
}: {
  bins: BinNow[]
  stations: Map<string, Station>
  /** "Now" for the "emptied x ago" texts: the time of the latest data. */
  now: number
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {bins.map((p, i) => {
        const wrongCount = p.total - p.contents[p.bin]
        const wrong = BINS.filter((b) => b !== p.bin && p.contents[b] > 0)
        const single = p.perStation.length === 1
        const fullest = p.fullest
        const fill = fullest ? Math.min(1, fullest.count / BIN_CAPACITY_ITEMS) : 0
        const fullestStation = fullest ? stations.get(fullest.stationId) : undefined
        return (
          <section key={p.bin} className="rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgb(16_35_26/0.06)]">
            <div className="flex items-center gap-3">
              <span
                className={`flex size-11 items-center justify-center rounded-2xl text-lg font-semibold text-white ${BIN_BG[p.bin]}`}
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-medium tracking-tight">{BIN_LABEL[p.bin]}</h3>
                <p className="text-sm text-ink/60">{BIN_LABEL_FI[p.bin]}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-ink/5 p-3">
              <div>
                <dt className="text-xs text-ink/60">Correct</dt>
                <dd className="text-xl font-medium text-correct tabular-nums">{pct(p.purity)}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/60">Items in bin</dt>
                <dd className="text-xl font-medium tabular-nums">{p.inBin.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink/60">Wrong items</dt>
                <dd className="text-xl font-medium tabular-nums">{wrongCount.toLocaleString()}</dd>
              </div>
            </dl>

            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
              {p.total === 0 ? (
                <div className="h-full w-full bg-ink/10" />
              ) : (
                // The bin's own waste type first, then the contamination.
                [p.bin, ...BINS.filter((b) => b !== p.bin)].map((b) => (
                  <div key={b} className={`h-full ${BIN_BG[b]}`} style={{ width: `${(p.contents[b] / p.total) * 100}%` }} />
                ))
              )}
            </div>
            <p className="mt-3 text-sm text-ink/70">
              {p.total === 0
                ? 'Nothing thrown since it was emptied.'
                : wrong.length === 0
                  ? 'Nothing wrong in this bin.'
                  : `Also contains ${wrong
                      .map((b) => `${pct(p.contents[b] / p.total)} ${BIN_LABEL[b].toLowerCase()}`)
                      .join(' and ')}.`}
            </p>

            {fullest && (
              <div className="mt-4 border-t border-ink/10 pt-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink/60">{single ? 'Fill level' : 'Fullest bin'}</span>
                  <span className={`font-medium tabular-nums ${fill >= 0.8 ? 'text-wrong' : ''}`}>
                    about {pct(fill)} full
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-ink/10" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${fill >= 0.8 ? 'bg-wrong' : 'bg-forest'}`}
                    style={{ width: pct(fill) }}
                  />
                </div>
                <p className="mt-2 text-sm text-ink/70">
                  {!single && fullestStation ? `${fullestStation.site}, ${fullestStation.room}: ` : ''}
                  {fullest.count.toLocaleString()} items, {ago(fullest.lastEmptied, now)}.
                  {fill >= 0.8 ? ' Empty soon.' : ''}
                </p>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
