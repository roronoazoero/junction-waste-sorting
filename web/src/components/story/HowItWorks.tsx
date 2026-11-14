import { motion, useMotionValue, useMotionValueEvent, useScroll } from 'motion/react'
import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Station3D } from './Station3D'

const STEPS = [
  {
    title: 'Hold it up',
    body: "Someone holds the thing they are about to throw away up to the robot's camera.",
    screen: 'Show me',
  },
  {
    title: 'Recognised on the device',
    body: 'An image classifier on the Arduino UNO Q decides: bio-waste, plastic packaging or mixed waste. Nothing leaves the board.',
    screen: 'Plastic',
  },
  {
    title: 'Pick a bin',
    body: 'The bin buttons light up. The person presses the bin they are about to use, or just throws.',
    screen: 'Which bin?',
  },
  {
    title: 'Feedback, right away',
    body: 'Green or red, a sound and a face on the screen. If it was wrong, the right bin is shown. A distance sensor in each bin checks where the item really landed.',
    screen: 'Correct!',
  },
  {
    title: 'Counted, never photographed',
    body: 'The throw is logged as numbers only: where, which waste type, right or wrong. That is all the dashboard ever sees.',
    screen: '+1 counted',
  },
]

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length))))
  })

  const onPointerMove = (e: PointerEvent) => {
    pointerX.set((e.clientX / window.innerWidth - 0.5) * 2)
    pointerY.set((e.clientY / window.innerHeight - 0.5) * 2)
  }

  return (
    <section id="how" ref={ref} className="relative h-[450vh] bg-forest-deep text-cream">
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden" onPointerMove={onPointerMove}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 pt-6 text-sm text-cream/70 sm:px-6">
          <span>How it works</span>
          <span className="tabular-nums">
            0{step + 1} / 0{STEPS.length}
          </span>
        </div>
        <div className="mx-auto mt-3 h-px w-full max-w-6xl bg-cream/15 px-0">
          <motion.div className="h-px origin-left bg-lime" style={{ scaleX: scrollYProgress }} />
        </div>

        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pb-8 sm:px-6 md:grid-cols-2">
          {/* The station: robot on the bin, in 3D */}
          <div className="relative h-[280px] w-full md:h-[460px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.6] md:scale-100">
              <Station3D step={step} screen={STEPS[step].screen} pointerX={pointerX} pointerY={pointerY} />
            </div>
          </div>

          {/* Step text: all steps share one grid cell and cross-fade */}
          <div className="grid">
            {STEPS.map((s, i) => (
              <div key={s.title} className="hiw-step col-start-1 row-start-1" data-active={i === step}>
                <h3 className="display text-4xl sm:text-6xl">{s.title}</h3>
                <p className="mt-4 max-w-md text-lg text-cream/75">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
