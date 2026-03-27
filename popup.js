const CA = "AywAYdNJnSLSXwKWYxDciPjqGRnwp4iZdQptuuQTpump";

document.addEventListener("DOMContentLoaded", async () => {
    // --- Load & display stats ---
    const stats = await getStats();
    const today = getTodayISO();

    document.getElementById("totalCount").textContent = stats.memeCount;
    document.getElementById("todayCount").textContent = stats.dailyLog[today] || 0;
    document.getElementById("currentStreak").textContent = stats.currentStreak;
    document.getElementById("longestStreak").textContent = stats.longestStreak;

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

    // Load stored settings
    chrome.storage.sync.get([
        "replaceLikeEnabled", "soundEnabled", "quickFireEnabled",
        "quickFireAutoPost", "quickFireText", "sidebarStatsEnabled"
    ], (data) => {
        toggleMichiMode.checked = data.replaceLikeEnabled ?? true;
        toggleSound.checked = data.soundEnabled ?? false;
        toggleQuickFireBtn.checked = data.quickFireEnabled ?? true;
        toggleQuickFireAuto.checked = data.quickFireAutoPost ?? false;
        quickFireTextInput.value = data.quickFireText || "gmichi";
        toggleSidebarStats.checked = data.sidebarStatsEnabled ?? true;
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
});
