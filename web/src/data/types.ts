// The contract between the sorting station and the web UI.
// One SortEvent per item thrown. No images, no item-level labels.

export type BinId = 'bio' | 'plastic' | 'mixed'
export const BINS: BinId[] = ['bio', 'plastic', 'mixed']

export const BIN_LABEL: Record<BinId, string> = {
  bio: 'Bio-waste',
  plastic: 'Plastic packaging',
  mixed: 'Mixed waste',
}

export const BIN_LABEL_FI: Record<BinId, string> = {
  bio: 'Biojäte',
  plastic: 'Muovipakkaukset',
  mixed: 'Sekajäte',
}

/** Which inputs the station has. Still open on the hardware side, so the UI handles all three. */
export type Inputs = 'buttons' | 'sensor' | 'both'

export interface Station {
  id: string
  site: string
  floor: string
  room: string
  kind: 'university' | 'school' | 'office'
  inputs: Inputs
}

export interface SortEvent {
  ts: number
  stationId: string
  /** What the classifier saw. This is also the bin the item belongs in. */
  category: BinId
  /** 0-1. Below LOW_CONFIDENCE the station showed "?" and the event is not scored. */
  confidence: number
  /** Button the person pressed. Absent if the station has no buttons. */
  chosenBin?: BinId
  /** Bin opening the distance sensor saw the item go into. Absent if there is no sensor. */
  landedBin?: BinId
  mode: 'guide' | 'challenge'
}

/** Sent when a bin is emptied. The "what is in each bin" cards count from the latest one. */
export interface EmptiedEvent {
  ts: number
  stationId: string
  bin: BinId
}
