import { generateMockEmptyings, generateMockEvents, MOCK_STATIONS } from './mock'
import type { EmptiedEvent, SortEvent, Station } from './types'

// The single seam between the UI and the data.
// With VITE_API_URL set (see web/.env.example) the data comes from the server in /server,
// which the UNO Q posts to. Without it, the site shows generated demo data.

const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

/** True when the site shows real data from the server. */
export const IS_LIVE = Boolean(API)

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`Server answered ${res.status}`)
  return res.json() as Promise<T>
}

export async function getStations(): Promise<Station[]> {
  return IS_LIVE ? get<Station[]>('/stations') : MOCK_STATIONS
}

/** Oldest first. */
export async function getEvents(): Promise<SortEvent[]> {
  return IS_LIVE ? get<SortEvent[]>('/events') : generateMockEvents()
}

export async function getEmptyings(): Promise<EmptiedEvent[]> {
  return IS_LIVE ? get<EmptiedEvent[]>('/emptyings') : generateMockEmptyings()
}
