import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import './station3d.css'

export type Bin = 'bio' | 'plastic' | 'mixed'
/** guide: the robot points at this bin. chosen: a correct drop. wrong: a wrong drop. */
export type HoleState = 'off' | 'guide' | 'chosen' | 'wrong'
export type GridState = 'off' | 'class' | 'ok' | 'bad'
export type Tone = 'neutral' | 'ok' | 'bad'
export type Zoom = 'none' | 'bins' | 'panel'
export type Mood = 'happy' | 'sad' | 'idle'

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

/** A solid box: six faces around (x, y, z). Seen from behind it is just the plain colour. */
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

/** The round webcam with its ring light, facing forward (+z). A stack of discs reads as a
 *  cylinder from every side; only the front one is the lens, the back is plain black. */
function Camera({ x, y, z, r = 20, depth = 30 }: { x: number; y: number; z: number; r?: number; depth?: number }) {
  const layers = depth
  return (
    <div className="s3-group s3-bob">
      {/* Turned a little towards the viewer so the ring light reads as a camera. */}
      <div className="s3-group" style={{ transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(22deg)` }}>
        <div className="s3-group s3-head">
          {Array.from({ length: layers + 1 }, (_, i) => (
            <div
              key={i}
              className={`s3-disc ${i === layers ? 's3-lens' : ''}`}
              style={{ width: r * 2, height: r * 2, transform: `translate3d(${-r}px, ${-r}px, ${-depth / 2 + i}px)` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** The face the robot shows on its screen. It blinks; happy comes with cheeks.
 *  `big` is for a screen that shows the face and nothing else. */
export function Face({ mood, big = false }: { mood: Mood; big?: boolean }) {
  const mouth = mood === 'happy' ? 'M5 12 Q10 17 15 12' : mood === 'sad' ? 'M5 15 Q10 10.5 15 15' : 'M7 12.5 Q10 15 13 12.5'
  return (
    <svg viewBox="0 0 20 20" className={`s3-face-icon ${big ? 's3-face-big' : ''}`} aria-hidden="true">
      <g className="s3-eyes" fill="currentColor">
        <circle cx="6.5" cy="7" r="1.6" />
        <circle cx="13.5" cy="7" r="1.6" />
      </g>
      {mood === 'happy' && (
        <g fill="#ff8aa0" opacity="0.8">
          <circle cx="3.6" cy="10.6" r="1.3" />
          <circle cx="16.4" cy="10.6" r="1.3" />
        </g>
      )}
      <path d={mouth} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
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
const CAMERA_Y = BODY_TOP - 12 - 20
/** Where the item has to be held to be seen: a wide circle in front of the camera. */
const HOTSPOT = 240

function Robot({
  screen,
  tone,
  grid,
  speakerOn,
}: {
  screen: ReactNode
  tone: Tone
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
    <div className="s3-panel" data-tone={tone}>
      <div className="s3-buttons">
        {[0, 1, 2].map((i) => (
          <span key={i} />
        ))}
      </div>
      <div className="s3-speaker" data-on={speakerOn}>
        {speakerOn && (
          <>
            <span className="s3-note">♪</span>
            <span className="s3-note">♫</span>
            <span className="s3-note">♪</span>
          </>
        )}
      </div>
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
      {/* Arms pivot at the shoulder, so they can wave when the drop was right. */}
      {[-1, 1].map((side) => (
        <div
          key={`arm${side}`}
          className="s3-arm"
          data-wave={tone === 'ok'}
          style={
            {
              '--px': `${side * armX}px`,
              '--py': `${bodyBottom - 21}px`,
              '--pz': `${ROBOT_Z}px`,
              '--dir': side,
            } as CSSProperties
          }
        >
          <Box w={14} h={70} d={16} y={-35} color={ORANGE} />
          <Box w={5} h={14} d={16} x={-4.5} y={-77} color={ORANGE} />
          <Box w={5} h={14} d={16} x={4.5} y={-77} color={ORANGE} />
        </div>
      ))}
      <Box w={26} h={12} d={24} y={BODY_TOP - 6} z={ROBOT_Z} color={DARK} />
      <Camera x={0} y={CAMERA_Y} z={ROBOT_Z} />
    </>
  )
}

const BIN_LABEL: Record<Bin, string> = { bio: 'Bio', plastic: 'Plastic', mixed: 'Mixed' }

// Where the "camera" moves for each zoom: scale and the point that stays put.
// The origins sit high enough that the camera head stays inside the clipped column.
const ZOOM: Record<Zoom, { scale: number; origin: string }> = {
  none: { scale: 1, origin: '50% 50%' },
  bins: { scale: 1.5, origin: '46% 32%' },
  panel: { scale: 2.2, origin: '52% 17%' },
}

export function Station3D({
  screen,
  tone = 'neutral',
  grid = 'off',
  speakerOn = false,
  holes,
  interactive = false,
  zoom = 'none',
  userZoom = 1,
  looking = false,
  onDrop,
  onCameraHover,
  pointerX,
  pointerY,
  spinX,
  spinY,
}: {
  screen: ReactNode
  tone?: Tone
  grid?: GridState
  speakerOn?: boolean
  holes: Record<Bin, HoleState>
  /** When true the bin openings can be clicked. */
  interactive?: boolean
  zoom?: Zoom
  /** The visitor's own zoom, on top of the stage zoom. */
  userZoom?: number
  /** The camera is busy recognising: the frame scans and the ring light brightens. */
  looking?: boolean
  onDrop?: (bin: Bin, target: HTMLElement) => void
  /** The pointer (holding the item) moved in front of the camera. */
  onCameraHover?: () => void
  /** Pointer position over the section, each in -1..1. */
  pointerX: MotionValue<number>
  pointerY: MotionValue<number>
  /** Extra rotation from the visitor dragging the station around, in degrees. */
  spinX?: MotionValue<number>
  spinY?: MotionValue<number>
}) {
  const reduce = useReducedMotion()
  const sx = useSpring(pointerX, { stiffness: 50, damping: 16 })
  const sy = useSpring(pointerY, { stiffness: 50, damping: 16 })
  const zero = useSpring(0)
  // Negative rotateX tilts the scene so the lid faces the viewer.
  const rotateX = useTransform([sy, spinX ?? zero], ([v, s]: number[]) => -16 - (reduce ? 0 : v * 4) + s)
  const rotateY = useTransform([sx, spinY ?? zero], ([v, s]: number[]) => -26 + (reduce ? 0 : v * 9) + s)

  const hole = (bin: Bin, extra = '') => (
    <button
      type="button"
      className={`s3-hole ${extra}`}
      data-bin={bin}
      data-state={holes[bin]}
      disabled={!interactive}
      aria-label={`${BIN_LABEL[bin]} bin`}
      onClick={(e) => onDrop?.(bin, e.currentTarget)}
    />
  )

  return (
    <div
      className="s3-scene"
      data-looking={looking}
      style={{ transform: `scale(${ZOOM[zoom].scale * userZoom})`, transformOrigin: ZOOM[zoom].origin }}
    >
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

        <Robot screen={screen} tone={tone} grid={grid} speakerOn={speakerOn} />

        {/* The detection area in front of the camera: hold the item inside the frame. */}
        {onCameraHover && (
          <div
            className="s3-hotspot"
            style={{ transform: `translate3d(${-HOTSPOT / 2}px, ${CAMERA_Y - HOTSPOT / 2}px, 0px)` }}
            onPointerEnter={onCameraHover}
            onPointerMove={onCameraHover}
          >
            <div className="s3-finder">
              <span className="s3-finder-label">{looking ? 'Scanning…' : 'Hold the peel here'}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
