import Lenis from 'lenis'
import { animate, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Smooth scrolling for the story page. Off when the visitor prefers reduced motion. */
export function useSmoothScroll() {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({ autoRaf: true })
    return () => lenis.destroy()
  }, [reduce])
}

/** Fade and rise into place the first time the element scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Counts up to `value` once, when scrolled into view. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, value, {
      duration: 1.4,
      ease: EASE_OUT,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = `${Math.round(v)}${suffix}`
      },
    })
    return () => controls.stop()
  }, [inView, reduce, value, suffix])

  return (
    <span ref={ref} className="tabular-nums">
      {reduce ? value : 0}
      {suffix}
    </span>
  )
}
