export interface Location {
  lat: number;
  lng: number;
  name?: string;
  description?: string;
}

export interface JournalEntry {
  date: string; // YYYY-MM-DD format
  title: string;
  location: Location;
  pois?: Location[]; // Points of interest visited that day
  content: string;
  scanImage?: string; // Path to scanned journal entry image
}

export type TransportMode = "train" | "car" | "foot" | "ferry" | "direct";

export interface RouteSegment {
  mode: TransportMode;
  polyline: string; // Encoded polyline string
  from?: string; // Optional description of starting point
  to?: string; // Optional description of destination
}

export interface JournalMetadata {
  date: string;
  title: string;
  location: Location;
  pois?: Location[];
  scanImage?: string;
  segments?: RouteSegment[];
}
