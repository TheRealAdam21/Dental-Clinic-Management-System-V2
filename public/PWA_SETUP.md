# PWA Icon Setup

## Required Icons

Place the following icon files in the `public` folder:

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels

## Quick Icon Generation

You can use any of these services to generate PWA icons from your logo:

- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator
- https://favicon.io/

## Temporary Solution

For now, the app will work without custom icons. The browser will use default icons.

To add your icons later:
1. Generate 192x192 and 512x512 PNG files
2. Place them in the `public` folder
3. Rebuild: `npm run build`

## Testing PWA

After building and deploying:
1. Open the app in Chrome/Edge on mobile
2. Look for "Install" or "Add to Home Screen" option
3. The app will work offline once installed
