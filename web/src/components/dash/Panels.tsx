import { actualBin, LOW_CONFIDENCE } from '../../data/metrics'
import type { BinPurity, ButtonVsSensor, GroupStat, MisSortFlow } from '../../data/metrics'
import { BIN_LABEL, BIN_LABEL_FI, BINS } from '../../data/types'
import type { BinId, SortEvent, Station } from '../../data/types'
import { BIN_BG, Card, pct } from './Card'

export function KpiRow({ items }: { items: { label: string; value: string; note?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((k) => (
        <div key={k.label} className="rounded-2xl border border-ink/15 bg-white/70 p-5">
          <p className="text-sm text-ink/60">{k.label}</p>
          <p className="mt-2 text-3xl font-medium tracking-tight tabular-nums sm:text-4xl">{k.value}</p>
          {k.note && <p className="mt-1 text-sm text-ink/60">{k.note}</p>}
        </div>
      ))}
    </div>
  )
}

export function BinPurityPanel({ purities }: { purities: BinPurity[] }) {
  return (
    <Card title="What is in each bin" hint="How much of each bin's contents actually belongs there.">
      <div className="grid gap-6 sm:grid-cols-3">
        {purities.map((p) => {
          const wrong = BINS.filter((b) => b !== p.bin && p.contents[b] > 0)
          return (
            <div key={p.bin}>
              <p className="font-medium">{BIN_LABEL[p.bin]}</p>
              <p className="text-sm text-ink/60">{BIN_LABEL_FI[p.bin]}</p>
              <p className="mt-3 text-5xl font-medium tracking-tight tabular-nums">{pct(p.purity)}</p>
              <p className="text-sm text-ink/60">correct contents</p>
              <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
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
                  ? 'No items yet'
                  : wrong.length === 0
                    ? `${p.total.toLocaleString()} items, nothing wrong in it`
                    : `${p.total.toLocaleString()} items. Also contains ${wrong
                        .map((b) => `${pct(p.contents[b] / p.total)} ${BIN_LABEL[b].toLowerCase()}`)
                        .join(' and ')}.`}
              </p>
            </div>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-4 border-t border-ink/10 pt-4 text-sm text-ink/70">
        {BINS.map((b) => (
          <span key={b} className="flex items-center gap-2">
            <span className={`size-3 rounded-full ${BIN_BG[b]}`} />
            {BIN_LABEL[b]}
          </span>
        ))}
      </div>
    </Card>
  )
}

export function MisSortedPanel({ flows }: { flows: MisSortFlow[] }) {
  const shown = flows.filter((f) => f.count > 0)
  const max = Math.max(...shown.map((f) => f.rate), 0.0001)
  return (
    <Card title="Most often sorted wrong" hint="Which waste type ends up in which wrong bin.">
      {shown.length === 0 ? (
        <p className="py-6 text-sm text-ink/60">Nothing sorted wrong in this selection.</p>
      ) : (
        <ol className="space-y-4">
          {shown.map((f) => (
            <li key={`${f.from}-${f.to}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">
                  {BIN_LABEL[f.from]} <span className="text-ink/50">in</span> {BIN_LABEL[f.to].toLowerCase()}
                </p>
                <p className="shrink-0 tabular-nums">{pct(f.rate)}</p>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-wrong" style={{ width: `${(f.rate / max) * 100}%` }} />
              </div>
              <p className="mt-1 text-sm text-ink/60">
                {f.count.toLocaleString()} items, {pct(f.rate)} of all {BIN_LABEL[f.from].toLowerCase()}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

export function ConfusionPanel({ matrix }: { matrix: Record<BinId, Record<BinId, number>> }) {
  return (
    <Card title="Waste type vs bin used" hint="Each row is a waste type; the columns show where it went.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left font-normal text-ink/60">Waste type</th>
              {BINS.map((b) => (
                <th key={b} className="p-2 text-right font-normal text-ink/60">
                  {BIN_LABEL[b]} bin
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BINS.map((row) => {
              const total = BINS.reduce((sum, b) => sum + matrix[row][b], 0)
              return (
                <tr key={row}>
                  <th className="p-2 text-left font-medium">{BIN_LABEL[row]}</th>
                  {BINS.map((col) => {
                    const share = total ? matrix[row][col] / total : 0
                    const right = row === col
                    return (
                      <td
                        key={col}
                        className="rounded-lg p-2 text-right tabular-nums"
                        style={{
                          backgroundColor: right
                            ? `rgba(31, 138, 76, ${0.08 + share * 0.3})`
                            : `rgba(217, 72, 43, ${Math.min(0.5, share * 1.4)})`,
                        }}
                      >
                        <span className="font-medium">{pct(share)}</span>
                        <span className="block text-xs text-ink/60">{matrix[row][col].toLocaleString()}</span>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export function LocationPanel({
  level,
  groups,
  onPick,
}: {
  level: 'building' | 'floor' | 'room'
  groups: GroupStat[]
  onPick?: (key: string) => void
}) {
  return (
    <Card title={`Accuracy by ${level}`} hint={onPick ? 'Lowest first. Click a row to look closer.' : 'Lowest first.'}>
      {groups.length === 0 ? (
        <p className="py-6 text-sm text-ink/60">No data for this selection.</p>
      ) : (
        <ul className="space-y-1">
          {groups.map((g) => {
            const row = (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{g.key}</span>
                  <span className="tabular-nums">{pct(g.accuracy)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-forest" style={{ width: pct(g.accuracy ?? 0) }} />
                </div>
                <span className="mt-1 block text-sm text-ink/60">{g.count.toLocaleString()} items</span>
              </>
            )
            return (
              <li key={g.key}>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(g.key)}
                    className="-mx-2 block w-[calc(100%+1rem)] rounded-xl p-2 text-left transition-colors duration-150 hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-forest"
                  >
                    {row}
                  </button>
                ) : (
                  <div className="py-2">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function ButtonVsSensorPanel({ stats }: { stats: ButtonVsSensor }) {
  if (stats.total === 0) return null
  return (
    <Card
      title="Button press vs actual throw"
      hint="Only from stations that have both buttons and the distance sensor."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-4xl font-medium tracking-tight tabular-nums">
            {pct(stats.pressedWrong ? stats.correctedAfterFeedback / stats.pressedWrong : null)}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            of wrong guesses were corrected after the red light: {stats.correctedAfterFeedback.toLocaleString()} of{' '}
            {stats.pressedWrong.toLocaleString()} items still went into the right bin.
          </p>
        </div>
        <div>
          <p className="text-4xl font-medium tracking-tight tabular-nums">
            {pct(stats.pressedRightThrewWrong / stats.total, 1)}
          </p>
          <p className="mt-1 text-sm text-ink/70">
            pressed the right button but the item landed in another bin ({stats.pressedRightThrewWrong.toLocaleString()}{' '}
            items).
          </p>
        </div>
      </div>
    </Card>
  )
}

export function EventFeed({ events, stations }: { events: SortEvent[]; stations: Map<string, Station> }) {
  const recent = events.slice(-10).reverse()
  return (
    <Card title="Latest throws" hint="Counts only. The station never stores an image.">
      {recent.length === 0 ? (
        <p className="py-6 text-sm text-ink/60">No throws in this selection.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-ink/60">
                <th className="pb-2 font-normal">Time</th>
                <th className="pb-2 font-normal">Place</th>
                <th className="pb-2 font-normal">Waste type</th>
                <th className="pb-2 font-normal">Went into</th>
                <th className="pb-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e, i) => {
                const st = stations.get(e.stationId)
                const actual = actualBin(e)
                const unsure = e.confidence < LOW_CONFIDENCE
                const right = actual === e.category
                return (
                  <tr key={`${e.ts}-${i}`} className="border-t border-ink/10">
                    <td className="py-2 pr-3 whitespace-nowrap tabular-nums text-ink/70">
                      {new Date(e.ts).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 pr-3">{st ? `${st.site}, ${st.room}` : e.stationId}</td>
                    <td className="py-2 pr-3">{unsure ? 'Not sure' : BIN_LABEL[e.category]}</td>
                    <td className="py-2 pr-3">{actual ? BIN_LABEL[actual] : 'Unknown'}</td>
                    <td className="py-2 font-medium">
                      {unsure ? (
                        <span className="text-ink/50">Not scored</span>
                      ) : right ? (
                        <span className="text-correct">✓ Correct</span>
                      ) : (
                        <span className="text-wrong">✕ Wrong</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
