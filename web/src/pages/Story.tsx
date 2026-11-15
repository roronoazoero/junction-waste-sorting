import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { HowItWorks } from '../components/story/HowItWorks'
import { CountUp, Reveal, useSmoothScroll } from '../components/ui/motion'
import { NatureBackdrop, Sprig } from '../components/ui/Nature'
import { accuracy, score } from '../data/metrics'
import { getEvents, IS_LIVE } from '../data/source'

const WHY = [
  {
    title: 'Environment',
    body: 'Correctly sorted bio-waste becomes biogas and soil, plastic gets recycled, and mixed waste shrinks.',
  },
  {
    title: 'Economy',
    body: 'Mixed waste is the most expensive waste type. Better sorting lowers the bill.',
  },
  {
    title: 'Behaviour',
    body: 'Immediate feedback improves sorting accuracy, and the effect lasts after the feedback stops.',
  },
]

function Hero() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()
  const lift = useTransform(scrollY, [0, 700], [0, reduce ? 0 : -90])

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col justify-between bg-forest text-lime">
      <NatureBackdrop className="opacity-70" />
      <header className="fade-in flex items-center justify-between gap-4 px-4 py-5 text-sm sm:px-6">
        <span className="text-lg tracking-tight">
          <span className="font-semibold">Binwise</span>
          <span className="text-sm sm:text-lg"> - A project for Arduino and Atech</span>
        </span>
        <nav className="flex shrink-0 gap-5">
          <a href="#how" className="hover:text-cream">
            How it works
          </a>
          <Link to="/dashboard" className="hover:text-cream">
            Dashboard
          </Link>
        </nav>
      </header>

      <div className="grid items-end gap-8 px-4 pb-8 sm:px-6 md:grid-cols-[1fr_auto]">
        <div className="fade-in max-w-xs" style={{ animationDelay: '500ms' }}>
          <p className="text-lg leading-snug">
            A sorting assistant that sits on the bin and tells you, right there, if you got it right.
          </p>
          <p className="mt-10 text-xs tracking-wide uppercase">Scroll down</p>
        </div>
        <motion.h1 className="display text-[clamp(4.5rem,19vw,17rem)] uppercase md:text-right" style={{ y: lift }}>
          <span className="word-mask">
            <span className="word-rise">Sort</span>
          </span>
          <br />
          <span className="word-mask">
            <span className="word-rise" style={{ animationDelay: '90ms' }}>
              Right
            </span>
          </span>
        </motion.h1>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="border-b border-ink/20 bg-cream">
      <div className="grid md:grid-cols-2">
        <div className="bg-mint px-4 py-16 text-forest sm:px-10 md:py-28">
          <Reveal>
            <h2 className="display text-5xl uppercase sm:text-7xl">
              The decision takes one second
            </h2>
          </Reveal>
        </div>
        <div className="flex items-center px-4 py-16 sm:px-10 md:border-l md:border-ink/20 md:py-28">
          <Reveal>
            <p className="max-w-md text-2xl leading-snug sm:text-3xl">
              In universities, schools and offices, waste lands in the wrong bin. People sort{' '}
              <span className="text-correct">less at work than at home</span>, the rules change by town, and a sign
              on the wall <span className="text-correct">doesn't fix it</span>.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="grid border-t border-ink/20 md:grid-cols-2">
        <div className="flex items-center px-4 py-12 sm:px-10">
          <Reveal className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <p className="display text-7xl text-forest sm:text-8xl">
              <CountUp value={70} suffix="%" />
            </p>
            <p className="max-w-xs pb-2 text-lg text-ink/75">
              of mixed waste in the Helsinki region could have been recycled.
            </p>
          </Reveal>
        </div>
        <div className="flex items-center border-t border-ink/20 px-4 py-12 sm:px-10 md:border-t-0 md:border-l">
          <Reveal delay={0.08} className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <p className="display max-w-[7em] text-4xl text-forest sm:text-5xl">Binwise makes the change</p>
            <p className="max-w-xs flex-1 basis-56 pb-2 text-lg text-ink/75">
              It catches the mistake at the bin, before the item is lost to mixed waste.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Privacy() {
  return (
    <section id="privacy" className="relative isolate overflow-hidden bg-mint px-4 py-24 text-forest sm:px-6 md:py-36">
      <Sprig className="pointer-events-none absolute -right-10 -bottom-24 -z-10 h-[120%] rotate-12 text-forest/10" leaves={9} />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="display max-w-5xl text-[clamp(3rem,9vw,8rem)] uppercase">
            We count. <br className="max-sm:hidden" />
            We don't photograph.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-8 border-t border-forest/25 pt-8 md:grid-cols-3">
          {[
            ['No images', 'The camera looks at the item, decides, and forgets. Nothing is saved.'],
            ['No cloud', 'The model runs on the Arduino UNO Q itself. It works without a connection.'],
            ['Your rules', 'Bins can be renamed to local rules: Biojäte, Muovipakkaukset, Sekajäte.'],
          ].map(([title, body], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <h3 className="text-2xl font-medium tracking-tight">{title}</h3>
              <p className="mt-2 max-w-xs text-lg text-forest/80">{body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/** The real station, filmed. Plays muted while it is on screen; the controls turn the sound on. */
function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  useEffect(() => {
    const video = ref.current
    if (!video || reduce) return
    if (inView) video.play().catch(() => {})
    else video.pause()
  }, [inView, reduce])

  return (
    <section id="demo" className="bg-forest-deep px-4 py-24 text-cream sm:px-6 md:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[2fr_3fr]">
        <Reveal>
          <p className="text-sm text-cream/70">The real thing</p>
          <h2 className="display mt-4 text-5xl sm:text-6xl">
            Come to table <span className="text-lime">B23</span>
          </h2>
          <p className="mt-5 max-w-md text-lg text-cream/75">
            This is a physical project, so come to table B23 to check out our demo!
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <video
            ref={ref}
            className="aspect-video w-full rounded-2xl bg-black object-cover shadow-2xl shadow-black/40"
            src="/demo.mp4"
            poster="/demo-poster.jpg"
            controls
            muted
            loop
            playsInline
            preload="metadata"
          />
        </Reveal>
      </div>
    </section>
  )
}

function Why() {
  return (
    <section className="bg-cream px-4 py-24 sm:px-6 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="display max-w-3xl text-5xl sm:text-7xl">Why it matters</h2>
        </Reveal>
        <div className="mt-12 grid border-t border-l border-ink/20 sm:grid-cols-3">
          {WHY.map((w, i) => (
            <div key={w.title} className="border-r border-b border-ink/20 p-6">
              <Reveal delay={i * 0.06}>
                <p className="text-sm text-ink/50 tabular-nums">0{i + 1}</p>
                <h3 className="mt-10 text-2xl font-medium tracking-tight text-forest">{w.title}</h3>
                <p className="mt-2 text-ink/75">{w.body}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cta() {
  // Pull one real number from the same data the dashboard uses.
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => {
    let live = true
    getEvents()
      .then((events) => {
        const value = accuracy(score(events))
        if (live && value !== null) setRate(Math.round(value * 100))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return (
    <section className="relative isolate overflow-hidden bg-lime px-4 py-24 text-forest-deep sm:px-6 md:py-36">
      <Sprig className="pointer-events-none absolute -top-32 right-[6%] -z-10 h-[130%] rotate-[170deg] text-forest/15" />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="display text-[clamp(3.5rem,12vw,10rem)] uppercase">See what the bins say</h2>
          <p className="mt-6 max-w-lg text-xl">
            {rate !== null && (
              <>
                {IS_LIVE ? 'So far' : 'In the demo data'}, <strong className="font-semibold">{rate}%</strong> of items are sorted correctly.{' '}
              </>
            )}
            See which building, floor and room does best, and which waste type goes wrong most.
          </p>
          <Link
            to="/dashboard"
            className="mt-10 inline-flex h-14 items-center rounded-full bg-forest-deep px-8 text-lg font-medium text-lime transition-transform duration-150 ease-out-strong active:scale-[0.97]"
          >
            Open the dashboard
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

export default function Story() {
  useSmoothScroll()
  return (
    <main>
      <Hero />
      <Problem />
      <HowItWorks />
      <DemoVideo />
      <Privacy />
      <Why />
      <Cta />
      <footer className="bg-forest-deep px-4 py-8 text-sm text-cream/60 sm:px-6">
        Binwise · Junction 2026 · Runs on the Arduino UNO Q ·{' '}
        <a href="https://atech.dev" target="_blank" rel="noreferrer" className="underline-offset-4 hover:text-cream hover:underline">
          atech.dev
        </a>
      </footer>
    </main>
  )
}
