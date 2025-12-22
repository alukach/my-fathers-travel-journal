import { getAllEntryDates, getEntryData, getRoutesForEntry } from "@/lib/entries";
import JourneyViewClient from "@/components/JourneyViewClient";
import { JournalMetadata } from "@/lib/types";

export interface EntryMetadata {
  date: string;
  metadata: JournalMetadata;
}

export default async function JourneyPage() {
  const allDates = getAllEntryDates();

  // Fetch all entry metadata (not MDX content) and merge with generated routes
  const entries: EntryMetadata[] = allDates
    .map((date) => {
      const entry = getEntryData(date);
      if (!entry) return null;

      const generatedRoutes = getRoutesForEntry(date);

      return {
        date: entry.date,
        metadata: {
          ...entry.metadata,
          segments: generatedRoutes.length > 0 ? generatedRoutes : entry.metadata.segments,
        },
      };
    })
    .filter((entry): entry is EntryMetadata => entry !== null);

  return <JourneyViewClient entries={entries} />;
}
