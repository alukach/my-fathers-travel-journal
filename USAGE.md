# Usage Guide

This guide will help you create and manage journal entries for your travel diary.

## Quick Start

### 1. Create a New Entry

Create a new file in the `entries/` directory with the date format `YYYY-MM-DD.mdx`:

```bash
entries/2024-06-15.mdx
```

### 2. Add Frontmatter

At the top of the file, add YAML frontmatter between `---` markers:

```mdx
---
date: "2024-06-15"
title: "Arrival in Paris"
location:
  lat: 48.8566
  lng: 2.3522
  name: "Paris, France"
  description: "The City of Light"
locations:
  - lat: 48.8584
    lng: 2.2945
    name: "Eiffel Tower"
    description: "Visited in the evening"
  - lat: 48.8606
    lng: 2.3376
    name: "Louvre Museum"
    description: "Morning visit"
scanImage: "/scans/2024-06-15.jpg"
---
```

### 3. Write Your Content

Below the frontmatter, write your journal entry using Markdown:

```markdown
Today was an incredible day in Paris!

## Morning

Started the day at the Louvre Museum...

## Evening

Watched the sunset from the Eiffel Tower...
```

### 4. Add Scanned Images (Optional)

1. Place your scanned journal images in `public/scans/`
2. Reference them in the frontmatter: `scanImage: "/scans/2024-06-15.jpg"`

## Frontmatter Reference

### Required Fields

- **date**: Entry date in `YYYY-MM-DD` format
- **title**: Title of your journal entry
- **location**: Primary location object
  - **lat**: Latitude (number)
  - **lng**: Longitude (number)
  - **name**: Location name (optional)
  - **description**: Brief description (optional)

### Optional Fields

- **locations**: Array of additional locations visited
  - Each location has the same structure as the primary location
- **scanImage**: Path to scanned journal image (relative to `/public`)

## Finding Coordinates

To find latitude and longitude for locations:

1. **Google Maps**: Right-click on a location → Click the coordinates
2. **OpenStreetMap**: Click on a location → See coordinates in the URL
3. **LatLong.net**: Search for an address

Example coordinates:
- Paris, France: `48.8566, 2.3522`
- New York City: `40.7128, -74.0060`
- Tokyo, Japan: `35.6762, 139.6503`

## Markdown Features

Your journal entries support full Markdown syntax:

### Headings

```markdown
# Heading 1
## Heading 2
### Heading 3
```

### Text Formatting

```markdown
**Bold text**
*Italic text*
~~Strikethrough~~
```

### Lists

```markdown
- Bullet point 1
- Bullet point 2

1. Numbered item 1
2. Numbered item 2
```

### Quotes

```markdown
> This is a quote
```

### Links

```markdown
[Link text](https://example.com)
```

### Images

```markdown
![Alt text](/path/to/image.jpg)
```

## Example Entry

Here's a complete example entry:

```mdx
---
date: "2024-07-20"
title: "Exploring the Swiss Alps"
location:
  lat: 46.5197
  lng: 7.6357
  name: "Interlaken, Switzerland"
  description: "Gateway to the Alps"
locations:
  - lat: 46.5858
    lng: 7.9741
    name: "Jungfraujoch"
    description: "Top of Europe"
  - lat: 46.6863
    lng: 7.8632
    name: "Lake Thun"
    description: "Beautiful mountain lake"
scanImage: "/scans/2024-07-20.jpg"
---

# A Day in the Swiss Alps

Today was absolutely breathtaking! The journey to Jungfraujoch, known as the "Top of Europe," was incredible.

## Morning Journey

- Departed from Interlaken at 8 AM
- Took the cogwheel train through stunning mountain scenery
- Snow-capped peaks everywhere!

## At the Summit

The view from 3,454 meters (11,332 feet) was indescribable. Clear blue skies and endless white peaks in every direction.

> "The mountains are calling and I must go." - John Muir

## Afternoon at Lake Thun

Descended to visit the beautiful turquoise waters of Lake Thun. The contrast between the high alpine environment and the serene lake was remarkable.

## Reflections

Switzerland continues to amaze me. Tomorrow: on to Lucerne!
```

## Tips for Creating Entries

1. **Consistent Dating**: Use the YYYY-MM-DD format for all entries
2. **Descriptive Titles**: Make titles specific and memorable
3. **Multiple Locations**: Add all significant places visited in a day
4. **Personal Voice**: Write in your own voice - this is your journal!
5. **Regular Updates**: Create entries regularly to maintain the story flow
6. **Scan Quality**: Use high-quality scans for better readability

## Previewing Your Entries

Run the development server to preview your entries:

```bash
npm run dev
```

Open http://localhost:3000 (or the port shown) to view your journal.

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates static HTML files in the `out/` directory.

## Troubleshooting

### Entry Not Showing Up

- Check the filename format is exactly `YYYY-MM-DD.mdx`
- Verify the frontmatter is valid YAML
- Ensure the `date` field matches the filename

### Map Not Displaying

- Verify latitude and longitude are valid numbers
- Check coordinates are in decimal format (not degrees/minutes/seconds)
- Ensure you're online (maps require internet connection)

### Build Errors

- Run `npm run build` to check for errors
- Verify all MDX files have valid frontmatter
- Check that all referenced images exist in `public/scans/`
