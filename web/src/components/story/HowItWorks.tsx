import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, PointerEvent } from 'react'
import { EASE_OUT } from '../ui/motion'
import { HandWithPeel } from './Peel'
import { Station3D } from './Station3D'
import type { Bin, GridState, HoleState, Tone } from './Station3D'

// The visitor throws away a banana peel. It belongs in the bio bin.
const ITEM_BIN: Bin = 'bio'
const BINS: Bin[] = ['bio', 'plastic', 'mixed']

type Phase = 'idle' | 'held' | 'recognised' | 'choose' | 'dropping' | 'correct' | 'wrong' | 'counted'

const COPY: Record<Exclude<Phase, 'dropping'>, { step: number; title: string; body: string; screen: string }> = {
  idle: {
    step: 1,
    title: 'Pick up the banana peel',
    body: 'You are about to throw away a banana peel. Click it to pick it up and hold it in front of the robot.',
    screen: 'Show me',
  },
  held: {
    step: 1,
    title: 'Hold it up',
    body: "The camera in the robot's head is looking at the peel. Keep it in view for a second.",
    screen: 'Looking…',
  },
  recognised: {
    step: 2,
    title: 'Recognised on the device',
    body: 'An image classifier on the Arduino UNO Q decides: bio-waste. Nothing leaves the board.',
    screen: 'Bio-waste',
  },
  choose: {
    step: 3,
    title: 'Pick a bin',
    body: 'The bin buttons light up. Click the opening you would throw the peel into: bio, plastic or mixed.',
    screen: 'Which bin?',
  },
  correct: {
    step: 4,
    title: 'Correct!',
    body: 'Green light, a happy sound and a smile on the screen. The distance sensor in the bio bin confirmed where the peel landed.',
    screen: 'Correct!',
  },
  wrong: {
    step: 3,
    title: 'Not that one',
    body: 'Red light, a sad sound, and the screen points to the bio bin. The peel is back in your hand: try again.',
    screen: 'Try bio',
  },
  counted: {
    step: 5,
    title: 'Counted, never photographed',
    body: 'The throw is logged as numbers only: where, which waste type, right or wrong. That is all the dashboard ever sees.',
    screen: '+1 counted',
  },
}
const TOTAL_STEPS = 5

// Phases that move on by themselves, and after how long.
const AUTO: Partial<Record<Phase, [Phase, number]>> = {
  held: ['recognised', 1000],
  recognised: ['choose', 1100],
  correct: ['counted', 1700],
  wrong: ['choose', 1900],
}

export function HowItWorks() {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const [wrongBin, setWrongBin] = useState<Bin | null>(null)
  const [inside, setInside] = useState(false)

  // Scene tilt, -1..1 over the viewport.
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  // The hand holding the peel, in viewport px.
  const handX = useMotionValue(-300)
  const handY = useMotionValue(-300)
  const handScale = useMotionValue(1)
  const handOpacity = useMotionValue(1)

  const copy = COPY[phase === 'dropping' ? 'choose' : phase]
  const holding = phase === 'held' || phase === 'recognised' || phase === 'choose'
  const follows = phase !== 'idle' && phase !== 'dropping' && phase !== 'counted'
  const followsRef = useRef(follows)
  followsRef.current = follows
  const showHand = inside && (holding || phase === 'dropping')

  useEffect(() => {
    const next = AUTO[phase]
    if (!next) return
    const t = setTimeout(() => {
      if (phase === 'wrong') {
        // The peel comes back to the hand.
        handScale.set(1)
        handOpacity.set(1)
      }
      setPhase(next[0])
    }, next[1])
    return () => clearTimeout(t)
  }, [phase, handScale, handOpacity])

  const onPointerMove = (e: PointerEvent) => {
    pointerX.set((e.clientX / window.innerWidth - 0.5) * 2)
    pointerY.set((e.clientY / window.innerHeight - 0.5) * 2)
    if (followsRef.current) {
      handX.set(e.clientX)
      handY.set(e.clientY)
    }
  }

  const pickUp = (e: MouseEvent) => {
    handX.set(e.clientX)
    handY.set(e.clientY)
    handScale.set(1)
    handOpacity.set(1)
    setInside(true)
    setPhase('held')
  }

  const drop = (bin: Bin, target: HTMLElement) => {
    if (phase !== 'choose') return
    const finish = () => {
      setWrongBin(bin === ITEM_BIN ? null : bin)
      setPhase(bin === ITEM_BIN ? 'correct' : 'wrong')
    }
    if (reduce) {
      handOpacity.set(0)
      finish()
      return
    }
    setPhase('dropping')
    const r = target.getBoundingClientRect()
    const options = { duration: 0.45, ease: EASE_OUT }
    animate(handX, r.left + r.width / 2, options)
    animate(handY, r.top + r.height / 2, options)
    animate(handScale, 0.35, options)
    animate(handOpacity, 0, { duration: 0.2, delay: 0.3 }).then(finish)
  }

  const reset = () => {
    setWrongBin(null)
    setPhase('idle')
  }

  const holeState = (bin: Bin): HoleState => {
    if (phase === 'choose' || phase === 'dropping') return 'lit'
    if ((phase === 'correct' || phase === 'counted') && bin === ITEM_BIN) return 'chosen'
    if (phase === 'wrong') return bin === wrongBin ? 'wrong' : bin === ITEM_BIN ? 'lit' : 'off'
    return 'off'
  }
  const holes = Object.fromEntries(BINS.map((b) => [b, holeState(b)])) as Record<Bin, HoleState>
  const grid: GridState =
    phase === 'recognised' ? 'class' : phase === 'correct' || phase === 'counted' ? 'ok' : phase === 'wrong' ? 'bad' : 'off'
  const tone: Tone = phase === 'wrong' ? 'bad' : phase === 'correct' || phase === 'counted' ? 'ok' : 'neutral'

  return (
    <section
      id="how"
      className="relative flex min-h-[100svh] flex-col bg-forest-deep text-cream"
      style={{ cursor: showHand ? 'none' : undefined }}
      onPointerMove={onPointerMove}
      onPointerEnter={() => setInside(true)}
      onPointerLeave={() => setInside(false)}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-6 text-sm text-cream/70 sm:px-6">
        <span>How it works</span>
        <span className="flex items-center gap-5">
          <span className="tabular-nums">
            0{copy.step} / 0{TOTAL_STEPS}
          </span>
          <a href="#privacy" className="rounded-full border border-cream/25 px-3 py-1 text-cream/80 transition-colors hover:border-cream hover:text-cream">
            Skip demo
          </a>
        </span>
      </div>
      <div className="mx-auto mt-3 h-px w-full max-w-6xl bg-cream/15">
        <motion.div
          className="h-px origin-left bg-lime"
          animate={{ scaleX: copy.step / TOTAL_STEPS }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 py-8 sm:px-6 md:grid-cols-2">
        {/* The station: robot on the bin, in 3D. Click the peel, then a bin. */}
        <div className="relative h-[300px] w-full md:h-[480px]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.62] md:scale-100">
            <Station3D
              screen={copy.screen}
              tone={tone}
              buttonsLit={phase === 'choose' || phase === 'dropping'}
              grid={grid}
              speakerOn={phase === 'correct' || phase === 'wrong'}
              holes={holes}
              interactive={phase === 'choose'}
              showPeel={phase === 'idle'}
              onPickUp={pickUp}
              onDrop={drop}
              pointerX={pointerX}
              pointerY={pointerY}
            />
          </div>
        </div>

        {/* Step text: all phases share one grid cell and cross-fade */}
        <div className="grid">
          {(Object.keys(COPY) as Array<keyof typeof COPY>).map((key) => {
            const c = COPY[key]
            const active = key === (phase === 'dropping' ? 'choose' : phase)
            return (
              <div key={key} className="hiw-step col-start-1 row-start-1" data-active={active} aria-hidden={!active}>
                <h3 className="display text-4xl sm:text-6xl">{c.title}</h3>
                <p className="mt-4 max-w-md text-lg text-cream/75">{c.body}</p>
                {key === 'counted' && (
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={reset}
                      tabIndex={active ? 0 : -1}
                      className="h-12 rounded-full border border-cream/30 px-6 text-base font-medium text-cream transition-colors hover:border-cream"
                    >
                      Try again
                    </button>
                    <a
                      href="#privacy"
                      tabIndex={active ? 0 : -1}
                      className="inline-flex h-12 items-center rounded-full bg-lime px-6 text-base font-medium text-forest-deep transition-transform duration-150 ease-out-strong active:scale-[0.97]"
                    >
                      Continue
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {showHand && (
        <motion.div
          className="pointer-events-none fixed top-0 left-0 z-50"
          style={{ x: handX, y: handY, scale: handScale, opacity: handOpacity }}
        >
          <HandWithPeel className="size-20 -translate-x-1/2 -translate-y-[45%]" />
        </motion.div>
      )}
    </section>
  )
}
