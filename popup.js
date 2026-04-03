const CA = "AywAYdNJnSLSXwKWYxDciPjqGRnwp4iZdQptuuQTpump";

let currentHandle = null;

async function getHandleFromTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab?.url || (!tab.url.includes('x.com') && !tab.url.includes('twitter.com'))) {
            return null;
        }
        if (!tab.id) return null;
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getHandle' });
        return response?.handle || null;
    } catch { return null; }
}

async function loadAndDisplayStats() {
    const handle = await getHandleFromTab();
    currentHandle = handle;

    if (!handle) {
        // Not on X — show notice, show community total only
        document.getElementById('notOnXNotice').style.display = 'block';
        document.getElementById('totalLabel').textContent = 'community blasts';
        document.getElementById('shareTgBtn').style.display = 'none';

        try {
            const res = await fetch('https://michi.meme/api/blaster/counter');
            if (res.ok) {
                const data = await res.json();
                document.getElementById('totalCount').textContent = data.total;
                document.getElementById('todayCount').textContent = data.today;
                document.getElementById('currentStreak').textContent = '-';
                document.getElementById('longestStreak').textContent = '-';
            }
        } catch {}

        return await getStats(); // return local for badges
    }

    // On X — fetch user stats from server
    document.getElementById('notOnXNotice').style.display = 'none';
    document.getElementById('totalLabel').textContent = 'memes posted';
    document.getElementById('shareTgBtn').style.display = '';

    const localStats = await getStats();
    const stats = { ...localStats };

    try {
        const res = await fetch(`https://michi.meme/api/blaster/stats?handle=${encodeURIComponent(handle)}`);
        if (res.ok) {
            const server = await res.json();
            stats.memeCount = server.total;
            stats.currentStreak = server.streak;
            stats.longestStreak = Math.max(localStats.longestStreak, server.streak);
            document.getElementById('totalCount').textContent = server.total;
            document.getElementById('todayCount').textContent = server.today;
            document.getElementById('currentStreak').textContent = server.streak;
            document.getElementById('longestStreak').textContent = stats.longestStreak;
            return stats;
        }
    } catch {}

    // Fallback to local
    const today = getTodayISO();
    document.getElementById('totalCount').textContent = localStats.memeCount;
    document.getElementById('todayCount').textContent = localStats.dailyLog[today] || 0;
    document.getElementById('currentStreak').textContent = localStats.currentStreak;
    document.getElementById('longestStreak').textContent = localStats.longestStreak;
    return stats;
}

document.addEventListener("DOMContentLoaded", async () => {
    const stats = await loadAndDisplayStats();

    // Progress bar
    const nextMilestone = getNextMilestone(stats.memeCount);
    const prevMilestone = MILESTONES.filter(m => m <= stats.memeCount).pop() || 0;

    if (nextMilestone) {
        const progress = ((stats.memeCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
        const nextBadge = BADGE_DEFINITIONS.find(b => b.id === `meme_${nextMilestone}`) || BADGE_DEFINITIONS[0];
        document.getElementById("progressText").textContent = `${stats.memeCount}/${nextMilestone}`;
        document.getElementById("progressBadge").textContent = nextBadge.name;
        document.getElementById("progressFill").style.width = `${progress}%`;
    } else {
        document.getElementById("progressSection").style.display = "none";
    }

    // Badge grid with click-to-reveal detail
    const grid = document.getElementById("badgeGrid");
    const detail = document.getElementById("badgeDetail");
    const detailName = document.getElementById("badgeDetailName");
    const detailDesc = document.getElementById("badgeDetailDesc");
    const detailStatus = document.getElementById("badgeDetailStatus");
    let selectedBadgeEl = null;

    BADGE_DEFINITIONS.forEach(badge => {
        const earned = stats.badges.includes(badge.id);
        const el = document.createElement("div");
        el.className = `badge ${earned ? 'earned' : 'unearned'}`;
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="${earned ? '#1a1a1a' : '#555'}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
        el.addEventListener("click", () => {
            // Toggle off if clicking same badge
            if (selectedBadgeEl === el) {
                el.classList.remove("selected");
                detail.classList.remove("visible");
                selectedBadgeEl = null;
                return;
            }
            // Deselect previous
            if (selectedBadgeEl) selectedBadgeEl.classList.remove("selected");
            el.classList.add("selected");
            selectedBadgeEl = el;

            detailName.textContent = badge.name;
            detailName.style.color = earned ? '#FFD700' : '#e7e9ea';
            detailDesc.textContent = badge.desc;
            detailStatus.textContent = earned ? 'Unlocked!' : 'Locked';
            detailStatus.style.color = earned ? '#4ade80' : '#71767b';
            detail.classList.add("visible");
        });
        grid.appendChild(el);
    });

    // Load daily challenge
    fetch('https://michi.meme/api/blaster/challenge')
      .then(r => r.json())
      .then(data => {
        if (data.challenge) {
          document.getElementById('challengeSection').style.display = 'block';
          document.getElementById('challengeTitle').textContent = `${data.challenge.emoji} ${data.challenge.title}`;
          document.getElementById('challengeDesc').textContent = data.challenge.description;
        }
      })
      .catch(() => {});

    // Load leaderboard
    fetch('https://michi.meme/api/blaster/leaderboard?period=weekly&limit=5')
      .then(r => r.json())
      .then(data => {
        if (data.leaderboard && data.leaderboard.length > 0) {
          const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
          document.getElementById('leaderboardList').innerHTML = data.leaderboard
            .map((e, i) => `<div style="margin:2px 0;">${medals[i]} @${e.twitterHandle} — ${e.blasts} blasts</div>`)
            .join('');
        }
      })
      .catch(() => {});

    // --- Refresh button ---
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      btn.textContent = '...';
      await loadAndDisplayStats();
      // Also tell content script to refresh sidebar card
      try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'refreshCard' });
      } catch {}
      btn.textContent = 'Refresh';
    });

    // --- Share stats to Telegram ---
    document.getElementById('shareTgBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('shareTgBtn');
      if (!currentHandle) {
        btn.textContent = 'Open X first!';
        setTimeout(() => { btn.textContent = 'Share stats in Telegram'; }, 2000);
        return;
      }

      btn.textContent = 'Sending...';
      btn.disabled = true;

      try {
        const mode = document.querySelector('input[name="shareMode"]:checked')?.value || 'all';
        const template = document.querySelector('input[name="shareTemplate"]:checked')?.value || 'lesson';
        const res = await fetch('https://michi.meme/api/blaster/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ handle: currentHandle, mode, template }),
        });
        if (res.ok) {
          btn.textContent = 'Sent!';
        } else {
          const err = await res.json().catch(() => ({}));
          btn.textContent = err.error || 'Failed';
        }
      } catch {
        btn.textContent = 'Network error';
      }

      setTimeout(() => {
        btn.textContent = 'Share stats in Telegram';
        btn.disabled = false;
      }, 3000);
    });

    // --- CA copy ---
    document.getElementById("caRow").addEventListener("click", () => {
        navigator.clipboard.writeText(CA).then(() => {
            const label = document.getElementById("copiedLabel");
            label.style.display = "inline";
            setTimeout(() => { label.style.display = "none"; }, 1500);
        });
    });

    // --- Settings ---
    const toggleMichiMode = document.getElementById("toggleMichiMode");
    const toggleSound = document.getElementById("toggleSound");
    const toggleQuickFireBtn = document.getElementById("toggleQuickFireBtn");
    const toggleQuickFireAuto = document.getElementById("toggleQuickFireAuto");
    const quickFireTextInput = document.getElementById("quickFireTextInput");
    const toggleSidebarStats = document.getElementById("toggleSidebarStats");
    const toggleAnimatedPics = document.getElementById("toggleAnimatedPics");

    // Load stored settings
    chrome.storage.sync.get([
        "replaceLikeEnabled", "soundEnabled", "quickFireEnabled",
        "quickFireAutoPost", "quickFireText", "sidebarStatsEnabled", "animatedProfilePicsEnabled"
    ], (data) => {
        toggleMichiMode.checked = data.replaceLikeEnabled ?? true;
        toggleSound.checked = data.soundEnabled ?? false;
        toggleQuickFireBtn.checked = data.quickFireEnabled ?? true;
        toggleQuickFireAuto.checked = data.quickFireAutoPost ?? false;
        quickFireTextInput.value = data.quickFireText || "gmichi";
        toggleSidebarStats.checked = data.sidebarStatsEnabled ?? true;
        toggleAnimatedPics.checked = data.animatedProfilePicsEnabled ?? true;
    });

    // Setting change handlers
    function sendToContentScript(msg) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, msg);
            }
        });
    }

    toggleMichiMode.addEventListener("change", () => {
        const enabled = toggleMichiMode.checked;
        chrome.storage.sync.set({ replaceLikeEnabled: enabled });
        sendToContentScript({ replaceLikeEnabled: enabled });
    });

    toggleSound.addEventListener("change", () => {
        const enabled = toggleSound.checked;
        chrome.storage.sync.set({ soundEnabled: enabled });
        sendToContentScript({ soundEnabled: enabled });
    });

    toggleQuickFireBtn.addEventListener("change", () => {
        const enabled = toggleQuickFireBtn.checked;
        chrome.storage.sync.set({ quickFireEnabled: enabled });
        sendToContentScript({ quickFireEnabled: enabled });
    });

    toggleQuickFireAuto.addEventListener("change", () => {
        const enabled = toggleQuickFireAuto.checked;
        chrome.storage.sync.set({ quickFireAutoPost: enabled });
        sendToContentScript({ quickFireAutoPost: enabled });
    });

    let textTimeout = null;
    quickFireTextInput.addEventListener("input", () => {
        if (textTimeout) clearTimeout(textTimeout);
        textTimeout = setTimeout(() => {
            const text = quickFireTextInput.value;
            chrome.storage.sync.set({ quickFireText: text });
            sendToContentScript({ quickFireText: text });
        }, 300);
    });

    toggleSidebarStats.addEventListener("change", () => {
        const enabled = toggleSidebarStats.checked;
        chrome.storage.sync.set({ sidebarStatsEnabled: enabled });
        sendToContentScript({ sidebarStatsEnabled: enabled });
    });

    toggleAnimatedPics.addEventListener("change", () => {
        const enabled = toggleAnimatedPics.checked;
        chrome.storage.sync.set({ animatedProfilePicsEnabled: enabled });
        sendToContentScript({ animatedProfilePicsEnabled: enabled });
        updateAnimatedPicsPreview(enabled);
    });

    // Animated pics preview panel
    const previewPanel = document.getElementById("animatedPicsPreview");
    const previewImages = document.getElementById("animatedPicsImages");
    const previewAvatar = document.getElementById("animatedPicsAvatar");
    const previewHeader = document.getElementById("animatedPicsHeader");
    const previewPlaceholder = document.getElementById("animatedPicsPlaceholder");

    function updateAnimatedPicsPreview(enabled) {
        if (!enabled) {
            previewPanel.classList.remove("visible");
            return;
        }
        previewPanel.classList.add("visible");

        // Get user handle + cached profile styles from content script / storage
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const handle = tab?.url?.match(/x\.com\/([^/?#]+)/)?.[1]?.toLowerCase();

            chrome.storage.local.get(["profileStylesCache"], (stored) => {
                const styles = stored.profileStylesCache?.data || [];
                const userHandle = handle && !["home", "explore", "notifications", "messages", "search"].includes(handle)
                    ? handle : null;
                const entry = userHandle ? styles.find(s => s.twitterHandle === userHandle) : null;

                if (entry && (entry.avatarGifUrl || entry.headerImageUrl)) {
                    previewImages.style.display = "flex";
                    previewPlaceholder.style.display = "none";
                    if (entry.avatarGifUrl) {
                        previewAvatar.src = entry.avatarGifUrl;
                        previewAvatar.style.display = "block";
                    } else {
                        previewAvatar.style.display = "none";
                    }
                    if (entry.headerImageUrl) {
                        previewHeader.src = entry.headerImageUrl;
                        previewHeader.style.display = "block";
                    } else {
                        previewHeader.style.display = "none";
                    }
                } else {
                    previewImages.style.display = "none";
                    previewPlaceholder.style.display = "block";
                    previewPlaceholder.textContent = userHandle
                        ? `No custom GIF set for @${userHandle}`
                        : "Visit your X profile to see your GIF preview";
                }
            });
        });
    }

    // Show preview if already enabled on load
    chrome.storage.sync.get("animatedProfilePicsEnabled", (data) => {
        if (data.animatedProfilePicsEnabled ?? true) {
            updateAnimatedPicsPreview(true);
        }
    });
});
