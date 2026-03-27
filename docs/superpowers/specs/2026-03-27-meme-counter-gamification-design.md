# Phase 2: Meme Counter & Gamification

## Meme Counter

Every meme posted via the extension (flyout select, quick fire toolbar, quick fire tweet action) increments a counter. Tracked in `chrome.storage.sync`.

### Data Model

```
memeCount: number              // total all-time memes posted
dailyLog: { "2026-03-27": 3 } // per-day post counts (ISO date keys)
currentStreak: number          // consecutive days with 1+ meme
longestStreak: number          // all-time best streak
lastPostDate: string           // ISO date of last post, for streak calc
badges: string[]               // array of earned badge IDs
sidebarCardCollapsed: boolean  // collapsed state of sidebar card (default: false)
sidebarStatsEnabled: boolean   // show/hide sidebar card (default: true)
```

### Streak Logic

On each meme post:
1. Get today's date as ISO string
2. If `lastPostDate` === today: just increment `dailyLog[today]` and `memeCount`
3. If `lastPostDate` === yesterday: increment `currentStreak`, update `longestStreak` if higher
4. If `lastPostDate` is older than yesterday: reset `currentStreak` to 1
5. Update `lastPostDate` to today

## Badges

### Milestone Badges (meme count)
| ID | Name | Condition |
|----|------|-----------|
| `first_meme` | First Meme | memeCount >= 1 |
| `meme_10` | Meme Apprentice | memeCount >= 10 |
| `meme_50` | Meme Warrior | memeCount >= 50 |
| `meme_100` | Meme Master | memeCount >= 100 |
| `meme_500` | Meme Legend | memeCount >= 500 |
| `meme_1000` | Meme God | memeCount >= 1000 |

### Streak Badges
| ID | Name | Condition |
|----|------|-----------|
| `streak_7` | Week Warrior | currentStreak >= 7 |
| `streak_30` | Monthly Maniac | currentStreak >= 30 |
| `streak_100` | Unstoppable | currentStreak >= 100 |

### Special Badges
| ID | Name | Condition |
|----|------|-----------|
| `first_quickfire` | Quick Draw | first quick fire post |
| `shift_shiller` | Shift Shiller | first shift+click ticker post |

Badge checks run after every meme post. Newly earned badges trigger a toast.

## Toast Notifications

- Injected as a fixed-position div in bottom-right of page
- Dark card matching X's dark theme (rounded corners, subtle border)
- Shows: badge icon + "Achievement Unlocked!" + badge name
- Auto-dismiss after 5 seconds, or click to dismiss
- "Share" button creates a pre-filled tweet: "I just earned the [badge name] badge on Michi Meme Blaster! [memeCount] memes posted. gmichi @maboroshitoken"
- Multiple toasts stack vertically

## Sidebar Stats Card

Injected into X's right sidebar (`div[data-testid="sidebarColumn"]`), inserted before the "What's happening" / trending section. Matches X's card styling.

### Card Layout
- **Header**: "Michi Blaster Stats" with michi icon + collapse/expand chevron
- **Collapsible body** (click header to toggle):
  - Total memes posted (large number)
  - Today's count
  - Current streak + longest streak
  - Progress bar to next milestone (e.g. "23/50 to Meme Warrior")
  - Earned badge icons in a row (small, with tooltips)
- Collapse state persisted in `sidebarCardCollapsed`
- Entire card hidden when `sidebarStatsEnabled` is false

### Settings
New toggle in flyout settings + popup: "Show Sidebar Stats" (`sidebarStatsEnabled`, default: true)

## Popup Redesign

Remove the meme gallery. Replace with a modern dark stats dashboard.

### New Popup Layout
- **Header**: "Michi Meme Blaster" title, clean modern dark design
- **Stats section**:
  - Total memes (big number, centered)
  - Today / streak / longest streak in a row
  - Progress bar to next milestone
  - Badge grid (earned = gold, unearned = gray)
- **Links section**:
  - michi.meme (website)
  - CA: `AywAYdNJnSLSXwKWYxDciPjqGRnwp4iZdQptuuQTpump` (click to copy)
- **Settings section** (bottom):
  - Michi Mode toggle
  - Sound toggle
  - Show Quick Fire Button toggle
  - Quick Fire: Auto-post toggle
  - Quick Fire Text input
  - Show Sidebar Stats toggle

### Styling
- Dark background (#121212 or match X's dark theme)
- Michi brand colors: #FAECCF (warm beige), #544736 (brown)
- Clean typography, no clutter
- Modern card-based layout with subtle borders
- Smooth transitions

## Files Changed

| File | Action | What |
|------|--------|------|
| `utils.js` | Modify | Add stats helper functions (incrementMemeCount, checkBadges, getStats) |
| `content.js` | Modify | Call incrementMemeCount on post, inject sidebar card, show toasts |
| `popup.html` | Rewrite | Modern stats dashboard, remove meme gallery |
| `popup.js` | Rewrite | Stats display, badge grid, settings management |
| `manifest.json` | Modify | Bump version to 2.3.0 |
