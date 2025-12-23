import {
  getAllEntryDates,
  getEntryData,
  getRoutesForEntry,
} from "@/lib/entries";
import JourneyViewClient from "@/components/JourneyViewClient";
import { JournalMetadata } from "@/lib/types";
import { notFound } from "next/navigation";

export interface EntryMetadata {
  date: string;
  metadata: JournalMetadata;
}

interface PageProps {
  params: Promise<{ date: string }>;
}

export async function generateStaticParams() {
  const dates = getAllEntryDates();
  return dates.map((date) => ({ date }));
}

export default async function EntryPage({ params }: PageProps) {
  const { date } = await params;
  const allDates = getAllEntryDates();

  // Check if date exists
  if (!allDates.includes(date)) {
    notFound();
  }

  // Fetch all entry metadata (not MDX content) and merge with generated routes
  const entries: EntryMetadata[] = allDates
    .map((entryDate) => {
      const entry = getEntryData(entryDate);
      if (!entry) return null;

      const generatedRoutes = getRoutesForEntry(entryDate);

      return {
        date: entry.date,
        metadata: {
          ...entry.metadata,
          segments:
            generatedRoutes.length > 0
              ? generatedRoutes
              : entry.metadata.segments,
        },
      };
    })
    .filter((entry) => entry !== null);

  // Find current entry index
  const currentIndex = entries.findIndex((e) => e.date === date);

  return <JourneyViewClient entries={entries} initialDateIndex={currentIndex} />;
}
