"use client";

import { useEffect, useState, useRef, ComponentType } from "react";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import { EntryMetadata } from "@/app/page";
import JourneyMap from "@/components/JourneyMap";

interface LoadedEntry extends EntryMetadata {
  MDXContent?: ComponentType;
}

interface JourneyViewClientProps {
  entries: EntryMetadata[];
}

export default function JourneyViewClient({ entries }: JourneyViewClientProps) {
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [trail, setTrail] = useState<{ lat: number; lng: number }[]>([]);
  const [loadedEntries, setLoadedEntries] = useState<LoadedEntry[]>(entries);
  const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const isScrollingProgrammatically = useRef(false);

  // Initialize from URL hash on mount (client-side only)
  useEffect(() => {
    if (typeof window === "undefined" || isInitialized) return;

    const hash = window.location.hash;
    if (hash) {
      const dateFromHash = hash.substring(1); // Remove '#'
      const index = entries.findIndex((e) => e.date === dateFromHash);
      if (index !== -1) {
        setCurrentDateIndex(index);
      }
    }
    setIsInitialized(true);
  }, [entries, isInitialized]);

  // Load MDX content for current and nearby entries
  useEffect(() => {
    const loadMDXForEntry = async (index: number) => {
      if (
        index < 0 ||
        index >= entries.length ||
        loadedEntries[index]?.MDXContent
      )
        return;

      try {
        const entry = entries[index];
        const { default: MDXContent } = await import(
          `@/entries/${entry.date}.mdx`
        );

        setLoadedEntries((prev) => {
          const newEntries = [...prev];
          newEntries[index] = { ...newEntries[index], MDXContent };
          return newEntries;
        });
      } catch (error) {
        console.error(`Failed to load MDX for ${entries[index].date}:`, error);
      }
    };

    // Load current entry and adjacent ones
    loadMDXForEntry(currentDateIndex);
    loadMDXForEntry(currentDateIndex - 1);
    loadMDXForEntry(currentDateIndex + 1);
  }, [currentDateIndex, entries, loadedEntries]);

  // Update trail when current date changes
  useEffect(() => {
    if (entries.length > 0 && currentDateIndex >= 0) {
      const newTrail = entries.slice(0, currentDateIndex + 1).map((entry) => ({
        lat: entry.metadata.location.lat,
        lng: entry.metadata.location.lng,
      }));
      setTrail(newTrail);

      // Update URL hash without triggering navigation (works with static export)
      const currentDate = entries[currentDateIndex].date;
      if (typeof window !== "undefined") {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        window.history.replaceState(null, "", `${basePath}#${currentDate}`);
      }
    }
  }, [currentDateIndex, entries]);

  // Handle scroll to detect which entry is in view
  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingProgrammatically.current) return;

      const scrollContainer = document.getElementById("journal-scroll");
      if (!scrollContainer) return;

      const scrollTop = scrollContainer.scrollTop;
      const containerHeight = scrollContainer.clientHeight;
      const scrollCenter = scrollTop + containerHeight / 2;

      // Find which entry is closest to center of viewport
      let closestIndex = 0;
      let closestDistance = Infinity;

      entries.forEach((entry, index) => {
        const element = contentRefs.current[entry.date];
        if (element) {
          const elementTop = element.offsetTop;
          const elementHeight = element.clientHeight;
          const elementCenter = elementTop + elementHeight / 2;
          const distance = Math.abs(scrollCenter - elementCenter);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });

      if (closestIndex !== currentDateIndex) {
        setCurrentDateIndex(closestIndex);
      }
    };

    const scrollContainer = document.getElementById("journal-scroll");
    scrollContainer?.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [entries, currentDateIndex]);

  // Scroll to current entry on mount after initialization
  useEffect(() => {
    if (!isInitialized) return;

    const targetDate = entries[currentDateIndex]?.date;
    if (targetDate) {
      const element = contentRefs.current[targetDate];
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ block: "center" });
        }, 100);
      }
    }
  }, [isInitialized, entries, currentDateIndex]);

  const handleNavigate = (direction: "prev" | "next") => {
    const newIndex =
      direction === "prev"
        ? Math.max(0, currentDateIndex - 1)
        : Math.min(entries.length - 1, currentDateIndex + 1);

    if (newIndex !== currentDateIndex) {
      setCurrentDateIndex(newIndex);

      // Scroll to the entry
      const targetDate = entries[newIndex].date;
      const element = contentRefs.current[targetDate];
      if (element) {
        isScrollingProgrammatically.current = true;
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        setTimeout(() => {
          isScrollingProgrammatically.current = false;
        }, 1000);
      }
    }
  };

  const currentEntry = entries[currentDateIndex];

  if (entries.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">No journal entries found.</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Travel Journal
          </h1>
          {currentEntry && (
            <div className="flex items-center gap-4 text-sm">
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium">
                Day {currentDateIndex + 1} of {entries.length}
              </span>
              <span className="text-gray-400 dark:text-gray-500">•</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {format(parseISO(currentEntry.date), "MMMM d, yyyy")}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleNavigate("prev")}
            disabled={currentDateIndex === 0}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
          >
            ← Previous
          </button>
          <button
            onClick={() => handleNavigate("next")}
            disabled={currentDateIndex === entries.length - 1}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
          >
            Next →
          </button>
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map side (left, 50%) */}
        <div className="w-1/2 relative bg-gray-100 dark:bg-gray-900">
          {currentEntry && (
            <JourneyMap
              primaryLocation={currentEntry.metadata.location}
              additionalLocations={currentEntry.metadata.locations}
              trail={trail}
            />
          )}
        </div>

        {/* Journal side (right, 50%) */}
        <div
          id="journal-scroll"
          className="w-1/2 overflow-y-auto bg-gray-50 dark:bg-gray-950"
        >
          <div className="max-w-3xl mx-auto px-8 py-12">
            {loadedEntries.map((entry, index) => {
              const MDXContent = entry.MDXContent;
              return (
                <div
                  key={entry.date}
                  ref={(el) => {
                    contentRefs.current[entry.date] = el;
                  }}
                  className={`mb-20 transition-all duration-300 ${
                    index === currentDateIndex
                      ? "opacity-100 scale-100"
                      : "opacity-40 scale-95"
                  }`}
                >
                  {/* Entry header */}
                  <div className="mb-6">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {format(parseISO(entry.date), "EEEE, MMMM d, yyyy")} • Day{" "}
                      {index + 1}
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {entry.metadata.title}
                    </h2>
                    <div className="text-gray-600 dark:text-gray-400">
                      {entry.metadata.location.name ||
                        `${entry.metadata.location.lat}, ${entry.metadata.location.lng}`}
                    </div>
                  </div>

                  {/* Entry content */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-8 mb-6">
                    <div className="prose dark:prose-invert prose-lg max-w-none">
                      {MDXContent ? (
                        <MDXContent />
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 italic">
                          Loading entry...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scanned image */}
                  {entry.metadata.scanImage && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
                      <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
                        Original Journal Scan
                      </h3>
                      <Image
                        src={entry.metadata.scanImage}
                        alt={`Journal scan for ${entry.metadata.title}`}
                        width={800}
                        height={1000}
                        className="w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>
              );
            })}
            {/* Bottom padding for last entry */}
            <div className="h-96" />
          </div>
        </div>
      </div>
    </div>
  );
}
