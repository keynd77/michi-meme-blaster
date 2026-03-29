// Shared utility functions for Michi Meme Blaster

// --- Twitter Handle Extraction ---
let _cachedHandle = null;
let _handleCacheTime = 0;
const HANDLE_CACHE_MS = 60_000;

function getLoggedInHandle() {
  const now = Date.now();
  if (_cachedHandle && (now - _handleCacheTime) < HANDLE_CACHE_MS) {
    return _cachedHandle;
  }

  // Method 1: Account switcher button aria-label
  const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  if (switcher) {
    const label = switcher.getAttribute('aria-label') || '';
    const match = label.match(/@([\w]+)/);
    if (match) {
      _cachedHandle = match[1].toLowerCase();
      _handleCacheTime = now;
      return _cachedHandle;
    }
  }

  // Method 2: Profile nav link
  const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    if (href) {
      _cachedHandle = href.replace('/', '').toLowerCase();
      _handleCacheTime = now;
      return _cachedHandle;
    }
  }

  return null;
}

// --- Blaster API ---
const BLASTER_API = 'https://michi.meme/api/blaster';

async function reportBlast(memeUrl, memeId, memeTitle, context) {
  const handle = getLoggedInHandle();
  if (!handle) return;
  try {
    await fetch(`${BLASTER_API}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twitterHandle: handle,
        memeUrl: memeUrl || '',
        memeId: memeId || undefined,
        memeTitle: memeTitle || undefined,
        context: context || 'flyout',
      }),
    });
  } catch (e) {
    console.debug('Blast report failed:', e);
  }
}

async function fetchUserStats() {
  const handle = getLoggedInHandle();
  if (!handle) return null;
  try {
    const res = await fetch(`${BLASTER_API}/stats?handle=${encodeURIComponent(handle)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchLeaderboard(period = 'weekly', limit = 10) {
  try {
    const res = await fetch(`${BLASTER_API}/leaderboard?period=${period}&limit=${limit}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchCommunityCounter() {
  try {
    const res = await fetch(`${BLASTER_API}/counter`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchTrending(limit = 12) {
  try {
    const res = await fetch(`${BLASTER_API}/trending?limit=${limit}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchChallenge() {
  try {
    const res = await fetch(`${BLASTER_API}/challenge`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function searchImagesIntelligent(query, limit = 20) {
  try {
    const response = await fetch(
      `https://michi.meme/api/gallery-memes/search/intelligent?q=${encodeURIComponent(query.trim())}&limit=${limit}`
    );
    if (!response.ok) return searchImages(query, 1, limit);
    const data = await response.json();
    return {
      images: (data.results || []).map(r => ({
        url: r.mediaUrl || r.pngUrl,
        thumbnailUrl: r.pngUrl || r.mediaUrl,
        id: r.id,
        title: r.title,
        score: r.score,
      })),
      pagination: { hasNext: false, total: data.results?.length || 0 },
    };
  } catch (e) {
    return searchImages(query, 1, limit);
  }
}

async function getStatsWithServer() {
  const local = await new Promise(resolve => {
    chrome.storage.sync.get(
      ['memeCount', 'dailyLog', 'currentStreak', 'longestStreak', 'lastPostDate', 'badges', 'recentPostTimestamps'],
      resolve
    );
  });
  if (local.memeCount && local.memeCount > 0) return local;
  const serverStats = await fetchUserStats();
  if (serverStats && serverStats.total > 0) {
    const stats = {
      memeCount: serverStats.total,
      currentStreak: serverStats.streak || 0,
      longestStreak: serverStats.streak || 0,
      dailyLog: {},
      lastPostDate: null,
      badges: [],
      recentPostTimestamps: [],
    };
    chrome.storage.sync.set(stats);
    return stats;
  }
  return local;
}

// Common search function used by both popup and content script
async function searchImages(query, page = 1, size = 20) {
    if (!query || query.trim() === "") {
        return { images: [], pagination: null };
    }

    try {
        const response = await fetch(`https://michi.meme/api/gallery-memes/search?q=${encodeURIComponent(query.trim())}&limit=${size}&page=${page}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && Array.isArray(data.results)) {
            const imageData = data.results
                .filter(meme => meme.mediaUrl)
                .map(meme => ({
                    url: meme.mediaUrl,
                    thumbnailUrl: meme.pngUrl || meme.mediaUrl
                }));
            return {
                images: imageData,
                pagination: { hasNext: imageData.length >= size, total: data.totalMemes }
            };
        } else {
            console.warn("Unexpected API response format:", data);
            return { images: [], pagination: null };
        }

    } catch (error) {
        console.error("Search error:", error);
        return { images: [], pagination: null };
    }
}

// Common debounced search function
function createDebouncedSearch(callback, delay = 300) {
    let timeout = null;
    return function (query) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => callback(query), delay);
    };
}

// Favorites helpers — stored in chrome.storage.sync as URL array
async function getFavorites() {
    return new Promise(resolve => {
        chrome.storage.sync.get(['favorites'], (data) => {
            resolve(data.favorites || []);
        });
    });
}

async function toggleFavorite(url) {
    const favorites = await getFavorites();
    const index = favorites.indexOf(url);
    if (index === -1) {
        favorites.push(url);
    } else {
        favorites.splice(index, 1);
    }
    return new Promise(resolve => {
        chrome.storage.sync.set({ favorites }, () => resolve(favorites));
    });
}

function isFavorite(url, favorites) {
    return favorites.includes(url);
}

// --- Meme Counter & Gamification ---

const BADGE_DEFINITIONS = [
    // Milestone badges
    { id: 'first_meme', name: 'First Meme', desc: 'Post your very first meme', condition: s => s.memeCount >= 1 },
    { id: 'meme_10', name: 'Meme Apprentice', desc: 'Post 10 memes', condition: s => s.memeCount >= 10 },
    { id: 'meme_25', name: 'Meme Enthusiast', desc: 'Post 25 memes', condition: s => s.memeCount >= 25 },
    { id: 'meme_50', name: 'Meme Warrior', desc: 'Post 50 memes', condition: s => s.memeCount >= 50 },
    { id: 'meme_100', name: 'Meme Master', desc: 'Post 100 memes', condition: s => s.memeCount >= 100 },
    { id: 'meme_250', name: 'Meme Overlord', desc: 'Post 250 memes', condition: s => s.memeCount >= 250 },
    { id: 'meme_500', name: 'Meme Legend', desc: 'Post 500 memes', condition: s => s.memeCount >= 500 },
    { id: 'meme_1000', name: 'Meme God', desc: 'Post 1000 memes', condition: s => s.memeCount >= 1000 },
    // Streak badges
    { id: 'streak_3', name: 'Getting Started', desc: 'Post memes 3 days in a row', condition: s => s.currentStreak >= 3 },
    { id: 'streak_7', name: 'Week Warrior', desc: 'Post memes 7 days in a row', condition: s => s.currentStreak >= 7 },
    { id: 'streak_14', name: 'Fortnight Fighter', desc: 'Post memes 14 days in a row', condition: s => s.currentStreak >= 14 },
    { id: 'streak_30', name: 'Monthly Maniac', desc: 'Post memes 30 days in a row', condition: s => s.currentStreak >= 30 },
    { id: 'streak_100', name: 'Unstoppable', desc: 'Post memes 100 days in a row', condition: s => s.currentStreak >= 100 },
    // Daily volume badges (kept low to avoid bans)
    { id: 'daily_5', name: 'Burst Mode', desc: 'Post 5 memes in a single day', condition: s => Object.values(s.dailyLog).some(c => c >= 5) },
    { id: 'daily_10', name: 'Meme Machine', desc: 'Post 10 memes in a single day', condition: s => Object.values(s.dailyLog).some(c => c >= 10) },
    // More milestone badges
    { id: 'meme_2000', name: 'Meme Titan', desc: 'Post 2000 memes', condition: s => s.memeCount >= 2000 },
    { id: 'meme_5000', name: 'Meme Deity', desc: 'Post 5000 memes', condition: s => s.memeCount >= 5000 },
    { id: 'meme_10000', name: 'Meme Eternal', desc: 'Post 10000 memes', condition: s => s.memeCount >= 10000 },
    // Time-based badges
    { id: 'night_owl', name: 'Night Owl', desc: 'Post a meme between midnight and 4am', condition: s => s._postHour >= 0 && s._postHour < 4 },
    { id: 'early_bird', name: 'Early Bird', desc: 'Post a meme between 5am and 7am', condition: s => s._postHour >= 5 && s._postHour < 7 },
    { id: 'lunch_break', name: 'Lunch Break Shiller', desc: 'Post a meme between 12pm and 1pm', condition: s => s._postHour >= 12 && s._postHour < 13 },
    { id: 'weekend_warrior', name: 'Weekend Warrior', desc: 'Post a meme on a Saturday or Sunday', condition: s => s._postDay === 0 || s._postDay === 6 },
    // Dedication badges
    { id: 'days_7', name: 'One Week In', desc: 'Post memes on 7 different days', condition: s => s._uniqueDays >= 7 },
    { id: 'days_30', name: 'Monthly Regular', desc: 'Post memes on 30 different days', condition: s => s._uniqueDays >= 30 },
    { id: 'days_100', name: 'The Devoted', desc: 'Post memes on 100 different days', condition: s => s._uniqueDays >= 100 },
    // Special badges
    { id: 'first_quickfire', name: 'Quick Draw', desc: 'Use Quick Fire for the first time', condition: null },
    { id: 'shift_shiller', name: 'Shift Shiller', desc: 'Use Shift+Click to shill the ticker', condition: null },
    // Hidden / fun badges
    { id: 'triple_threat', name: 'Triple Threat', desc: 'Post 3+ memes in under a minute (use Quick Fire!)', condition: null },
];

const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000];

function getNextMilestone(memeCount) {
    for (const m of MILESTONES) {
        if (memeCount < m) return m;
    }
    return null;
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

async function getStats() {
    return new Promise(resolve => {
        chrome.storage.sync.get([
            'memeCount', 'dailyLog', 'currentStreak', 'longestStreak',
            'lastPostDate', 'badges', 'sidebarCardCollapsed', 'sidebarStatsEnabled',
            'recentPostTimestamps'
        ], data => {
            resolve({
                memeCount: data.memeCount || 0,
                dailyLog: data.dailyLog || {},
                currentStreak: data.currentStreak || 0,
                longestStreak: data.longestStreak || 0,
                lastPostDate: data.lastPostDate || null,
                badges: data.badges || [],
                sidebarCardCollapsed: data.sidebarCardCollapsed ?? false,
                sidebarStatsEnabled: data.sidebarStatsEnabled ?? true,
                recentPostTimestamps: data.recentPostTimestamps || [],
            });
        });
    });
}

async function incrementMemeCount(specialBadgeId) {
    const stats = await getStats();
    const today = getTodayISO();
    const yesterday = getYesterdayISO();
    const specialIds = specialBadgeId ? [specialBadgeId] : [];

    stats.memeCount++;
    stats.dailyLog[today] = (stats.dailyLog[today] || 0) + 1;

    if (stats.lastPostDate === today) {
        // same day, just increment
    } else if (stats.lastPostDate === yesterday) {
        stats.currentStreak++;
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }
    } else {
        stats.currentStreak = 1;
        if (stats.currentStreak > stats.longestStreak) {
            stats.longestStreak = stats.currentStreak;
        }
    }
    stats.lastPostDate = today;

    // Track recent post timestamps for triple threat detection
    const now = new Date();
    const nowMs = now.getTime();
    stats.recentPostTimestamps.push(nowMs);
    // Keep only timestamps from last 2 minutes
    stats.recentPostTimestamps = stats.recentPostTimestamps.filter(t => nowMs - t < 120000);
    // Triple threat: 3+ posts within 60 seconds
    const oneMinAgo = nowMs - 60000;
    const postsInLastMinute = stats.recentPostTimestamps.filter(t => t >= oneMinAgo).length;
    if (postsInLastMinute >= 3) {
        specialIds.push('triple_threat');
    }

    // Set transient context for badge checks (not persisted)
    stats._postHour = now.getHours();
    stats._postDay = now.getDay(); // 0=Sun, 6=Sat
    stats._uniqueDays = Object.keys(stats.dailyLog).length;

    // Check badges
    const newBadges = checkBadges(stats, specialIds);

    // Trim dailyLog to last 120 days to stay within storage limits
    const keys = Object.keys(stats.dailyLog).sort();
    if (keys.length > 120) {
        keys.slice(0, keys.length - 120).forEach(k => delete stats.dailyLog[k]);
    }

    await new Promise(resolve => {
        chrome.storage.sync.set({
            memeCount: stats.memeCount,
            dailyLog: stats.dailyLog,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak,
            lastPostDate: stats.lastPostDate,
            badges: stats.badges,
            recentPostTimestamps: stats.recentPostTimestamps,
        }, resolve);
    });

    return { stats, newBadges };
}

function checkBadges(stats, specialIds) {
    const specials = Array.isArray(specialIds) ? specialIds : (specialIds ? [specialIds] : []);
    const newBadges = [];

    for (const badge of BADGE_DEFINITIONS) {
        if (stats.badges.includes(badge.id)) continue;

        let earned = false;
        if (badge.condition) {
            earned = badge.condition(stats);
        } else if (specials.includes(badge.id)) {
            earned = true;
        }

        if (earned) {
            stats.badges.push(badge.id);
            newBadges.push(badge);
        }
    }

    return newBadges;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchImages, createDebouncedSearch, getFavorites, toggleFavorite, isFavorite, getStats, incrementMemeCount, checkBadges, BADGE_DEFINITIONS, getNextMilestone };
}