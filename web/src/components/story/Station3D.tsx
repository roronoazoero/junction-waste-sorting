import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { BananaPeel } from './Peel'
import './station3d.css'

export type Bin = 'bio' | 'plastic' | 'mixed'
export type HoleState = 'off' | 'lit' | 'chosen' | 'wrong'
export type GridState = 'off' | 'class' | 'ok' | 'bad'
export type Tone = 'neutral' | 'ok' | 'bad'

// Colours of the physical build: the 3D-printed orange body and the white bin.
const ORANGE = '#e9a21f'
const DARK = '#202227'
const BIN = '#efece5'

type BoxProps = {
  w: number
  h: number
  d: number
  /** Centre of the box in world px. */
  x?: number
  y?: number
  z?: number
  color: string
  className?: string
  front?: ReactNode
  top?: ReactNode
}

/** A solid box: six faces around (x, y, z). */
function Box({ w, h, d, x = 0, y = 0, z = 0, color, className = '', front, top }: BoxProps) {
  const style = {
    '--w': `${w}px`,
    '--h': `${h}px`,
    '--d': `${d}px`,
    '--c': color,
    width: w,
    height: h,
    transform: `translate3d(${x - w / 2}px, ${y - h / 2}px, ${z}px)`,
  } as CSSProperties
  return (
    <div className={`s3-box ${className}`} style={style}>
      <div className="s3-face s3-front">{front}</div>
      <div className="s3-face s3-back" />
      <div className="s3-face s3-right" />
      <div className="s3-face s3-left" />
      <div className="s3-face s3-top">{top}</div>
      <div className="s3-face s3-bottom" />
    </div>
  )
}

/** The round webcam with its ring light, facing forward (+z). */
function Camera({ x, y, z, r = 20, depth = 30 }: { x: number; y: number; z: number; r?: number; depth?: number }) {
  const layers = depth / 2
  return (
    // Turned a little towards the viewer so the ring light reads as a camera.
    <div className="s3-group" style={{ transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(22deg)` }}>
      <div className="s3-group s3-head">
        {Array.from({ length: layers + 1 }, (_, i) => (
          <div
            key={i}
            className={`s3-disc ${i === layers ? 's3-lens' : ''}`}
            style={{ width: r * 2, height: r * 2, transform: `translate3d(${-r}px, ${-r}px, ${-depth / 2 + i * 2}px)` }}
          />
        ))}
      </div>
    </div>
  )
}

const BIN_W = 340
const BIN_H = 190
const BIN_D = 150
const BIN_Y = 40
const BIN_TOP = BIN_Y - BIN_H / 2
const ROBOT_Z = -45
const BODY_H = 84
const BODY_TOP = BIN_TOP - 7 - 16 - BODY_H

function Robot({
  screen,
  tone,
  buttonsLit,
  grid,
  speakerOn,
}: {
  screen: string
  tone: Tone
  buttonsLit: boolean
  grid: GridState
  speakerOn: boolean
}) {
  const bodyW = 120
  const footH = 7
  const legH = 16
  const footY = BIN_TOP - footH / 2
  const legY = BIN_TOP - footH - legH / 2
  const bodyBottom = BIN_TOP - footH - legH
  const bodyY = bodyBottom - BODY_H / 2
  const armX = bodyW / 2 + 7

  const panel = (
    <div className="s3-panel">
      <div className="s3-buttons">
        {[0, 1, 2].map((i) => (
          <span key={i} data-lit={buttonsLit} />
        ))}
      </div>
      <div className="s3-speaker" data-on={speakerOn} />
      <div className="s3-sensor" />
      <div className="s3-grid" data-state={grid} />
      <div className="s3-screen" data-tone={tone}>
        {screen}
      </div>
      <span className="s3-pin" />
    </div>
  )

  return (
    <>
      {[-28, 28].map((x) => (
        <Box key={`foot${x}`} w={30} h={footH} d={40} x={x} y={footY} z={ROBOT_Z + 3} color={ORANGE} />
      ))}
      {[-28, 28].map((x) => (
        <Box key={`leg${x}`} w={22} h={legH} d={26} x={x} y={legY} z={ROBOT_Z} color={ORANGE} />
      ))}
      <Box w={bodyW} h={BODY_H} d={60} y={bodyY} z={ROBOT_Z} color={ORANGE} front={panel} />
      {[-armX, armX].map((x) => (
        <div key={`arm${x}`}>
          <Box w={14} h={70} d={16} x={x} y={bodyBottom - 56} z={ROBOT_Z} color={ORANGE} />
          <Box w={5} h={14} d={16} x={x - 4.5} y={bodyBottom - 98} z={ROBOT_Z} color={ORANGE} />
          <Box w={5} h={14} d={16} x={x + 4.5} y={bodyBottom - 98} z={ROBOT_Z} color={ORANGE} />
        </div>
      ))}
      <Box w={26} h={12} d={24} y={BODY_TOP - 6} z={ROBOT_Z} color={DARK} />
      <Camera x={0} y={BODY_TOP - 12 - 20} z={ROBOT_Z} />
    </>
  )
}

const BIN_LABEL: Record<Bin, string> = { bio: 'Bio', plastic: 'Plastic', mixed: 'Mixed' }

export function Station3D({
  screen,
  tone = 'neutral',
  buttonsLit = false,
  grid = 'off',
  speakerOn = false,
  holes,
  interactive = false,
  showPeel = false,
  onPickUp,
  onDrop,
  pointerX,
  pointerY,
}: {
  screen: string
  tone?: Tone
  buttonsLit?: boolean
  grid?: GridState
  speakerOn?: boolean
  holes: Record<Bin, HoleState>
  /** When true the bin openings can be clicked. */
  interactive?: boolean
  /** Show the banana peel floating in front of the camera, waiting to be picked up. */
  showPeel?: boolean
  onPickUp?: (e: MouseEvent<HTMLButtonElement>) => void
  onDrop?: (bin: Bin, target: HTMLElement) => void
  /** Pointer position over the section, each in -1..1. */
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
}) {
  const reduce = useReducedMotion()
  const sx = useSpring(pointerX, { stiffness: 50, damping: 16 })
  const sy = useSpring(pointerY, { stiffness: 50, damping: 16 })
  // Negative rotateX tilts the scene so the lid faces the viewer.
  const rotateX = useTransform(sy, (v) => -16 - (reduce ? 0 : v * 4))
  const rotateY = useTransform(sx, (v) => -26 + (reduce ? 0 : v * 9))

  const hole = (bin: Bin, extra = '') => (
    <button
      type="button"
      className={`s3-hole ${extra}`}
      data-state={holes[bin]}
      disabled={!interactive}
      aria-label={`${BIN_LABEL[bin]} bin`}
      onClick={(e) => onDrop?.(bin, e.currentTarget)}
    />
  )

  return (
    <div className="s3-scene">
      <motion.div className="s3-world" style={{ rotateX, rotateY }}>
        <div
          className="s3-shadow"
          style={{ transform: `translate3d(-230px, ${BIN_Y + BIN_H / 2}px, ${-BIN_D / 2 - 30}px) rotateX(90deg)` }}
        />

        <Box
          className="s3-bin"
          w={BIN_W}
          h={BIN_H}
          d={BIN_D}
          y={BIN_Y}
          color={BIN}
          front={
            <div className="s3-labels">
              <span>Bio</span>
              <span>Plastic</span>
              <span>Mixed</span>
            </div>
          }
          top={
            <div className="s3-lid">
              {hole('bio')}
              {hole('plastic', 's3-slot')}
              {hole('mixed')}
            </div>
          }
        />

        <Robot screen={screen} tone={tone} buttonsLit={buttonsLit} grid={grid} speakerOn={speakerOn} />

        {showPeel && (
          <button
            type="button"
            className="s3-peel"
            // Billboarded: undoes the world's base tilt so the peel faces the viewer.
            style={{ transform: `translate3d(${92 - 32}px, ${BODY_TOP - 26 - 32}px, 40px) rotateY(26deg) rotateX(16deg)` }}
            aria-label="Pick up the banana peel"
            onClick={onPickUp}
          >
            <span className="s3-bob">
              <BananaPeel className="size-full" />
            </span>
          </button>
        )}
      </motion.div>
    </div>
  )
}
