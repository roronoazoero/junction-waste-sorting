import type { ReactNode } from 'react'

export function Card({
  title,
  hint,
  children,
  className = '',
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-[0_1px_2px_rgb(16_35_26/0.06)] sm:p-6 ${className}`}>
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink/60">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function pct(value: number | null, digits = 0): string {
  return value === null ? '–' : `${(value * 100).toFixed(digits)}%`
}

export const BIN_BG: Record<string, string> = {
  bio: 'bg-bio',
  plastic: 'bg-plastic',
  mixed: 'bg-mixed',
}
