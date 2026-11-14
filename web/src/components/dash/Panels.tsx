import { actualBin, LOW_CONFIDENCE } from '../../data/metrics'
import type { MisSortFlow } from '../../data/metrics'
import { BIN_LABEL } from '../../data/types'
import type { SortEvent, Station } from '../../data/types'
import { Card, pct } from './Card'

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
