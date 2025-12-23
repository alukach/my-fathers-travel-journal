"use client";

import { useEffect, useState, useRef, ComponentType } from "react";
import { format, parseISO } from "date-fns";
import Image from "next/image";
import polyline from "@mapbox/polyline";
import { EntryMetadata } from "@/app/page";
import JourneyMap from "@/components/JourneyMap";

interface LoadedEntry extends EntryMetadata {
  MDXContent?: ComponentType;
}

interface JourneyViewClientProps {
  entries: EntryMetadata[];
}

export default function JourneyViewClient({ entries }: JourneyViewClientProps) {
  type TransportMode = "train" | "car" | "foot" | "ferry" | "direct";

  interface TrailSegment {
    coordinates: [number, number][]; // [lng, lat] pairs for MapLibre
    mode: TransportMode;
    from?: string;
    to?: string;
    date: string;
  }

  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [trailSegments, setTrailSegments] = useState<TrailSegment[]>([]);
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

  // Update trail when current date changes - using pre-generated routes
  useEffect(() => {
    if (entries.length === 0 || currentDateIndex < 0) return;

    const buildTrail = () => {
      const segments: TrailSegment[] = [];

      for (let i = 0; i <= currentDateIndex; i++) {
        const entry = entries[i];

        if (entry.metadata.segments && entry.metadata.segments.length > 0) {
          entry.metadata.segments.forEach((segment) => {
            // Skip segments without polyline data (e.g., same start/end location)
            if (!segment.polyline) return;

            // Decode polyline to coordinates
            // Polyline returns [lat, lng] but MapLibre needs [lng, lat]
            const latLngCoords = polyline.decode(segment.polyline);
            const lngLatCoords = latLngCoords.map(
              ([lat, lng]) => [lng, lat] as [number, number]
            );

            segments.push({
              coordinates: lngLatCoords,
              mode: segment.mode,
              from: segment.from,
              to: segment.to,
              date: entry.date,
            });
          });
        }
      }

      setTrailSegments(segments);
    };

    buildTrail();

    // Update URL hash without triggering navigation (works with static export)
    const currentDate = entries[currentDateIndex].date;
    if (typeof window !== "undefined") {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      window.history.replaceState(null, "", `${basePath}#${currentDate}`);
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
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3 md:py-4 z-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          <div className="flex items-center gap-3 md:gap-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Travel Journal
            </h1>
            {currentEntry && (
              <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
                <span className="px-2 md:px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-medium whitespace-nowrap">
                  Day {currentDateIndex + 1}/{entries.length}
                </span>
                <span className="hidden md:inline text-gray-400 dark:text-gray-500">
                  •
                </span>
                <span className="hidden sm:inline font-medium text-gray-900 dark:text-gray-100">
                  {format(parseISO(currentEntry.date), "MMMM d, yyyy")}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleNavigate("prev")}
              disabled={currentDateIndex === 0}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
            >
              ← <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Prev</span>
            </button>
            <button
              onClick={() => handleNavigate("next")}
              disabled={currentDateIndex === entries.length - 1}
              className="flex-1 md:flex-none px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors text-gray-900 dark:text-gray-100"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span> →
            </button>
          </div>
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map side - top on mobile, left on desktop */}
        <div className="w-full md:w-1/2 h-64 md:h-auto relative bg-gray-100 dark:bg-gray-900 flex-shrink-0">
          {currentEntry && (
            <JourneyMap
              primaryLocation={currentEntry.metadata.location}
              additionalLocations={currentEntry.metadata.locations}
              trailSegments={trailSegments}
            />
          )}
        </div>

        {/* Journal side - bottom on mobile, right on desktop */}
        <div
          id="journal-scroll"
          className="flex-1 md:w-1/2 overflow-y-auto bg-gray-50 dark:bg-gray-950"
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-12">
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
                      : "opacity-20 scale-100"
                  }`}
                >
                  {/* Entry header */}
                  <div className="mb-4 md:mb-6">
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {format(parseISO(entry.date), "EEEE, MMMM d, yyyy")} • Day{" "}
                      {index + 1}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {entry.metadata.title}
                    </h2>
                    <div className="text-sm md:text-base text-gray-600 dark:text-gray-400">
                      {entry.metadata.location.name ||
                        `${entry.metadata.location.lat}, ${entry.metadata.location.lng}`}
                    </div>
                  </div>

                  {/* Entry content */}
                  <div className="prose dark:prose-invert prose-sm sm:prose-base md:prose-lg max-w-none">
                    {MDXContent ? (
                      <MDXContent />
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 italic">
                        Loading entry...
                      </p>
                    )}
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
