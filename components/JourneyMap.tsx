"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Map, {
  Marker,
  Source,
  Layer,
  NavigationControl,
} from "react-map-gl/maplibre";
import type { LayerProps, MapRef } from "react-map-gl/maplibre";
import { Location } from "@/lib/types";
import "maplibre-gl/dist/maplibre-gl.css";

type TransportMode = "train" | "car" | "foot" | "ferry" | "direct";

interface TrailSegment {
  coordinates: [number, number][];
  mode: TransportMode;
}

interface JourneyMapProps {
  primaryLocation: Location;
  additionalLocations?: Location[];
  trailSegments?: TrailSegment[];
}

export default function JourneyMap({
  primaryLocation,
  additionalLocations = [],
  trailSegments = [],
}: JourneyMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: primaryLocation.lng,
    latitude: primaryLocation.lat,
    zoom: 6,
  });

  // Detect dark mode
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check initial dark mode state
    const checkDarkMode = () => {
      setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
    };

    checkDarkMode();

    // Listen for changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Style configuration for different transport modes
  const getModeStyle = (mode: TransportMode) => {
    switch (mode) {
      case "train":
        return {
          color: "#ef4444", // red
          width: 3,
          dashArray: [2, 2], // dashed line for trains
        };
      case "car":
        return {
          color: "#3b82f6", // blue
          width: 3,
          dashArray: undefined, // solid line for cars/hitchhiking
        };
      case "foot":
        return {
          color: "#10b981", // green
          width: 2,
          dashArray: [1, 3], // dotted line for walking
        };
      case "ferry":
        return {
          color: "#06b6d4", // cyan
          width: 3,
          dashArray: [6, 3], // longer dashes for ferry
        };
      case "direct":
      default:
        return {
          color: "#9ca3af", // gray
          width: 2,
          dashArray: [4, 4], // medium dashes for direct
        };
    }
  };

  // Handle primary location changes with smooth flyTo animation
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [primaryLocation.lng, primaryLocation.lat],
        zoom: 13,
        duration: 3 * 1000,
      });
    }
  }, [primaryLocation.lng, primaryLocation.lat]);

  // Choose map style based on dark mode
  const mapStyle = isDarkMode
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

  return (
    <div className="w-full h-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
      >
        <NavigationControl position="top-right" />

        {/* Trail segments with different styles per transport mode */}
        {trailSegments.map((segment, index) => {
          if (segment.coordinates.length < 2) return null;

          const style = getModeStyle(segment.mode);
          const geojson = {
            type: "Feature" as const,
            properties: {},
            geometry: {
              type: "LineString" as const,
              coordinates: segment.coordinates,
            },
          };

          const layerStyle: LayerProps = {
            id: `trail-segment-${index}`,
            type: "line",
            paint: {
              "line-color": style.color,
              "line-width": style.width,
              "line-opacity": 0.8,
            },
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
          };

          // Add dash array if defined
          if (style.dashArray) {
            layerStyle.paint!["line-dasharray"] = style.dashArray;
          }

          return (
            <Source key={`segment-${index}`} id={`trail-segment-${index}`} type="geojson" data={geojson}>
              <Layer {...layerStyle} />
            </Source>
          );
        })}

        {/* Primary location marker */}
        <Marker
          longitude={primaryLocation.lng}
          latitude={primaryLocation.lat}
          anchor="bottom"
        >
          <div className="relative group">
            <div className="w-8 h-8 bg-blue-600 rounded-full border-4 border-white dark:border-gray-800 shadow-lg animate-pulse" />
            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 border border-gray-200 dark:border-gray-700">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {primaryLocation.name || "Current Location"}
              </div>
              {primaryLocation.description && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {primaryLocation.description}
                </div>
              )}
            </div>
          </div>
        </Marker>

        {/* Additional location markers */}
        {additionalLocations?.map((location, index) => (
          <Marker
            key={index}
            longitude={location.lng}
            latitude={location.lat}
            anchor="bottom"
          >
            <div className="relative group">
              <div className="w-6 h-6 bg-gray-500 rounded-full border-3 border-white dark:border-gray-800 shadow-md" />
              <div className="absolute bottom-full mb-2 hidden group-hover:block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10 border border-gray-200 dark:border-gray-700">
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {location.name || "Location"}
                </div>
                {location.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {location.description}
                  </div>
                )}
              </div>
            </div>
          </Marker>
        ))}

      </Map>
    </div>
  );
}
