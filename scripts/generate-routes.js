const fs = require('fs');
const path = require('path');
const polyline = require('@mapbox/polyline');

/**
 * Fetch route from OSRM (Open Source Routing Machine)
 * Falls back to curved line if routing fails
 */
async function fetchRoute(start, end, mode = 'car') {
  // For ferry, flight, and direct mode, return curved line
  if (['ferry', 'flight', 'direct'].includes(mode)) {
    return generateCurvedPath(start, end);
  }

  // Map transport modes to OSRM profiles
  const profile = mode === 'train' ? 'car' : mode; // OSRM doesn't have train, use car as proxy

  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates;
    }
  } catch (error) {
    console.warn(`  ⚠ Failed to fetch route, using curved line:`, error.message);
  }

  // Fallback to curved line
  return generateCurvedPath(start, end);
}

/**
 * Generate a curved path between two points (for direct/ferry routes)
 */
function generateCurvedPath(start, end, segments = 20) {
  const points = [];
  const smoothness = 0.2;

  const dx = end.lng - start.lng;
  const dy = end.lat - start.lat;

  // Control point offset perpendicular to line
  const cx = (start.lng + end.lng) / 2 + dy * smoothness;
  const cy = (start.lat + end.lat) / 2 - dx * smoothness;

  for (let t = 0; t <= segments; t++) {
    const s = t / segments;
    const s2 = 1 - s;

    // Quadratic bezier
    const lng = s2 * s2 * start.lng + 2 * s2 * s * cx + s * s * end.lng;
    const lat = s2 * s2 * start.lat + 2 * s2 * s * cy + s * s * end.lat;

    points.push([lng, lat]);
  }

  return points;
}

/**
 * Parse location reference to coordinates
 * Can be "lat,lng" or a reference to current/previous entry location
 */
function parseLocationRef(ref, currentEntry, previousEntry, allEntries) {
  // Check if it's coordinates "lat,lng"
  const coordMatch = ref.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2])
    };
  }

  // Check if it's "current" or refers to current entry
  if (ref === 'current' || ref === currentEntry.metadata.location.name) {
    return currentEntry.metadata.location;
  }

  // Check if it's "previous" or refers to previous entry
  if (ref === 'previous' && previousEntry) {
    return previousEntry.metadata.location;
  }
  if (previousEntry && ref === previousEntry.metadata.location.name) {
    return previousEntry.metadata.location;
  }

  // Search for location name in current entry's additional locations
  if (currentEntry.metadata.pois) {
    const loc = currentEntry.metadata.pois.find(l => l.name === ref);
    if (loc) return loc;
  }

  // Search for location name in previous entries
  for (let i = allEntries.length - 1; i >= 0; i--) {
    const entry = allEntries[i];
    if (entry.metadata.location.name === ref) {
      return entry.metadata.location;
    }
    if (entry.metadata.pois) {
      const loc = entry.metadata.pois.find(l => l.name === ref);
      if (loc) return loc;
    }
  }

  throw new Error(`Could not resolve location reference: "${ref}"`);
}

/**
 * Parse MDX frontmatter and content (simplified - just extracts YAML)
 */
function parseMDX(content) {
  const lines = content.split('\n');
  const firstDelimiter = lines.findIndex(line => line.trim() === '---');
  const secondDelimiter = lines.findIndex((line, idx) => idx > firstDelimiter && line.trim() === '---');

  if (firstDelimiter === -1 || secondDelimiter === -1) {
    throw new Error('Invalid MDX format');
  }

  const frontmatterLines = lines.slice(firstDelimiter + 1, secondDelimiter);
  const bodyLines = lines.slice(secondDelimiter + 1);

  // Simple YAML parser for our needs
  const metadata = {};
  let currentKey = null;
  let currentObject = null;
  let currentArray = null;

  frontmatterLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const keyValueMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, indent, key, value] = keyValueMatch;
      const indentLevel = indent.length;

      if (indentLevel === 0) {
        currentKey = key;
        if (value) {
          metadata[key] = value.replace(/^["']|["']$/g, '');
        } else {
          currentObject = {};
          currentArray = null;
          metadata[key] = currentObject;
        }
      } else if (currentObject) {
        if (value) {
          currentObject[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    } else if (line.match(/^\s+-\s+/)) {
      if (!currentArray) {
        currentArray = [];
        metadata[currentKey] = currentArray;
      }
      const itemMatch = line.match(/^\s+-\s+(\w+):\s*(.*)$/);
      if (itemMatch) {
        const [, key, value] = itemMatch;
        const newObj = { [key]: value.replace(/^["']|["']$/g, '') };
        currentArray.push(newObj);
        currentObject = newObj;
      }
    } else if (currentObject && line.match(/^\s{4,}\w+:/)) {
      const contMatch = line.match(/^\s+(\w+):\s*(.*)$/);
      if (contMatch) {
        const [, key, value] = contMatch;
        currentObject[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  });

  // Convert string numbers to numbers
  if (metadata.location) {
    metadata.location.lat = parseFloat(metadata.location.lat);
    metadata.location.lng = parseFloat(metadata.location.lng);
  }
  if (metadata.pois) {
    metadata.pois = metadata.pois.map(loc => ({
      ...loc,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lng),
    }));
  }

  return { metadata, body: bodyLines.join('\n') };
}

async function main() {
  const entriesDir = path.join(__dirname, '..', 'entries');
  const routesDir = path.join(__dirname, '..', 'lib', 'routes');

  // Create routes directory if it doesn't exist
  if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
  }

  const files = fs.readdirSync(entriesDir)
    .filter(f => f.endsWith('.mdx'))
    .sort();

  console.log(`Found ${files.length} entry files\n`);

  const allEntries = [];

  // First pass: load all entries
  for (const file of files) {
    const filePath = path.join(entriesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseMDX(content);
    allEntries.push(parsed);
  }

  let generated = 0;
  let cached = 0;

  // Second pass: generate routes based on segment definitions
  for (let i = 0; i < allEntries.length; i++) {
    const entry = allEntries[i];
    const previousEntry = i > 0 ? allEntries[i - 1] : null;
    const date = entry.metadata.date;
    const routeFilePath = path.join(routesDir, `${date}.json`);

    console.log(`Processing ${date} - ${entry.metadata.title}`);

    // Check if route file already exists
    if (fs.existsSync(routeFilePath)) {
      console.log(`  ✓ Using cached route from ${date}.json`);
      cached++;
      console.log('');
      continue;
    }

    const routeSegments = [];

    // Handle new segment definitions
    if (entry.metadata.segments && Array.isArray(entry.metadata.segments)) {
      for (const segmentDef of entry.metadata.segments) {
        console.log(`  → Generating ${segmentDef.mode} route from "${segmentDef.from}" to "${segmentDef.to}"...`);

        try {
          const startLoc = parseLocationRef(segmentDef.from, entry, previousEntry, allEntries.slice(0, i + 1));
          const endLoc = parseLocationRef(segmentDef.to, entry, previousEntry, allEntries.slice(0, i + 1));

          // Skip if start and end are the same location
          if (startLoc.lat === endLoc.lat && startLoc.lng === endLoc.lng) {
            console.log(`  ⊘ Skipped - same start and end location`);
            continue;
          }

          const route = await fetchRoute(startLoc, endLoc, segmentDef.mode);

          // Encode route as polyline for compact storage
          // Polyline format requires [lat, lng] but our route has [lng, lat]
          const latLngRoute = route.map(([lng, lat]) => [lat, lng]);
          const encodedPolyline = polyline.encode(latLngRoute);

          routeSegments.push({
            mode: segmentDef.mode,
            from: startLoc.name || `${startLoc.lat}, ${startLoc.lng}`,
            to: endLoc.name || `${endLoc.lat}, ${endLoc.lng}`,
            polyline: encodedPolyline
          });

          console.log(`  ✓ Route generated with ${route.length} points (encoded to ${encodedPolyline.length} chars)`);
        } catch (error) {
          console.error(`  ✗ Error: ${error.message}`);
        }
      }
    }
    // Handle legacy single transportMode + previous location
    else if (entry.metadata.transportMode && previousEntry) {
      console.log(`  → Generating ${entry.metadata.transportMode} route from previous location...`);

      // Skip if start and end are the same location
      if (previousEntry.metadata.location.lat === entry.metadata.location.lat &&
          previousEntry.metadata.location.lng === entry.metadata.location.lng) {
        console.log(`  ⊘ Skipped - same start and end location`);
        console.log('');
        continue;
      }

      const route = await fetchRoute(
        previousEntry.metadata.location,
        entry.metadata.location,
        entry.metadata.transportMode
      );

      // Encode route as polyline for compact storage
      const latLngRoute = route.map(([lng, lat]) => [lat, lng]);
      const encodedPolyline = polyline.encode(latLngRoute);

      routeSegments.push({
        mode: entry.metadata.transportMode,
        from: previousEntry.metadata.location.name,
        to: entry.metadata.location.name,
        polyline: encodedPolyline
      });

      console.log(`  ✓ Route generated with ${route.length} points (encoded to ${encodedPolyline.length} chars)`);
    }

    if (routeSegments.length > 0) {
      // Write route to individual JSON file
      fs.writeFileSync(routeFilePath, JSON.stringify(routeSegments, null, 2));
      console.log(`  ✓ Saved route to ${date}.json`);
      generated++;
    }

    console.log('');

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`✅ Route generation complete!`);
  console.log(`   Generated: ${generated} new routes`);
  console.log(`   Cached: ${cached} existing routes`);
  console.log(`   Routes directory: ${routesDir}`);
}

main().catch(console.error);
