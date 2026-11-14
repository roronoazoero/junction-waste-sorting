import { useMotionValue } from 'motion/react'
import { createRoot } from 'react-dom/client'
import { BananaPeel, HandWithPeel } from './components/story/Peel'
import { Face, Station3D } from './components/story/Station3D'
import type { Zoom } from './components/story/Station3D'
import './index.css'

const q = new URLSearchParams(location.search)
const zoom = (q.get('zoom') ?? 'none') as Zoom
const mobile = q.get('mobile') === '1'
const spin = Number(q.get('spin') ?? 0)
const tilt = Number(q.get('tilt') ?? 0)
const looking = q.get('looking') === '1'

function Preview() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useMotionValue(tilt)
  const sy = useMotionValue(spin)
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: 10 }}>
      <div className={mobile ? 'relative h-[300px] w-[360px] overflow-hidden' : 'relative h-[500px] w-[540px] overflow-hidden'} style={{ outline: '1px dashed #fff5' }}>
        <div className={mobile ? 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[0.62]' : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'}>
          <Station3D
            screen={looking ? <><Face mood="idle" />Scanning…</> : <><Face mood="happy" />Correct!</>}
            tone={looking ? 'neutral' : 'ok'}
            grid={looking ? 'off' : 'ok'}
            speakerOn={!looking}
            zoom={zoom}
            looking={looking}
            onCameraHover={looking ? () => {} : undefined}
            holes={{ bio: looking ? 'off' : 'chosen', plastic: 'off', mixed: 'off' }}
            pointerX={x}
            pointerY={y}
            spinX={sx}
            spinY={sy}
          />
        </div>
      </div>
      <HandWithPeel className="size-16" />
      <HandWithPeel className="size-40" />
      <BananaPeel className="size-40" />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
