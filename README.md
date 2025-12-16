# My Father's Travel Diary

A static-generated travel journal application built with Next.js, featuring interactive maps, MDX entries, and scanned journal images.

## Features

- **Static Site Generation**: Built with Next.js for fast, pre-rendered pages
- **MDX Support**: Write journal entries in Markdown with React components
- **Interactive Maps**: Leaflet maps showing travel locations with markers
- **Date-based Navigation**: Navigate chronologically through journal entries
- **Scanned Images**: Display original journal scans alongside transcribed text
- **Responsive Design**: Works beautifully on desktop and mobile devices

## Project Structure

```
my-fathers-travel-diary/
├── app/
│   ├── entry/[date]/     # Dynamic route for individual journal entries
│   ├── page.tsx          # Homepage with journal index
│   └── layout.tsx        # Root layout
├── components/
│   ├── JourneyMap.tsx    # Interactive map component
│   └── mdx-components.tsx # Custom MDX component styling
├── entries/              # Journal entries (MDX files)
│   ├── YYYY-MM-DD.mdx    # Format: date-based filenames
│   └── ...
├── lib/
│   ├── types.ts          # TypeScript type definitions
│   └── entries.ts        # Utility functions for reading entries
└── public/
    └── scans/            # Scanned journal images
```

## Creating a Journal Entry

1. Create a new MDX file in the `entries/` directory with the format: `YYYY-MM-DD.mdx`
2. Add frontmatter metadata at the top of the file
3. Write your journal entry content using Markdown/MDX

### Entry Template

```mdx
---
date: "2024-06-15"
title: "Your Entry Title"
location:
  lat: 48.8566
  lng: 2.3522
  name: "Location Name"
  description: "Brief description"
locations:
  - lat: 48.8584
    lng: 2.2945
    name: "Place Visited"
    description: "What you did here"
scanImage: "/scans/2024-06-15.jpg"
---

# Your Journal Entry

Write your journal content here using Markdown.

## Subheadings

- Lists
- **Bold text**
- *Italic text*

You can include images, quotes, and more!
```

### Frontmatter Fields

- **date** (required): Entry date in YYYY-MM-DD format
- **title** (required): Title of the journal entry
- **location** (required): Primary location coordinates
  - `lat`: Latitude
  - `lng`: Longitude
  - `name`: (optional) Location name
  - `description`: (optional) Brief description
- **locations** (optional): Array of additional locations visited
- **scanImage** (optional): Path to scanned journal image (relative to `/public`)

## Adding Scanned Images

1. Place scanned journal images in the `public/scans/` directory
2. Reference them in your entry's frontmatter: `scanImage: "/scans/2024-06-15.jpg"`

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build static site
npm run build

# Preview production build
npm start
```

## Static Export

The site is configured to export as static HTML:

```bash
npm run build
```

This generates static files in the `out/` directory that can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## Deploying to GitHub Pages

This project includes a GitHub Actions workflow for automatic deployment to GitHub Pages:

1. Push your code to GitHub
2. Go to your repository Settings → Pages
3. Under "Source", select "GitHub Actions"
4. The site will automatically build and deploy on every push to the `main` branch

Your site will be available at: `https://[username].github.io/[repository-name]/`

### Manual Deployment

Alternatively, you can manually deploy the `out/` directory after running `npm run build`:

```bash
npm run build
# Then deploy the 'out' folder to your hosting service
```

## Map Features

Each entry displays an interactive map showing:
- Primary location (marked and auto-opened popup)
- Additional locations visited that day
- Automatic bounds fitting when multiple locations exist

## Navigation

- **Homepage**: Lists all journal entries chronologically
- **Entry Pages**: Each entry has unique URL (`/entry/YYYY-MM-DD`)
- **Previous/Next**: Navigate between consecutive days
- **Back to Index**: Return to homepage from any entry

## Technologies Used

- [Next.js 16](https://nextjs.org/) - React framework
- [MDX](https://mdxjs.com/) - Markdown with JSX
- [Leaflet](https://leafletjs.com/) - Interactive maps
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [date-fns](https://date-fns.org/) - Date formatting
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter parsing

## License

This project is for personal use.
