import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import './station3d.css'

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

function Robot({ step, screen }: { step: number; screen: string }) {
  const bodyW = 120
  const bodyH = 84
  const footH = 7
  const legH = 16
  const footY = BIN_TOP - footH / 2
  const legY = BIN_TOP - footH - legH / 2
  const bodyBottom = BIN_TOP - footH - legH
  const bodyY = bodyBottom - bodyH / 2
  const bodyTop = bodyBottom - bodyH
  const armX = bodyW / 2 + 7

  const panel = (
    <div className="s3-panel">
      <div className="s3-buttons">
        {[0, 1, 2].map((i) => (
          <span key={i} data-lit={step === 2} />
        ))}
      </div>
      <div className="s3-speaker" data-on={step === 3} />
      <div className="s3-sensor" />
      <div className="s3-grid" data-state={step === 1 ? 'class' : step === 3 ? 'ok' : 'off'} />
      <div className="s3-screen">{screen}</div>
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
      <Box w={bodyW} h={bodyH} d={60} y={bodyY} z={ROBOT_Z} color={ORANGE} front={panel} />
      {[-armX, armX].map((x) => (
        <div key={`arm${x}`}>
          <Box w={14} h={70} d={16} x={x} y={bodyBottom - 56} z={ROBOT_Z} color={ORANGE} />
          <Box w={5} h={14} d={16} x={x - 4.5} y={bodyBottom - 98} z={ROBOT_Z} color={ORANGE} />
          <Box w={5} h={14} d={16} x={x + 4.5} y={bodyBottom - 98} z={ROBOT_Z} color={ORANGE} />
        </div>
      ))}
      <Box w={26} h={12} d={24} y={bodyTop - 6} z={ROBOT_Z} color={DARK} />
      <Camera x={0} y={bodyTop - 12 - 20} z={ROBOT_Z} />
    </>
  )
}

export function Station3D({
  step,
  screen,
  pointerX,
  pointerY,
}: {
  step: number
  screen: string
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

  const holeState = (bin: 'bio' | 'plastic' | 'mixed') => {
    if (step === 2) return 'lit'
    if (step >= 3 && bin === 'plastic') return 'chosen'
    return 'off'
  }

  const dropped = step >= 3
  const bodyTop = BIN_TOP - 7 - 16 - 84
  const itemTransform = dropped
    ? 'translate3d(0px, -38px, 25px) rotateZ(62deg) scale(0.7)'
    : `translate3d(62px, ${bodyTop - 30}px, 40px) rotateZ(-12deg)`

  return (
    <div className="s3-scene" aria-hidden="true">
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
              <span className="s3-hole" data-state={holeState('bio')} />
              <span className="s3-hole s3-slot" data-state={holeState('plastic')} />
              <span className="s3-hole" data-state={holeState('mixed')} />
            </div>
          }
        />

        <Robot step={step} screen={screen} />

        {/* A plastic bottle, held up and then dropped */}
        <div className="s3-item" data-gone={dropped} data-settled={step >= 4} style={{ transform: itemTransform }}>
          <div className={dropped ? 's3-group' : 's3-bob'}>
            <Box w={18} h={34} d={18} color="#5fb8e8" />
            <Box w={10} h={6} d={10} y={-20} color="#1f6f9a" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
