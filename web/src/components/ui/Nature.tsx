// Minimal plant artwork, drawn in code so the site needs no image files.

const P0 = [110, 420]
const P1 = [40, 220]
const P2 = [150, 10]
const LEAF = 'M0 0 C 18 -22 52 -22 70 0 C 52 22 18 22 0 0Z'

/** A single curved stem with leaves on alternating sides. Colour comes from `currentColor`. */
export function Sprig({ className = '', leaves = 7 }: { className?: string; leaves?: number }) {
  const items = Array.from({ length: leaves }, (_, i) => {
    const t = (i + 1) / (leaves + 1)
    const u = 1 - t
    const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0]
    const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]
    const dx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0])
    const dy = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1])
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + (i % 2 ? 52 : -52)
    return { x, y, angle, scale: 1.25 - t * 0.6 }
  })
  return (
    <svg viewBox="0 0 240 430" className={className} fill="currentColor" overflow="visible" aria-hidden="true">
      <path
        d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {items.map((l, i) => (
        <path key={i} d={LEAF} transform={`translate(${l.x} ${l.y}) rotate(${l.angle}) scale(${l.scale})`} />
      ))}
    </svg>
  )
}

/**
 * Soft out-of-focus greenery: blurred colour washes with a few leaves at different depths.
 * Put it inside a `relative isolate` parent; it fills it and sits behind the content.
 */
export function NatureBackdrop({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="nature-wash absolute inset-0" />
      <Sprig className="absolute -top-[45%] right-[12%] h-[125%] rotate-[165deg] text-[#cfe6bd]/30 blur-lg" />
      <Sprig className="absolute -bottom-[30%] -left-[4%] h-[125%] -rotate-6 text-[#082617]/60 blur-[3px]" leaves={8} />
      <Sprig className="absolute -right-[3%] -bottom-[38%] h-[115%] rotate-[14deg] text-[#2c7a45]/70" leaves={9} />
    </div>
  )
}
