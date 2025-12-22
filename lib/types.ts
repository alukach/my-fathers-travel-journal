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
  locations?: Location[]; // Additional locations visited that day
  content: string;
  scanImage?: string; // Path to scanned journal entry image
}

export interface JournalMetadata {
  date: string;
  title: string;
  location: Location;
  locations?: Location[];
  scanImage?: string;
  transportMode?: "train" | "car" | "foot" | "ferry" | "direct"; // How they traveled to this location
  route?: [number, number][]; // Pre-generated route coordinates [lng, lat]
}
