import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayPoint } from '../../data/metrics'

/** Daily accuracy, drawn on a frosted panel in the dashboard hero. */
export function AccuracyTrend({ points }: { points: DayPoint[] }) {
  return (
    <section className="glass p-4 sm:p-5">
      <h2 className="text-lg font-medium tracking-tight">Accuracy over time</h2>
      <p className="mt-1 text-sm text-white/70">Share of items sorted correctly, per day.</p>
      {points.length < 2 ? (
        <p className="py-16 text-center text-sm text-white/70">Pick a longer period to see a trend.</p>
      ) : (
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#ffffff" strokeOpacity={0.14} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#ffffffb3' }}
                tickLine={false}
                axisLine={{ stroke: '#ffffff40' }}
                minTickGap={28}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#ffffffb3' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${value}% correct (${(item.payload as DayPoint).count} items)`,
                  'Accuracy',
                ]}
                contentStyle={{ borderRadius: 12, border: 'none', fontSize: 13, color: '#10231a' }}
                cursor={{ stroke: '#ffffff66' }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#8be04e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#8be04e', stroke: '#072a19' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}
