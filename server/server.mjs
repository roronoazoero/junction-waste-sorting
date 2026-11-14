// Small data server for the sorting station.
// The UNO Q posts throws here, the website reads them. No dependencies: Node 22.13+ only.
//
//   node server.mjs
//
// POST /events      a throw:        { stationId, category, landedBin?, confidence?, ts? }
// POST /emptyings   a bin emptied:  { stationId, bin?, ts? }   (no bin = all three)
// GET  /events      all throws, oldest first (?since=<ms> for newer ones only)
// GET  /emptyings   all emptyings
// GET  /stations    stations.json, plus any station id seen in the data
// GET  /health

import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
if (existsSync(join(here, '.env'))) process.loadEnvFile(join(here, '.env'))

const PORT = Number(process.env.PORT ?? 3000)
const KEY = process.env.STATION_KEY ?? ''
const BINS = ['bio', 'plastic', 'mixed']

const db = new DatabaseSync(join(here, 'data.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    stationId TEXT NOT NULL,
    category TEXT NOT NULL,
    confidence REAL NOT NULL,
    chosenBin TEXT,
    landedBin TEXT,
    mode TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
  CREATE TABLE IF NOT EXISTS emptyings (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    stationId TEXT NOT NULL,
    bin TEXT NOT NULL
  );
`)
const insertEvent = db.prepare(
  'INSERT INTO events (ts, stationId, category, confidence, chosenBin, landedBin, mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
)
const insertEmptying = db.prepare('INSERT INTO emptyings (ts, stationId, bin) VALUES (?, ?, ?)')

const isBin = (v) => BINS.includes(v)
const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 64
const timeOf = (v) => (Number.isFinite(v) && v > 0 ? Math.round(v) : Date.now())

/** Returns a row to insert, or a string saying what is wrong. */
function parseEvent(o) {
  if (typeof o !== 'object' || o === null) return 'expected a JSON object'
  if (!isId(o.stationId)) return 'stationId is required'
  if (!isBin(o.category)) return `category must be one of ${BINS.join(', ')}`
  if (o.landedBin != null && !isBin(o.landedBin)) return `landedBin must be one of ${BINS.join(', ')}`
  if (o.chosenBin != null && !isBin(o.chosenBin)) return `chosenBin must be one of ${BINS.join(', ')}`
  if (o.landedBin == null && o.chosenBin == null) return 'landedBin (or chosenBin) is required'
  const confidence = o.confidence == null ? 1 : Number(o.confidence)
  if (!(confidence >= 0 && confidence <= 1)) return 'confidence must be between 0 and 1'
  const mode = o.mode === 'guide' ? 'guide' : 'challenge'
  return [timeOf(o.ts), o.stationId, o.category, confidence, o.chosenBin ?? null, o.landedBin ?? null, mode]
}

function loadStations() {
  let stations = []
  try {
    stations = JSON.parse(readFileSync(join(here, 'stations.json'), 'utf8'))
  } catch (err) {
    console.warn('Could not read stations.json:', err.message)
  }
  // A station that posts before it is listed still shows up, under "Unassigned".
  const known = new Set(stations.map((s) => s.id))
  for (const { stationId } of db.prepare('SELECT DISTINCT stationId FROM events').all()) {
    if (!known.has(stationId)) {
      stations.push({ id: stationId, site: 'Unassigned', floor: 'Unknown floor', room: stationId, kind: 'office', inputs: 'sensor' })
    }
  }
  return stations
}

const withoutNulls = (row) => Object.fromEntries(Object.entries(row).filter(([k, v]) => v !== null && k !== 'id'))

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) reject(new Error('body too large'))
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('body is not valid JSON'))
      }
    })
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Station-Key',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    })
    res.end(JSON.stringify(data))
  }
  const url = new URL(req.url, 'http://localhost')

  try {
    if (req.method === 'OPTIONS') return send(204, {})

    if (req.method === 'GET') {
      if (url.pathname === '/health') return send(200, { ok: true })
      if (url.pathname === '/stations') return send(200, loadStations())
      if (url.pathname === '/events') {
        const since = Number(url.searchParams.get('since') ?? 0) || 0
        const rows = db.prepare('SELECT * FROM events WHERE ts > ? ORDER BY ts').all(since)
        return send(200, rows.map(withoutNulls))
      }
      if (url.pathname === '/emptyings') {
        return send(200, db.prepare('SELECT * FROM emptyings ORDER BY ts').all().map(withoutNulls))
      }
      return send(404, { error: 'not found' })
    }

    if (req.method === 'POST') {
      if (KEY && req.headers['x-station-key'] !== KEY) return send(401, { error: 'wrong or missing X-Station-Key' })
      const body = await readJson(req)

      if (url.pathname === '/events') {
        const items = Array.isArray(body) ? body : [body]
        const rows = items.map(parseEvent)
        const problem = rows.find((r) => typeof r === 'string')
        if (problem) return send(400, { error: problem })
        for (const row of rows) insertEvent.run(...row)
        for (const r of rows) console.log(`throw    ${r[1]}: ${r[2]} -> ${r[5] ?? r[4]}`)
        return send(201, { saved: rows.length })
      }

      if (url.pathname === '/emptyings') {
        if (!isId(body?.stationId)) return send(400, { error: 'stationId is required' })
        if (body.bin != null && !isBin(body.bin)) return send(400, { error: `bin must be one of ${BINS.join(', ')}` })
        const bins = body.bin ? [body.bin] : BINS
        const ts = timeOf(body.ts)
        for (const bin of bins) insertEmptying.run(ts, body.stationId, bin)
        console.log(`emptied  ${body.stationId}: ${bins.join(', ')}`)
        return send(201, { saved: bins.length })
      }
      return send(404, { error: 'not found' })
    }

    send(405, { error: 'method not allowed' })
  } catch (err) {
    send(400, { error: err.message })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Sorting data server running. Database: ${join(here, 'data.db')}`)
  console.log(`  On this computer:  http://localhost:${PORT}`)
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === 'IPv4' && !net.internal) console.log(`  From the UNO Q:    http://${net.address}:${PORT}`)
    }
  }
  if (!KEY) console.log('  No STATION_KEY set: anyone on the network can post. Fine for testing; see .env.example.')
})
