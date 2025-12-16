import { getAllEntryDates, getEntryData } from "@/lib/entries";
import JourneyViewClient from "@/components/JourneyViewClient";
import { JournalMetadata } from "@/lib/types";

export interface EntryMetadata {
  date: string;
  metadata: JournalMetadata;
}

export default async function JourneyPage() {
  const allDates = getAllEntryDates();

  // Fetch all entry metadata (not MDX content)
  const entries: EntryMetadata[] = allDates
    .map((date) => {
      const entry = getEntryData(date);
      if (!entry) return null;

      return {
        date: entry.date,
        metadata: entry.metadata,
      };
    })
    .filter((entry): entry is EntryMetadata => entry !== null);

  return <JourneyViewClient entries={entries} />;
}
