const fs = require('fs');
const path = require('path');

/**
 * Fetch route from OSRM (Open Source Routing Machine)
 * Falls back to curved line if routing fails
 */
async function fetchRoute(start, end, mode = 'car') {
  // For ferry and direct mode, return curved line
  if (mode === 'ferry' || mode === 'direct') {
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
 * Parse MDX frontmatter and content
 */
function parseMDX(content) {
  const lines = content.split('\n');

  // Find frontmatter boundaries
  const firstDelimiter = lines.findIndex(line => line.trim() === '---');
  const secondDelimiter = lines.findIndex((line, idx) => idx > firstDelimiter && line.trim() === '---');

  if (firstDelimiter === -1 || secondDelimiter === -1) {
    throw new Error('Invalid MDX format - frontmatter delimiters not found');
  }

  const frontmatterLines = lines.slice(firstDelimiter + 1, secondDelimiter);
  const bodyLines = lines.slice(secondDelimiter + 1);

  // Parse YAML frontmatter
  const metadata = {};
  let currentKey = null;
  let currentObject = null;
  let currentArray = null;

  frontmatterLines.forEach(line => {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) return;

    // Check for key-value pair
    const keyValueMatch = line.match(/^(\s*)(\w+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, indent, key, value] = keyValueMatch;
      const indentLevel = indent.length;

      if (indentLevel === 0) {
        // Top-level key
        currentKey = key;
        if (value) {
          // Handle quoted strings
          metadata[key] = value.replace(/^["']|["']$/g, '');
        } else {
          // Object or array follows
          currentObject = {};
          currentArray = null;
          metadata[key] = currentObject;
        }
      } else if (currentObject) {
        // Nested key
        if (value) {
          currentObject[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    } else if (line.match(/^\s+-\s+/)) {
      // Array item
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
      // Continuation of array object
      const contMatch = line.match(/^\s+(\w+):\s*(.*)$/);
      if (contMatch) {
        const [, key, value] = contMatch;
        currentObject[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  });

  // Convert string numbers to actual numbers for coordinates
  if (metadata.location) {
    metadata.location.lat = parseFloat(metadata.location.lat);
    metadata.location.lng = parseFloat(metadata.location.lng);
  }
  if (metadata.locations) {
    metadata.locations = metadata.locations.map(loc => ({
      ...loc,
      lat: parseFloat(loc.lat),
      lng: parseFloat(loc.lng),
    }));
  }

  return { metadata, body: bodyLines.join('\n') };
}

/**
 * Serialize metadata object back to YAML format
 */
function serializeMetadata(metadata) {
  const lines = [];

  Object.entries(metadata).forEach(([key, value]) => {
    if (value === null || value === undefined) return;

    if (typeof value === 'string' || typeof value === 'number') {
      lines.push(`${key}: "${value}"`);
    } else if (Array.isArray(value)) {
      // Handle array (e.g., locations, route)
      if (key === 'route' && value.length > 0 && Array.isArray(value[0])) {
        // Route is array of [lng, lat] pairs - store in compact JSON
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        // Regular array of objects
        value.forEach((item, idx) => {
          if (idx === 0) {
            lines.push(`${key}:`);
          }
          Object.entries(item).forEach(([k, v], i) => {
            if (i === 0) {
              lines.push(`  - ${k}: "${v}"`);
            } else {
              lines.push(`    ${k}: "${v}"`);
            }
          });
        });
      }
    } else if (typeof value === 'object') {
      // Handle object (e.g., location)
      lines.push(`${key}:`);
      Object.entries(value).forEach(([k, v]) => {
        lines.push(`  ${k}: ${typeof v === 'number' ? v : `"${v}"`}`);
      });
    }
  });

  return lines.join('\n');
}

async function main() {
  const entriesDir = path.join(__dirname, '..', 'entries');
  const files = fs.readdirSync(entriesDir)
    .filter(f => f.endsWith('.mdx'))
    .sort();

  console.log(`Found ${files.length} entry files\n`);

  let previousEntry = null;

  for (const file of files) {
    const filePath = path.join(entriesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { metadata, body } = parseMDX(content);

    console.log(`Processing ${metadata.date} - ${metadata.title}`);

    // Skip if route already exists
    if (metadata.route) {
      console.log(`  ✓ Route already exists, skipping\n`);
      previousEntry = metadata;
      continue;
    }

    if (!previousEntry) {
      console.log(`  ℹ First entry, no route needed\n`);
      previousEntry = metadata;
      continue;
    }

    // Generate route from previous location to current
    const mode = metadata.transportMode || 'direct';
    console.log(`  → Fetching ${mode} route from ${previousEntry.location.name} to ${metadata.location.name}...`);

    const route = await fetchRoute(
      previousEntry.location,
      metadata.location,
      mode
    );

    console.log(`  ✓ Route generated with ${route.length} points`);

    // Add route to metadata
    metadata.route = route;

    // Write back to file
    const newContent = `---\n${serializeMetadata(metadata)}\n---\n${body}`;
    fs.writeFileSync(filePath, newContent);

    console.log(`  ✓ Updated ${file}\n`);

    previousEntry = metadata;

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('✅ All routes generated!');
}

main().catch(console.error);
