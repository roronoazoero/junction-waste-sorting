import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { EASE_OUT, scrollPageTo } from '../ui/motion'
import { HandWithPeel } from './Peel'
import { Face, Station3D } from './Station3D'
import type { Bin, GridState, HoleState, Tone, Zoom } from './Station3D'

// The visitor is holding a banana peel. It belongs in the bio bin.
const ITEM_BIN: Bin = 'bio'
const BINS: Bin[] = ['bio', 'plastic', 'mixed']
const BIN_NAME: Record<Bin, string> = { bio: 'bio', plastic: 'plastic', mixed: 'mixed waste' }

// Five stages, revealed by scrolling. Stage 2 waits for a click; scrolling past it lets the robot sort.
const STAGES = 5
const FEEDBACK_MS = 1800
// Nobody scrolled for this long while the demo is on screen: it moves on one stage by itself.
const IDLE_MS = 9000
// The visitor's own zoom steps, on top of the stage zoom, and how far they may tilt the station.
const ZOOM_STEPS = [0.7, 0.85, 1, 1.2, 1.45, 1.75]
const TILT_MIN = -30
const TILT_MAX = 22

type Copy = { title: string; body: ReactNode }

function copyFor(stage: number, correct: boolean | null, bin: Bin | null): Copy {
  switch (stage) {
    case 0:
      return {
        title: 'In your hand: a banana peel',
        body: (
          <>
            The hand follows your pointer. Hold the peel inside the frame in front of the camera in the robot’s head.
            <span className="mt-3 block text-base text-cream/50">Or just scroll on.</span>
          </>
        ),
      }
    case 1:
      return {
        title: 'Recognised on the device',
        body: 'The classifier on the Arduino UNO Q decides: bio-waste. The screen says it and a light comes on around the bio bin. Nothing leaves the board. Now drop it in a bin.',
      }
    case 2:
      return {
        title: 'Your turn: drop it in',
        body: (
          <>
            Click the opening you would use. Follow the light, or don’t.
            <span className="mt-3 block text-base text-cream/50">Or keep scrolling and the robot sorts it for you.</span>
          </>
        ),
      }
    case 3:
      return correct
        ? {
            title: 'Feedback, right away',
            body: 'The distance sensor in the bio bin sees the drop. You get instant feedback: a happy face on the screen and a happy sound from the speaker.',
          }
        : {
            title: 'That was the wrong bin',
            body: `The distance sensor in the ${BIN_NAME[bin ?? 'plastic']} bin sees the drop. You get instant feedback: a sad face on the screen, a sad sound from the speaker, and the screen shows where the peel should have gone.`,
          }
    default:
      return {
        title: 'Counted, never photographed',
        body: correct ? (
          <>
            Logged: <strong className="font-medium text-cream">bio-waste, bio bin, correct</strong>. Numbers only, where and when. That is all the dashboard ever sees. Pictures are never taken, never saved.
          </>
        ) : (
          <>
            Logged: <strong className="font-medium text-cream">bio-waste, {BIN_NAME[bin ?? 'plastic']} bin, wrong</strong>. Numbers only, where and when. That is all the dashboard ever sees. Pictures are never taken, never saved.
            <span className="mt-3 block text-base text-cream/50">Scroll back up to try again.</span>
          </>
        ),
      }
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function HowItWorks() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const [scrollStage, setScrollStage] = useState(0)
  const [pinned, setPinned] = useState(false)

  // Recognition: the peel was held in front of the camera (or the visitor scrolled past that point).
  const [looking, setLooking] = useState(false)
  const [seen, setSeen] = useState(false)
  // The throw: which bin the peel went into, once it has.
  const [dropped, setDropped] = useState<Bin | null>(null)
  const [dropping, setDropping] = useState(false)
  const [feedbackSeen, setFeedbackSeen] = useState(false)
  const correct = dropped ? dropped === ITEM_BIN : null

  // What the visitor did sets the floor; scrolling sets the ceiling. Feedback needs a drop,
  // the count needs the feedback to have been seen.
  const floor = dropped ? 3 : seen ? 1 : 0
  const ceiling = !dropped ? 2 : feedbackSeen ? STAGES - 1 : 3
  const stage = Math.max(floor, Math.min(scrollStage, ceiling))

  // Scene tilt, -1..1 over the viewport.
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  // The visitor's own view of the station: dragged rotation and zoom steps.
  const spinX = useMotionValue(0)
  const spinY = useMotionValue(0)
  // The zoom step belongs to the stage it was chosen in; a new stage starts at 1x again.
  const [zoomBy, setZoomBy] = useState({ stage: 0, step: 2 })
  const zoomStep = zoomBy.stage === stage ? zoomBy.step : 2
  const setZoomStep = (step: number) => setZoomBy({ stage, step })
  const [spun, setSpun] = useState(false)
  const draggedRef = useRef(false)
  // The hand holding the peel, in viewport px.
  const handX = useMotionValue(0)
  const handY = useMotionValue(0)
  const handScale = useMotionValue(1)
  const handOpacity = useMotionValue(1)
  const droppingRef = useRef(false)
  useEffect(() => {
    droppingRef.current = dropping
  }, [dropping])

  useEffect(() => {
    // Before the pointer has moved (touch screens), the hand waits near the robot.
    handX.set(window.innerWidth * 0.3)
    handY.set(window.innerHeight * 0.42)
  }, [handX, handY])

  useEffect(() => {
    if (!dropped) return
    const t = setTimeout(() => setFeedbackSeen(true), FEEDBACK_MS)
    return () => clearTimeout(t)
  }, [dropped])

  // Each stage brings its own camera move, so the visitor's spin eases back to neutral.
  useEffect(() => {
    const options = { duration: reduce ? 0 : 0.8, ease: EASE_OUT }
    animate(spinX, 0, options)
    animate(spinY, 0, options)
  }, [stage, reduce, spinX, spinY])

  // The idle timer: restarted by every scroll and every stage change, fires once at most.
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const live = useRef({ pinned: false, stage: 0 })
  const armIdle = useCallback(() => {
    if (idle.current) clearTimeout(idle.current)
    idle.current = setTimeout(() => {
      const el = ref.current
      const { pinned, stage } = live.current
      if (!el || !pinned || stage >= STAGES - 1) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const range = el.offsetHeight - window.innerHeight
      // Land a little inside the next stage, so rounding never leaves us on the boundary.
      scrollPageTo(top + ((stage + 1) / STAGES + 0.04) * range)
    }, IDLE_MS)
  }, [])
  useEffect(() => {
    live.current = { pinned, stage }
    armIdle()
  }, [pinned, stage, armIdle])
  useEffect(() => () => {
    if (idle.current) clearTimeout(idle.current)
  }, [])

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(STAGES - 1, Math.max(0, Math.floor(p * STAGES)))
    setScrollStage(next)
    setPinned(p > 0 && p < 1)
    armIdle()
    // Scrolled past the camera stage: the robot has seen the peel either way.
    if (next >= 1) setSeen(true)
    // Scrolling back to the very start resets the whole throw.
    if (p <= 0.02) {
      setSeen(false)
      setLooking(false)
      setDropped(null)
      setDropping(false)
      setFeedbackSeen(false)
      handScale.set(1)
      handOpacity.set(1)
    }
  })

  // The peel is in front of the camera: a short scan, then it is recognised.
  const lookTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onCameraHover = useCallback(() => {
    if (seen || looking) return
    setLooking(true)
    lookTimer.current = setTimeout(() => {
      setSeen(true)
      setLooking(false)
    }, 1100)
  }, [seen, looking])
  useEffect(() => () => {
    if (lookTimer.current) clearTimeout(lookTimer.current)
  }, [])

  // The throw: the hand lifts a little, arcs over to the opening, shrinks into it and lets go.
  const drop = useCallback(
    (bin: Bin, target: HTMLElement) => {
      if (droppingRef.current) return
      const finish = () => {
        setDropping(false)
        setDropped(bin)
      }
      if (reduce) {
        handOpacity.set(0)
        finish()
        return
      }
      setDropping(true)
      const r = target.getBoundingClientRect()
      const tx = r.left + r.width / 2
      const ty = r.top + r.height / 2
      const fromY = handY.get()
      const duration = 0.85
      animate(handX, tx, { duration, ease: [0.4, 0, 0.2, 1] })
      animate(handY, [fromY, Math.min(fromY, ty) - 70, ty], { duration, ease: ['easeOut', 'easeIn'], times: [0, 0.42, 1] })
      animate(handScale, [handScale.get(), 1.08, 0.3], { duration, ease: ['easeOut', 'easeIn'], times: [0, 0.42, 1] })
      animate(handOpacity, 0, { duration: 0.22, delay: duration - 0.24 }).then(finish)
    },
    [reduce, handX, handY, handScale, handOpacity],
  )

  // A click on an opening counts only when the pointer was not dragging the station around.
  const onDrop = useCallback(
    (bin: Bin, target: HTMLElement) => {
      if (draggedRef.current) return
      drop(bin, target)
    },
    [drop],
  )

  // Scrolled past the sorting stage without clicking: the robot does it.
  useEffect(() => {
    if (scrollStage < 3 || dropped || dropping) return
    const el = ref.current?.querySelector<HTMLElement>(`[data-bin="${ITEM_BIN}"]`)
    if (el) drop(ITEM_BIN, el)
  }, [scrollStage, dropped, dropping, drop])

  const onPointerMove = (e: PointerEvent) => {
    pointerX.set((e.clientX / window.innerWidth - 0.5) * 2)
    pointerY.set((e.clientY / window.innerHeight - 0.5) * 2)
    if (!droppingRef.current) {
      handX.set(e.clientX)
      handY.set(e.clientY)
    }
  }

  // Dragging across the station spins it. Listeners live on the window so the drag survives
  // leaving the column; the openings stay clickable because nothing captures the pointer.
  const onSceneDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const start = { x: e.clientX, y: e.clientY, sx: spinX.get(), sy: spinY.get() }
    let moved = false
    const move = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - start.x
      const dy = ev.clientY - start.y
      if (!moved && Math.hypot(dx, dy) < 4) return
      if (!moved) {
        moved = true
        draggedRef.current = true
        setSpun(true)
      }
      spinY.set(start.sy + dx * 0.35)
      spinX.set(clamp(start.sx - dy * 0.25, TILT_MIN, TILT_MAX))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      // The click that follows this pointerup still sees the drag; the next one does not.
      setTimeout(() => {
        draggedRef.current = false
      }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const resetView = () => {
    const options = { duration: reduce ? 0 : 0.6, ease: EASE_OUT }
    animate(spinX, 0, options)
    animate(spinY, 0, options)
    setZoomStep(2)
  }

  const showHand = pinned && stage < 3 && !dropped
  const zoom: Zoom = stage === 1 || stage === 2 ? 'bins' : stage === 3 ? 'panel' : 'none'

  const holeState = (bin: Bin): HoleState => {
    if (stage === 1 || stage === 2) return bin === ITEM_BIN ? 'guide' : 'off'
    if (stage >= 3 && dropped) {
      if (correct) return bin === ITEM_BIN ? 'chosen' : 'off'
      return bin === dropped ? 'wrong' : bin === ITEM_BIN ? 'guide' : 'off'
    }
    return 'off'
  }
  const holes = Object.fromEntries(BINS.map((b) => [b, holeState(b)])) as Record<Bin, HoleState>
  const grid: GridState = stage === 1 || stage === 2 ? 'class' : stage >= 3 ? (correct ? 'ok' : 'bad') : 'off'
  const tone: Tone = stage >= 3 && dropped ? (correct ? 'ok' : 'bad') : 'neutral'
  const screen: ReactNode =
    stage === 0 ? (
      <>
        <Face mood="idle" />
        {looking ? 'Scanning…' : 'Show me'}
      </>
    ) : stage <= 2 ? (
      <>
        <Face mood="idle" />
        Bio bin
      </>
    ) : stage === 3 ? (
      <>
        <Face mood={correct ? 'happy' : 'sad'} />
        {correct ? 'Correct!' : 'Wrong bin'}
      </>
    ) : correct ? (
      '+1 correct'
    ) : (
      '+1 wrong'
    )

  const copy = copyFor(stage, correct, dropped)
  const copyKey = stage < 3 ? `${stage}` : `${stage}-${correct ? 'ok' : 'bad'}`

  const viewButton =
    'flex h-8 min-w-8 items-center justify-center rounded-full border border-cream/25 px-2 text-cream/80 transition-colors hover:border-cream hover:text-cream disabled:opacity-30 disabled:hover:border-cream/25'

  return (
    <section
      id="how"
      ref={ref}
      className="relative h-[520vh] bg-forest-deep text-cream"
      style={{ cursor: showHand ? 'none' : undefined }}
      onPointerMove={onPointerMove}
    >
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 pt-6 text-sm text-cream/70 sm:px-6">
          <span>How it works</span>
          <span className="flex items-center gap-5">
            <span className="tabular-nums">
              0{stage + 1} / 0{STAGES}
            </span>
            <a
              href="#privacy"
              className="rounded-full border border-cream/25 px-3 py-1 text-cream/80 transition-colors hover:border-cream hover:text-cream"
            >
              Skip demo
            </a>
          </span>
        </div>
        <div className="mx-auto mt-3 h-px w-full max-w-6xl bg-cream/15">
          <motion.div
            className="h-px origin-left bg-lime"
            animate={{ scaleX: (stage + 1) / STAGES }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          />
        </div>

        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pb-8 sm:px-6 md:grid-cols-2">
          {/* The station in 3D. The column clips it, so zooming reads as a camera move.
              Drag to spin it round, zoom with the buttons. */}
          <div
            className="relative h-[300px] w-full overflow-hidden select-none md:h-[500px]"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onSceneDown}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.62] md:scale-100">
              <Station3D
                screen={screen}
                tone={tone}
                grid={grid}
                speakerOn={stage === 3}
                holes={holes}
                interactive={(stage === 1 || stage === 2) && !dropping}
                zoom={zoom}
                userZoom={ZOOM_STEPS[zoomStep]}
                looking={looking}
                onDrop={onDrop}
                onCameraHover={stage === 0 ? onCameraHover : undefined}
                pointerX={pointerX}
                pointerY={pointerY}
                spinX={spinX}
                spinY={spinY}
              />
            </div>
            <div className="absolute right-2 bottom-2 flex items-center gap-2 text-xs text-cream/60">
              {!spun && <span className="hidden sm:inline">Drag to spin the station</span>}
              <button
                type="button"
                className={viewButton}
                aria-label="Zoom out"
                disabled={zoomStep === 0}
                onClick={() => setZoomStep(Math.max(0, zoomStep - 1))}
              >
                −
              </button>
              <button
                type="button"
                className={viewButton}
                aria-label="Zoom in"
                disabled={zoomStep === ZOOM_STEPS.length - 1}
                onClick={() => setZoomStep(Math.min(ZOOM_STEPS.length - 1, zoomStep + 1))}
              >
                +
              </button>
              <button type="button" className={viewButton} onClick={resetView}>
                Reset view
              </button>
            </div>
          </div>

          {/* Stage text: one grid cell, cross-fading */}
          <div className="grid">
            <motion.div
              key={copyKey}
              className="col-start-1 row-start-1"
              initial={{ opacity: 0, y: reduce ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT }}
            >
              <h3 className="display text-4xl sm:text-6xl">{copy.title}</h3>
              <p className="mt-4 max-w-md text-lg text-cream/75">{copy.body}</p>
            </motion.div>
          </div>
        </div>
      </div>

      {showHand && (
        <motion.div
          className="pointer-events-none fixed top-0 left-0 z-50"
          style={{ x: handX, y: handY, scale: handScale, opacity: handOpacity }}
        >
          <HandWithPeel className="size-16 -translate-x-1/2 -translate-y-[45%]" />
        </motion.div>
      )}
    </section>
  )
}
