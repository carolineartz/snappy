# Snappy Roadmap

Personal utility — priorities are whatever feels most useful, not what makes sense for a product.

## Next up (V2)

Features that build on the existing foundation without major architectural changes.

### Rename snaps
- Add `name` column to `snaps` table (TEXT, nullable)
- UI: double-click or F2 on a snap in the browser grid to rename inline
- Context menu "Rename" option
- Falls back to source app + date when unnamed

### Tag snaps
- New `tags` table: `(snap_id, tag_name)` with index on both columns
- Tags section in browser sidebar (currently a placeholder)
- Context menu "Add tag..." with autocomplete of existing tags
- Click a tag in the sidebar to filter

### Search
- Search bar in browser header (already has a placeholder spot)
- Searches across: snap name, tag names, source app name
- Live filter as you type
- Depends on rename + tag features above

### OCR search
- Extract text from snap images so you can search by image content
- Run OCR on capture (background process, don't block window creation)
- Store extracted text in a new `snap_text` column or FTS5 virtual table for fast search
- Ideas for libraries:
  - **Tesseract.js** — pure JS, works in Node/Electron main process, but large (~10MB wasm) and slow
  - **macOS Vision framework** via a native Swift helper binary — much faster, already installed on every Mac, best accuracy. Would bundle a small helper binary invoked via exec.
  - Start with Tesseract.js for simplicity, optimize with Vision later if performance matters
- Search integration: if OCR text includes the query, include that snap in results; optionally show a snippet of the matched text in the grid item

## V3 and beyond

### Sort options in browser
- Sort by Last Opened (new column, updated on reopen)
- Sort by Last Modified (updated when annotations change)

### Re-assign app categorization
- Right-click snap → "Move to app..." with list of existing apps or custom entry
- Useful when detection was wrong or the app name changed

### Blur annotation tool
- New annotation type: a rectangle region that blurs the underlying image
- Konva has filters that can do this
- Great for sensitive info in screenshots shared elsewhere

### Folder/collection organization
- Beyond tags — a way to group snaps into named folders in the sidebar
- Drag snaps into folders in the browser grid

## Settings interface

A preferences window (or panel) for configuring default behavior and shortcuts.

### Ideas for settings
- **Auto-copy on capture** — automatically put new snaps on the clipboard. Toggle on/off.
- **Keyboard shortcuts** — rebind the capture shortcut (currently `Cmd+Shift+2`) and potentially other app-level shortcuts
- **Default Pixel Perfect mode** — snaps open with shadow off by default
- **Default opacity** — (if you want to start new snaps translucent)
- **Thumbnail size / storage** — let user tune how large thumbnails are, or clean up old ones
- **Snaps storage location** — currently `userData/snaps/`, maybe let user choose

### Where it lives
- Probably a new `SettingsWindow` (similar pattern to `BrowserWindow`) — standard macOS window opened from the tray or a gear icon somewhere
- Settings stored in a `settings` table or JSON file in userData
- Main process reads settings on startup and applies them; renderer subscribes to changes

## Polish / follow-ups

### FilterPanel ResizeObserver
- Section sizing uses a measured container height to compute how many rows fit per section
- The measurement is captured via a ref callback which only fires on mount, so after the user resizes the window the cap uses a stale value
- Fix: attach a `ResizeObserver` to the scroll region in `FilterPanel.tsx` and update `availableHeight` on every resize

## Explicitly out of scope

- Sharing features (SnappyLink, social integrations) — not useful for personal workflow
- Windows/Linux support — personal macOS-only app
- iCloud sync — original had it; not needed yet
