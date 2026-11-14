// Sends fake throws to the server, so the dashboard can be tested without the hardware.
//
//   node simulate.mjs            one throw every 2 seconds
//   node simulate.mjs 0.2 300    one every 0.2 s, stop after 300

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'))

const SERVER = process.env.SERVER_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
const seconds = Number(process.argv[2] ?? 2)
const limit = Number(process.argv[3] ?? Infinity)
const stations = JSON.parse(readFileSync(join(here, 'stations.json'), 'utf8'))

const BINS = ['bio', 'plastic', 'mixed']
const ERROR_RATE = { bio: 0.15, plastic: 0.3, mixed: 0.1 }
const pick = (list) => list[Math.floor(Math.random() * list.length)]

let sent = 0
async function throwOne() {
  const category = pick(BINS)
  const wrong = Math.random() < ERROR_RATE[category]
  // Wrong throws mostly end up in mixed waste.
  const landedBin = !wrong ? category : category !== 'mixed' && Math.random() < 0.8 ? 'mixed' : pick(BINS.filter((b) => b !== category))
  const event = {
    stationId: pick(stations).id,
    category,
    landedBin,
    confidence: Math.round((0.55 + Math.random() * 0.44) * 100) / 100,
  }
  const res = await fetch(`${SERVER}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Station-Key': process.env.STATION_KEY ?? '' },
    body: JSON.stringify(event),
  })
  console.log(res.status, JSON.stringify(event))
  if (++sent >= limit) process.exit(0)
}

console.log(`Sending a fake throw to ${SERVER} every ${seconds} s. Ctrl+C to stop.`)
await throwOne()
setInterval(() => throwOne().catch((err) => console.error(err.message)), seconds * 1000)
