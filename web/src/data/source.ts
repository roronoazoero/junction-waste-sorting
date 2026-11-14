import { generateMockEvents, MOCK_STATIONS } from './mock'
import type { SortEvent, Station } from './types'

// The single seam between the UI and the data.
// Going live: replace these bodies with fetch() calls to the ingest API
// that the station posts SortEvent JSON to. Nothing else needs to change.

export async function getStations(): Promise<Station[]> {
  return MOCK_STATIONS
}

export async function getEvents(): Promise<SortEvent[]> {
  return generateMockEvents()
}
