# Phase 1: Favorites + Quick Fire Button

## Favorites

- Star icon overlay on each meme thumbnail (flyout and popup)
- Stored in `chrome.storage.sync` — persists across devices
- New "Favorites" tab in flyout header (next to All / Random / Add Gmichi)
- Same tab in popup gallery
- Favorites grid works same as All — click to attach, scrollable

## Quick Fire Button

- Second Michi button injected into X toolbar, next to existing one
- Visually distinct (lightning bolt overlay or different tint)
- On click: picks random meme → attaches to tweet → optionally auto-posts
- Auto-post behavior controlled by setting (default: off = attach only)

## Flyout Settings Tab

- Gear icon in flyout header bar
- Opens settings panel replacing image grid (click gear again to go back)
- Settings:
  - **Quick Fire mode**: toggle "Attach only" / "Attach + Auto-post"
  - **Sound effects**: on/off
  - **Michi Mode**: on/off
- All persisted via `chrome.storage.sync`
- Same settings mirrored in popup

## Data Model

### chrome.storage.sync keys
- `favorites`: string[] — array of meme URLs
- `quickFireAutoPost`: boolean (default: false)
- `soundEnabled`: boolean (default: false)
- `michiModeEnabled`: boolean (default: false)

## UI Changes

### Flyout header
Current: `[search] [All] [Random] [Add Gmichi]`
New: `[search] [All] [Random] [Favorites] [Add Gmichi] [⚙️]`

### Toolbar
Current: `[...X toolbar icons] [Michi button]`
New: `[...X toolbar icons] [Michi button] [Quick Fire button]`
