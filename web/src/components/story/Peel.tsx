// The demo item (a banana peel) and the hand that carries it, drawn in code.

export function BananaPeel({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="#f2c94c" stroke="#9a6b12" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M32 31 C 22 27, 10 31, 5 46 C 14 41, 25 38, 32 31Z" />
        <path d="M32 31 C 42 27, 54 31, 59 46 C 50 41, 39 38, 32 31Z" />
        <path d="M32 31 C 30 19, 37 9, 48 4 C 44 15, 41 23, 32 31Z" />
        <path d="M32 31 C 26 20, 17 12, 9 6 C 18 10, 27 19, 32 31Z" />
      </g>
      <ellipse cx="32" cy="33" rx="7.5" ry="5" fill="#fff4c9" stroke="#9a6b12" strokeWidth="1.6" />
      <g fill="#7a4a10" opacity="0.7">
        <circle cx="14" cy="40" r="1.4" />
        <circle cx="50" cy="39" r="1.2" />
        <circle cx="42" cy="14" r="1.3" />
        <circle cx="16" cy="12" r="1.1" />
      </g>
    </svg>
  )
}

/** An open hand, seen from above, with the peel resting in the palm. Follows the pointer. */
export function HandWithPeel({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 80 96" className="absolute inset-0 size-full drop-shadow-[0_10px_14px_rgba(0,0,0,0.45)]">
        <path
          d="M16 54 V 30 a5 5 0 0 1 10 0 v 16 V 20 a5 5 0 0 1 10 0 v 24 V 16 a5 5 0 0 1 10 0 v 28 V 24 a5 5 0 0 1 10 0 v 34 c 0 18 -8 30 -22 30 c -12 0 -18 -8 -22 -16 L 4 56 a4.5 4.5 0 0 1 7 -5 Z"
          fill="#f5f1e8"
          stroke="#10231a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <BananaPeel className="absolute top-[40%] left-[22%] w-[62%]" />
    </div>
  )
}
