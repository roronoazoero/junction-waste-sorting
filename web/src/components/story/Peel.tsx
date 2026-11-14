// The demo item (a banana peel) and the hand that carries it, drawn in code.

export function BananaPeel({ className = '' }: { className?: string }) {
  // The classic peel on the floor: one strip still standing with the stem, sweeping down
  // into a foot to the right; a short strip lying to the left; one falling toward the viewer.
  const skin = '#ffe135'
  const inside = '#fff6a8'
  const line = { stroke: '#3a2d00', strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <ellipse cx="58" cy="74" rx="30" ry="7" fill="#4a4a10" opacity="0.5" />
      {/* left strip, lying on the ground */}
      <path d="M38 58 C 28 50, 16 44, 6 46 C 8 55, 22 59, 36 66 Z" fill={skin} {...line} />
      <path d="M34 59 C 26 53, 17 49, 11 48 C 13 53, 24 57, 33 62 Z" fill={inside} />
      {/* the standing strip, sweeping down and out into the right foot */}
      <path
        d="M37 14 C 27 32, 25 52, 36 66 C 46 76, 66 76, 86 68 C 93 66, 95 60, 88 58 C 72 60, 60 60, 54 54 C 51 40, 50 26, 47 14 Z"
        fill={skin}
        {...line}
      />
      <path d="M40 18 C 33 34, 33 50, 40 62 C 44 58, 46 48, 44 18 Z" fill={inside} />
      <path d="M56 62 C 66 66, 76 65, 84 62 C 76 63, 66 63, 58 60 Z" fill={inside} />
      {/* front strip, falling toward the viewer */}
      <path d="M42 64 C 34 72, 20 80, 10 88 C 14 93, 28 91, 38 82 C 44 77, 48 72, 50 68 Z" fill={skin} {...line} />
      <path d="M44 68 C 36 76, 24 84, 16 88 C 24 88, 32 84, 38 78 C 42 74, 44 72, 46 70 Z" fill={inside} />
      {/* stem */}
      <path d="M39 14 C 38 10, 38 6, 40 3 L 45 3 C 46 6, 46 10, 46 14 Z" fill="#6b8a22" {...line} />
      <path d="M39 4 C 39 1.5, 40.5 0.5, 42.5 0.5 C 44.5 0.5, 46 1.5, 46 4 Z" fill="#3a2d00" {...line} />
      <g fill="#8a6a10" opacity="0.6">
        <circle cx="31" cy="40" r="1.3" />
        <circle cx="70" cy="70" r="1.1" />
      </g>
    </svg>
  )
}

/** An open hand, seen from above, with the peel resting in the palm. Follows the pointer. */
export function HandWithPeel({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 96" className="absolute inset-0 size-full drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]">
        <path
          d="M16 54 V 30 a5 5 0 0 1 10 0 v 16 V 20 a5 5 0 0 1 10 0 v 24 V 16 a5 5 0 0 1 10 0 v 28 V 24 a5 5 0 0 1 10 0 v 34 c 0 18 -8 30 -22 30 c -12 0 -18 -8 -22 -16 L 4 56 a4.5 4.5 0 0 1 7 -5 Z"
          fill="#f5f1e8"
          stroke="#10231a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <BananaPeel className="absolute top-[22%] -left-[12%] w-[124%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]" />
    </div>
  )
}
