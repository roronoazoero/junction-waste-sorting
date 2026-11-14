import { motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useRef, useState } from 'react'

const STEPS = [
  {
    title: 'Hold it up',
    body: 'Someone holds the thing they are about to throw away under the camera.',
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
    body: 'Green or red, a sound and a face on the screen. If it was wrong, the right bin is shown. A distance sensor can check where the item really landed.',
    screen: 'Correct!',
  },
  {
    title: 'Counted, never photographed',
    body: 'The throw is logged as numbers only: where, which waste type, right or wrong. That is all the dashboard ever sees.',
    screen: '+1 counted',
  },
]

const BINS = ['Bio', 'Plastic', 'Mixed']

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length))))
  })

  return (
    <section id="how" ref={ref} className="relative h-[450vh] bg-forest-deep text-cream">
      <div className="sticky top-0 flex h-[100svh] flex-col">
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
          {/* The station, drawn schematically */}
          <div className="flex justify-center" aria-hidden="true">
            <div className="relative h-[21rem] w-64 rounded-3xl border border-cream/20 bg-forest max-md:scale-[0.82]">
              <div className="absolute top-4 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-cream/40">
                <div className={`hiw-bin size-3 rounded-full ${step <= 1 ? 'bg-lime' : 'bg-cream/30'}`} />
              </div>
              <div className="absolute top-16 left-1/2 flex h-10 w-40 -translate-x-1/2 items-center justify-center rounded-lg bg-forest-deep text-sm font-medium text-lime">
                {STEPS[step].screen}
              </div>
              <div
                className="hiw-item absolute top-[7.5rem] left-1/2 -ml-5 size-10 rounded-lg bg-plastic"
                style={{
                  transform: step >= 3 ? 'translateY(120px) scale(0.5) rotate(40deg)' : 'rotate(12deg)',
                  opacity: step >= 4 ? 0 : 1,
                }}
              />
              <div className="absolute inset-x-4 bottom-4 grid grid-cols-3 gap-2">
                {BINS.map((name, i) => {
                  const chosen = i === 1 && step >= 3
                  const lit = step === 2
                  return (
                    <div
                      key={name}
                      className={`hiw-bin flex h-24 flex-col justify-between rounded-xl border p-2 text-xs ${
                        chosen
                          ? 'border-lime bg-lime text-forest-deep'
                          : lit
                            ? 'border-cream bg-cream/20 text-cream'
                            : 'border-cream/20 text-cream/60'
                      }`}
                    >
                      <span className="tabular-nums">{i + 1}</span>
                      <span className="font-medium">{chosen ? (step >= 4 ? '+1' : '✓') : name}</span>
                    </div>
                  )
                })}
              </div>
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
