import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayPoint } from '../../data/metrics'
import { Card } from './Card'

export function AccuracyTrend({ points }: { points: DayPoint[] }) {
  return (
    <Card title="Accuracy over time" hint="Share of items sorted correctly, per day. A rising line is the learning effect.">
      {points.length < 2 ? (
        <p className="py-10 text-center text-sm text-ink/60">Pick a longer period to see a trend.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="#10231a" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: '#10231a99' }}
                tickLine={false}
                axisLine={{ stroke: '#10231a33' }}
                minTickGap={28}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 12, fill: '#10231a99' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${value}% correct (${(item.payload as DayPoint).count} items)`,
                  'Accuracy',
                ]}
                contentStyle={{ borderRadius: 12, border: '1px solid #10231a26', fontSize: 13 }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#0b3d24"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#0b3d24' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
