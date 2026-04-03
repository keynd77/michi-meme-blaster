// Global variables
const version = "3.0";

// Exchange tags — excluded from random/quickfire unless the post mentions them
const EXCHANGE_TAGS = ['binance', 'coinbase', 'kucoin', 'bitmart', 'kraken', 'bybit', 'okx', 'gate', 'mexc', 'htx', 'bitget', 'exchange'];

function isExchangeMeme(tags) {
    if (!tags || !Array.isArray(tags)) return false;
    return tags.some(t => EXCHANGE_TAGS.includes((t || '').toLowerCase()));
}

function contextMentionsExchange(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return EXCHANGE_TAGS.some(ex => lower.includes(ex));
}

// --- Blast tracking: count only when tweet is actually posted ---
function markTweetButtonAsBlaster(memeUrl, badgeId, context) {
    // Find the tweet button closest to the current composer
    setTimeout(() => {
        const btns = document.querySelectorAll('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
        for (const btn of btns) {
            btn.setAttribute('data-michi-blast', 'true');
            btn.setAttribute('data-michi-url', memeUrl || '');
            btn.setAttribute('data-michi-badge', badgeId || '');
            btn.setAttribute('data-michi-context', context || 'flyout');
        }
    }, 500); // Small delay to let the media attach
}

// Intercept tweet button clicks globally
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
    if (!btn || !btn.hasAttribute('data-michi-blast')) return;

    const memeUrl = btn.getAttribute('data-michi-url') || '';
    const badgeId = btn.getAttribute('data-michi-badge') || null;
    const context = btn.getAttribute('data-michi-context') || 'flyout';

    // Clean up attributes
    btn.removeAttribute('data-michi-blast');
    btn.removeAttribute('data-michi-url');
    btn.removeAttribute('data-michi-badge');
    btn.removeAttribute('data-michi-context');

    // Now count it — the tweet is actually being posted
    const { newBadges } = await incrementMemeCount(badgeId);
    newBadges.forEach(b => showBadgeToast(b));
    reportBlast(memeUrl, null, null, context);
    updateSidebarCard();
}, true); // Capture phase so we see it before Twitter handles it

// Fast meme lookup for quick fire — uses keyword search with 1.5s timeout
async function quickContextMeme(context) {
    const mentionsEx = contextMentionsExchange(context);
    if (context && context.length > 5) {
        const cleaned = context.replace(/https?:\/\/\S+/g, '').replace(/[@#$]\w+/g, '').trim();
        const words = cleaned.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
        if (words.length > 0) {
            try {
                const query = words.join(' ');
                const result = await Promise.race([
                    searchImages(query, 1, 20),
                    new Promise(resolve => setTimeout(() => resolve({ images: [] }), 1500)),
                ]);
                if (result.images && result.images.length > 0) {
                    // Filter out exchange memes unless context mentions one
                    const filtered = mentionsEx
                        ? result.images
                        : result.images.filter(img => !isExchangeMeme(img.tags));
                    if (filtered.length > 0) {
                        const pick = filtered[Math.floor(Math.random() * filtered.length)];
                        return pick.url || pick.thumbnailUrl;
                    }
                }
            } catch {}
        }
    }
    return michiImages[Math.floor(Math.random() * michiImages.length)];
}

function getSeasonalTag() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  if (month === 11) return 'christmas';
  if (month === 9 && day >= 15) return 'halloween';
  if (month === 1 && day <= 14) return 'valentine';
  if (month === 0 && day <= 7) return 'newyear';
  return null;
}
let michiImages = [];
let loadedCount = 0;
const batchSize = 20;
let flyoutContainer = null;
let flyoutToolbar = null;
let likeReplacementEnabled = true;
let soundEnabled = false;
let quickFireEnabled = true;
let quickFireAutoPost = true;
let quickFireText = "gmichi";
let animatedProfilePicsEnabled = true;
const TEXT_TO_ADD = "gmichi";
let sidebarCardInjected = false;
let currentSearchPage = 1;
let currentSearchQuery = "";
let hasMoreSearchResults = true;
let isSearching = false;
let searchTimeout = null;

// Search result cache (in-memory, 5min TTL, max 10 entries)
const _searchCache = new Map();
const _SEARCH_CACHE_TTL = 5 * 60 * 1000;
function _getCachedSearch(query) {
    const entry = _searchCache.get(query.toLowerCase());
    if (!entry) return null;
    if (Date.now() - entry.ts > _SEARCH_CACHE_TTL) { _searchCache.delete(query.toLowerCase()); return null; }
    return entry;
}
function _setCachedSearch(query, images, pagination) {
    if (_searchCache.size >= 10) _searchCache.delete(_searchCache.keys().next().value);
    _searchCache.set(query.toLowerCase(), { images, pagination, ts: Date.now() });
}

// Hover preload for intelligent context search
let _preloadedContext = null; // { context, result } or { context, promise }


function isVideoUrl(url) {
    if (!url) return false;

    // Convert to lowercase for case-insensitive matching
    const lowerUrl = url.toLowerCase();

    // Check for common video extensions
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.m4v', '.mpg', '.mpeg'];
    return videoExtensions.some(ext => lowerUrl.endsWith(ext));
}

// Configuration object at the top
const vipUserConfig = {
    users: [
        {
            username: "thealexblade", // Your X username
            gifUrl: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2poNGp5ZXJwemNicmVhNTN0Nm1iaGs5N3pibXF4eW02cTNuaDJ1bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/o4vD25fPGhwp2Q1O3k/giphy.gif",  // GIF in root folder    
            headerImageUrl: "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDFkYTZlYW9jOXo0a3NwOHV2YmY2Yjh5M3BoOXBrM3d2OXI2bHI2ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4D9MUWzGHUgH4CuT2j/giphy.gif"
            //headerImageUrl: "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2M1dWF0aHp1MDlicjJiZjBraWNjMHJ6czF2cW55dTRkYWV2ZmNvaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/oDhofc3jh8D1alEo8u/giphy.gif"
        }
    ]
};

console.log(`                       
           _     _   _ 
 ___ _____|_|___| |_|_|
| . |     | |  _|   | |
|_  |_|_|_|_|___|_|_|_|
|___| 

- michi meme blaster v${version}
- project of michisolana.org
- all memes at gmichi.meme
- developed by @keynd 
`);

const buttonLabels = {
    en: "Add photos or video",
    de: "Fotos oder Videos hinzufügen",
    fr: "Ajouter des photos ou des vidéos",
    es: "Agregar fotos o videos",
    it: "Aggiungi foto o video",
    nl: "Foto’s of video’s toevoegen",
    pt: "Adicionar fotos ou vídeos",
    ru: "Добавить фото или видео",
    ja: "写真または動画を追加",
    ko: "사진 또는 동영상 추가",
    zh: "添加照片或视频"
};

const michiSVGBase = (fillColor = "none") => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 338 507" width="22" height="22" aria-hidden="true">
    <path d="M136.5 18.5c17 0 18 16 38 16 8 0 13-14 63-14 16 0 16-17 40-17 16 0 33 82 33 101 0 17-3 46-3 46s27 39 27 90c0 40-2 62-20 62-9 0 8 55 8 73 0 34-6 45-6 65 0 9 12 9 12 32 0 14-13 31-34 31s-39-17-39-30-12-23-37-23c-23 0-34 10-34 28 0 11-8 25-29 25-27 0-33-7-33-35 0-15-43-53-43-99 0-16-76 21-76-11 0-47 72-58 72-76 0-88 43-134 43-134s-10-34-10-49c0-19 11-81 28-81Z"
        style="fill:${fillColor}; stroke:currentColor; stroke-miterlimit:10; stroke-width:40px"/>
</svg>
`;

function playMichiSound() {
    const soundIndex = Math.floor(Math.random() * 7); // Random sound from 0 to 6
    const sound = new Audio(chrome.runtime.getURL(`sound/sound_${soundIndex}.mp3`));
    sound.play().catch(error => console.error("Error playing sound:", error));
}

// Profile picture replacement targeting parent div with href="/username"
// Profile picture and header photo replacement

const PROFILE_STYLES_URL = 'https://michi.meme/api/blaster/profile-styles';
const PROFILE_STYLES_CACHE_KEY = 'profileStylesCache';
const PROFILE_STYLES_TTL_MS = 60 * 60 * 1000; // 1 hour

let profileStylesList = []; // { twitterHandle, avatarGifUrl, headerImageUrl }

async function fetchAndReplaceProfilePics() {
    if (!animatedProfilePicsEnabled) return;

    // Check cache first
    chrome.storage.local.get([PROFILE_STYLES_CACHE_KEY], async (stored) => {
        const cached = stored[PROFILE_STYLES_CACHE_KEY];
        const now = Date.now();

        if (cached && cached.fetchedAt && (now - cached.fetchedAt) < PROFILE_STYLES_TTL_MS) {
            profileStylesList = cached.data || [];
            replaceProfilePics();
            return;
        }

        // Fetch fresh
        try {
            const res = await fetch(PROFILE_STYLES_URL);
            if (!res.ok) throw new Error('Non-200 response');
            const data = await res.json();
            profileStylesList = Array.isArray(data) ? data : [];
            chrome.storage.local.set({
                [PROFILE_STYLES_CACHE_KEY]: { data: profileStylesList, fetchedAt: now }
            });
        } catch (e) {
            console.warn('Failed to fetch profile styles, using cached/empty:', e);
            profileStylesList = cached?.data || [];
        }

        replaceProfilePics();
    });
}

function replaceProfilePics() {
    if (!animatedProfilePicsEnabled) return;

    // Build merged list: start with vipUserConfig as fallback
    const mergedMap = new Map();
    for (const u of vipUserConfig.users) {
        mergedMap.set(u.username.toLowerCase(), {
            username: u.username.toLowerCase(),
            gifUrl: u.gifUrl,
            headerImageUrl: u.headerImageUrl,
        });
    }

    // DB values override vipUserConfig
    for (const entry of profileStylesList) {
        const handle = entry.twitterHandle.toLowerCase();
        const existing = mergedMap.get(handle) || { username: handle };
        mergedMap.set(handle, {
            username: handle,
            gifUrl: entry.avatarGifUrl || existing.gifUrl || null,
            headerImageUrl: entry.headerImageUrl || existing.headerImageUrl || null,
        });
    }

    const usersToReplace = Array.from(mergedMap.values()).filter(u => u.gifUrl || u.headerImageUrl);

    for (const user of usersToReplace) {
        // Avatar replacement
        if (user.gifUrl) {
            const isAvatarVideo = isVideoUrl(user.gifUrl);
            const avatarContainers = document.querySelectorAll(`div[data-testid="UserAvatar-Container-${user.username}"]`);
            avatarContainers.forEach(container => {
                if (isAvatarVideo) {
                    const existing = container.querySelector('video.michi-avatar-video');
                    if (existing && existing.src === user.gifUrl) return;
                    if (existing) existing.remove();
                    const img = container.querySelector("img");
                    if (img) {
                        const video = document.createElement("video");
                        video.src = user.gifUrl;
                        video.className = "michi-avatar-video";
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.controls = false;
                        video.style.cssText = `width:${img.offsetWidth || 40}px;height:${img.offsetHeight || 40}px;border-radius:50%;object-fit:cover;position:absolute;top:0;left:0;`;
                        img.style.opacity = "0";
                        img.parentNode.insertBefore(video, img);
                    }
                } else {
                    const bgDiv = container.querySelector('div[style*="background-image"]');
                    if (bgDiv && !bgDiv.style.backgroundImage.includes(user.gifUrl)) {
                        bgDiv.style.backgroundImage = `url("${user.gifUrl}")`;
                    }
                    const img = container.querySelector("img");
                    if (img && img.src !== user.gifUrl) {
                        img.src = user.gifUrl;
                        img.alt = `Animated profile pic for ${user.username}`;
                    }
                }
            });
        }

        // Header replacement (only on profile pages)
        if (user.headerImageUrl) {
            const isVideo = isVideoUrl(user.headerImageUrl);
            const headerLinks = document.querySelectorAll(`a[href="/${user.username}/header_photo"]`);
            headerLinks.forEach(link => {
                const parentDiv = link.parentElement;
                if (!parentDiv) return;

                if (isVideo) {
                    if (parentDiv.querySelector('video.michi-header-video')) return;
                    const img = parentDiv.querySelector("img");
                    if (img) {
                        const video = document.createElement("video");
                        video.src = user.headerImageUrl;
                        video.className = "michi-header-video";
                        video.autoplay = true;
                        video.loop = true;
                        video.muted = true;
                        video.playsInline = true;
                        video.controls = false;
                        video.style.width = img.style.width || "100%";
                        video.style.height = img.style.height || "100%";
                        video.style.objectFit = "cover";
                        video.style.position = "absolute";
                        video.style.top = "0";
                        video.style.left = "0";
                        img.style.opacity = "0";
                        img.parentNode.insertBefore(video, img);
                    }
                } else {
                    const bgDiv = parentDiv.querySelector('div[style*="background-image"]');
                    if (bgDiv && !bgDiv.style.backgroundImage.includes(user.headerImageUrl)) {
                        bgDiv.style.backgroundImage = `url("${user.headerImageUrl}")`;
                    }
                    const img = parentDiv.querySelector("img");
                    if (img && img.src !== user.headerImageUrl) {
                        img.src = user.headerImageUrl;
                        img.alt = `Animated header for ${user.username}`;
                    }
                }
            });
        }
    }
}

// Helper function to check if an image URL is valid
function checkImageUrl(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(true); // Image loaded successfully
        img.onerror = () => resolve(false); // Image failed to load
        img.src = url;
    });
}

// Load Michi images from `images.json`
fetch(chrome.runtime.getURL("images.json"))
    .then(response => response.json())
    .then(data => {
        michiImages = shuffleArray(data);
    })
    .catch(error => console.error("Error loading Michi images:", error));

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
}

// searchImages function is now imported from utils.js

async function showSearchResults(images) {
    if (!flyoutContainer) return;
    const imageGrid = document.getElementById("michi-grid");
    if (!imageGrid) return;

    imageGrid.innerHTML = "";
    const favorites = await getFavorites();

    images.forEach(image => {
        const thumbUrl = image.thumbnailUrl + (image.thumbnailUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
        const thumb = createMemeThumb(image.url, thumbUrl, 'michi.meme', favorites);
        imageGrid.appendChild(thumb);
    });
}

function showSearchError(message) {
    if (!flyoutContainer) return;
    const imageGrid = document.getElementById("michi-grid");
    if (!imageGrid) return;

    imageGrid.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100px; color: ${getComputedStyle(document.body).color}; font-family: 'TwitterChirp', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${message}</div>`;
}

function createVideoThumb(src) {
    const el = document.createElement("video");
    el.src = src;
    el.setAttribute("muted", "");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.autoplay = true;
    el.preload = "metadata";
    // Force play after a tick (Chrome sometimes blocks autoplay in injected DOM)
    setTimeout(() => el.play().catch(() => {}), 100);
    return el;
}

// Create a meme thumbnail with favorite star overlay for the flyout
function createMemeThumb(imageUrl, thumbnailUrl, sourceType, favorites) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";
    wrapper.style.borderRadius = "5px";
    wrapper.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

    const isVideo = /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(imageUrl) || /\.(mp4|webm|mov|avi|m4v)(\?|$)/i.test(thumbnailUrl);
    let media;
    if (isVideo) {
        media = createVideoThumb(thumbnailUrl);
    } else {
        media = document.createElement("img");
        media.src = thumbnailUrl;
    }
    media.style.width = "100%";
    media.style.height = "100px";
    media.style.objectFit = "cover";
    media.style.cursor = "pointer";
    media.style.display = "block";
    media.addEventListener("click", () => {
        uploadImageToTweet(imageUrl, sourceType, 'flyout');
        closeFlyout();
    });

    const star = document.createElement("div");
    star.className = "michi-fav-star";
    star.style.cssText = `
        position: absolute; top: 4px; right: 4px;
        width: 22px; height: 22px;
        cursor: pointer; z-index: 2;
        font-size: 16px; line-height: 22px; text-align: center;
        background: rgba(0,0,0,0.5); border-radius: 50%;
        user-select: none;
    `;
    const isFav = isFavorite(imageUrl, favorites);
    star.textContent = isFav ? "\u2605" : "\u2606";
    star.style.color = isFav ? "#FFD700" : "#fff";
    star.addEventListener("click", async (e) => {
        e.stopPropagation();
        const updated = await toggleFavorite(imageUrl);
        const nowFav = isFavorite(imageUrl, updated);
        star.textContent = nowFav ? "\u2605" : "\u2606";
        star.style.color = nowFav ? "#FFD700" : "#fff";
    });

    wrapper.appendChild(media);
    wrapper.appendChild(star);
    return wrapper;
}

// Load initial state from storage
chrome.storage.sync.get(["replaceLikeEnabled", "soundEnabled", "quickFireEnabled", "quickFireAutoPost", "quickFireText", "animatedProfilePicsEnabled"], (data) => {
    likeReplacementEnabled = data.replaceLikeEnabled ?? true;
    soundEnabled = data.soundEnabled ?? false;
    quickFireEnabled = data.quickFireEnabled ?? true;
    quickFireAutoPost = data.quickFireAutoPost ?? true;
    quickFireText = data.quickFireText || "gmichi";
    animatedProfilePicsEnabled = data.animatedProfilePicsEnabled ?? true;
    if (animatedProfilePicsEnabled) {
        fetchAndReplaceProfilePics();
    }

    if (likeReplacementEnabled) {
        replaceLikeButtons();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getHandle') {
        sendResponse({ handle: getLoggedInHandle() });
        return;
    }

    if (message.type === 'refreshCard') {
        updateSidebarCard();
        // Also bust profile styles cache and re-fetch
        chrome.storage.local.remove(PROFILE_STYLES_CACHE_KEY, () => {
            if (animatedProfilePicsEnabled) fetchAndReplaceProfilePics();
        });
        return;
    }

    if (message.replaceLikeEnabled !== undefined) {
        likeReplacementEnabled = message.replaceLikeEnabled;
        if (likeReplacementEnabled) {
            replaceLikeButtons();
        } else {
            restoreOriginalLikeButtons();
        }
    }

    if (message.soundEnabled !== undefined) {
        soundEnabled = message.soundEnabled; // Update sound setting when changed
    }

    if (message.quickFireEnabled !== undefined) {
        quickFireEnabled = message.quickFireEnabled;
        document.querySelectorAll('.gmichi-quickfire-wrapper, .gmichi-tweet-quickfire').forEach(el => {
            el.style.display = message.quickFireEnabled ? "" : "none";
        });
    }
    if (message.quickFireAutoPost !== undefined) {
        quickFireAutoPost = message.quickFireAutoPost;
    }
    if (message.quickFireText !== undefined) {
        quickFireText = message.quickFireText;
    }

    if (message.sidebarStatsEnabled !== undefined) {
        if (!message.sidebarStatsEnabled) {
            const card = document.querySelector('.michi-sidebar-card');
            if (card) card.remove();
            sidebarCardInjected = false;
        } else {
            sidebarCardInjected = false;
            injectSidebarCard();
        }
    }

    if (message.animatedProfilePicsEnabled !== undefined) {
        animatedProfilePicsEnabled = message.animatedProfilePicsEnabled;
    }
});

// Function to try and find the image button by aria-label in different languages
function findAddPhotoButtons() {
    return [...document.querySelectorAll('button[aria-label]')].filter(button =>
        Object.values(buttonLabels).includes(button.getAttribute('aria-label'))
    );
}

// Function to create Michi button
function createMichiButton() {
    const button = document.createElement("button");
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", "Michi Button");
    button.className = "css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l gmichi-toolbar-button";
    button.style.border = "none";
    button.style.background = "transparent";
    button.style.cursor = "pointer";
    button.style.padding = "5px";

    // Inner div (same as Twitter buttons)
    const buttonInner = document.createElement("div");
    buttonInner.setAttribute("dir", "ltr");
    buttonInner.className = "css-146c3p1 r-bcqeeo r-qvutc0 r-37j5jr r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci";
    buttonInner.style.color = "rgb(29, 155, 240)"; // Twitter blue

    // Inline SVG with fixed stroke width (40)
    buttonInner.innerHTML = michiSVGBase("none");

    // Hover effect (matches Twitter button behavior) + preload intelligent search
    button.addEventListener("mouseenter", () => {
        buttonInner.style.color = "#FAECCF"; // Example hover color (Orange)
        // Preload context-aware search so it's ready when flyout opens
        const tweetContext = getTweetContext();
        if (tweetContext && tweetContext.length > 5) {
            const cleanContext = tweetContext.replace(/https?:\/\/\S+/g, '').replace(/[@#$]\w+/g, '').trim();
            if (cleanContext.length > 5 && _preloadedContext?.context !== cleanContext) {
                const excludeEx = !contextMentionsExchange(tweetContext);
                const promise = searchImagesIntelligent(cleanContext, 20, excludeEx);
                _preloadedContext = { context: cleanContext, result: promise };
                promise.then(result => { _preloadedContext = { context: cleanContext, result }; }).catch(() => {});
            }
        }
    });

    button.addEventListener("mouseleave", () => {
        buttonInner.style.color = "rgb(29, 155, 240)";
    });

    // Click event to toggle flyout
    button.addEventListener("click", (event) => {
        currentMichiButton = event.target;
        if (event.shiftKey && (event.metaKey || event.ctrlKey)) {
            // Cmd+Shift (Mac) / Ctrl+Shift (Windows) → Add Image + Text
            handleCmdShiftClickMichiButton();
        } else if (event.shiftKey) {
            // Shift-Click → Add only an Image
            handleShiftClickMichiButton();
        } else {
            // Normal click opens the flyout
            toggleMichiFlyout(event, button);
        }
    });

    button.appendChild(buttonInner);
    return button;
}

function createQuickFireButton() {
    const button = document.createElement("button");
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", "Quick Fire Michi");
    button.className = "css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l gmichi-quickfire-button";
    button.style.border = "none";
    button.style.background = "transparent";
    button.style.cursor = "pointer";
    button.style.padding = "5px";

    const buttonInner = document.createElement("div");
    buttonInner.setAttribute("dir", "ltr");
    buttonInner.className = "css-146c3p1 r-bcqeeo r-qvutc0 r-37j5jr r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci";
    buttonInner.style.color = "#FFD700";
    buttonInner.style.position = "relative";

    buttonInner.innerHTML = `
        <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
            ${michiSVGBase("#FFD700")}
            <span style="position: absolute; bottom: 0px; right: -6px; font-size: 10px; line-height: 1; pointer-events: none;">&#9889;</span>
        </div>
    `;

    button.addEventListener("mouseenter", () => {
        buttonInner.style.color = "#FFA500";
    });
    button.addEventListener("mouseleave", () => {
        buttonInner.style.color = "#FFD700";
    });

    button.addEventListener("click", async (event) => {
        event.stopPropagation();
        currentMichiButton = event.target;

        if (michiImages.length === 0) {
            console.error("No Michi images available for quick fire.");
            return;
        }

        showLoadingOverlay();

        if (event.shiftKey) {
            insertTextInTweetInput("check out michi\n\n$MICHI\nCA: AywAYdNJnSLSXwKWYxDciPjqGRnwp4iZdQptuuQTpump ");
        } else {
            insertTextInTweetInput(quickFireText + " ");
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        // Fast keyword search for quick fire, fall back to random
        const quickMeme = await quickContextMeme(getTweetContext());
        await uploadImageToTweet(quickMeme, event.shiftKey ? 'shift_shiller' : 'first_quickfire', 'quickfire');

        if (quickFireAutoPost) {
            await new Promise(resolve => setTimeout(resolve, 800));
            const tweetButton = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
            if (tweetButton) {
                tweetButton.click();
            }
        }

        hideLoadingOverlay();
    });

    button.appendChild(buttonInner);
    return button;
}

async function handleShiftClickMichiButton() {
    showLoadingOverlay();

    const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
    await uploadImageToTweet(randomImage, null, 'random');

    hideLoadingOverlay();
}

async function handleCmdShiftClickMichiButton() {
    showLoadingOverlay();
    insertTextInTweetInput(TEXT_TO_ADD + " ");

    await new Promise(resolve => setTimeout(resolve, 300));

    const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
    await uploadImageToTweet(randomImage, null, 'random');

    hideLoadingOverlay();
}

function getRandomImageUrl() {
    if (michiImages.length === 0) return null;
    return michiImages[Math.floor(Math.random() * michiImages.length)];
}

// Function to toggle the flyout (open or close)
function toggleMichiFlyout(event, button) {
    if (flyoutContainer) {
        closeFlyout();
    } else {
        openMichiFlyout(event, button);
    }
}

// Function to close the flyout
function closeFlyout() {
    if (flyoutContainer) {
        flyoutContainer.remove();
        flyoutContainer = null;
        flyoutToolbar = null;
        document.removeEventListener("click", closeFlyoutOnOutsideClick);
        window.removeEventListener("scroll", updateFlyoutPosition, true);
        window.removeEventListener("resize", updateFlyoutPosition);
        // Remove spacer padding
        const spacer = document.getElementById('michi-flyout-spacer');
        if (spacer) spacer.remove();
    }
}

// Reposition flyout to stay aligned with its toolbar
function updateFlyoutPosition() {
    if (!flyoutContainer || !flyoutToolbar) return;
    const rect = flyoutToolbar.getBoundingClientRect();
    const availableHeight = window.innerHeight - rect.bottom - 20;
    const flyoutHeight = Math.max(200, Math.min(availableHeight, 500));
    flyoutContainer.style.left = `${rect.left}px`;
    flyoutContainer.style.top = `${rect.bottom}px`;
    flyoutContainer.style.width = `${rect.width}px`;
    flyoutContainer.style.height = `${flyoutHeight}px`;
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getTweetContext() {
    const composers = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
    for (const composer of composers) {
        const container = composer.closest('[data-testid="cellInnerDiv"]') || composer.closest('div[class]');
        if (container) {
            const tweetTexts = container.querySelectorAll('[data-testid="tweetText"]');
            if (tweetTexts.length > 0) {
                return tweetTexts[tweetTexts.length - 1].textContent?.trim().substring(0, 200) || '';
            }
        }
    }
    const mainTweet = document.querySelector('article [data-testid="tweetText"]');
    if (mainTweet) return mainTweet.textContent?.trim().substring(0, 200) || '';
    return '';
}

function getTweetImages() {
    // Find images in the tweet being replied to (or the main tweet on a tweet page)
    const composers = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
    for (const composer of composers) {
        const container = composer.closest('[data-testid="cellInnerDiv"]') || composer.closest('div[class]');
        if (container) {
            // Look for tweet images in the same container (the tweet being replied to)
            const imgs = container.querySelectorAll('img[src*="pbs.twimg.com/media"]');
            if (imgs.length > 0) return [...imgs].map(img => img.src);
        }
    }
    // Fall back to main tweet article images
    const article = document.querySelector('article [data-testid="tweetPhoto"] img');
    if (article) return [article.src];
    return [];
}

function generateCaption() {
    const captions = [
        'gmichi',
        'gmichi fam',
        'wagmichi',
        'wagmichi fam',
        "let's michi",
        'michi is michi',
        'check out $michi',
        '$michi',
        'michi still standing',
    ];
    return captions[Math.floor(Math.random() * captions.length)];
}

// Function to create and open the flyout
function openMichiFlyout(event, button) {
    const toolbar = button.closest('[data-testid="toolBar"]');
    if (!toolbar) {
        return;
    }

    flyoutToolbar = toolbar;
    const toolbarRect = toolbar.getBoundingClientRect();

    loadedCount = 0;

    flyoutContainer = document.createElement("div");
    flyoutContainer.id = "michi-flyout";
    const availableHeight = window.innerHeight - toolbarRect.bottom - 20;
    const flyoutHeight = Math.max(200, Math.min(availableHeight, 500));

    flyoutContainer.style.position = "fixed";
    flyoutContainer.style.width = `${toolbarRect.width}px`;
    flyoutContainer.style.height = `${flyoutHeight}px`;
    flyoutContainer.style.background = getComputedStyle(document.body).backgroundColor;
    flyoutContainer.style.borderLeft = "1px solid rgb(47, 51, 54)";
    flyoutContainer.style.borderRight = "1px solid rgb(47, 51, 54)";
    flyoutContainer.style.borderBottom = "1px solid rgb(47, 51, 54)";
    flyoutContainer.style.borderRadius = "0 0 10px 10px"; // Rounded only at bottom
    flyoutContainer.style.zIndex = "10000";
    flyoutContainer.style.left = `${toolbarRect.left}px`;
    flyoutContainer.style.top = `${toolbarRect.bottom}px`;
    flyoutContainer.style.display = "flex";
    flyoutContainer.style.flexDirection = "column";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.flexDirection = "column";
    header.style.padding = "8px";
    header.style.borderBottom = "1px solid rgb(47, 51, 54)";
    header.style.background = getComputedStyle(document.body).backgroundColor;

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "space-around";

    const iconBtnStyle = `background:none;border:1px solid rgb(47,51,54);color:#e7e9ea;border-radius:20px;padding:4px 8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background 0.15s,border-color 0.15s,color 0.15s;`;

    function makeIconBtn(svgHtml, tooltip, onClick) {
        const btn = document.createElement("button");
        btn.innerHTML = svgHtml;
        btn.setAttribute('data-tooltip', tooltip);
        btn.style.cssText = iconBtnStyle;
        btn.addEventListener("mouseenter", () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
        btn.addEventListener("mouseleave", () => { btn.style.background = 'none'; btn.style.borderColor = 'rgb(47,51,54)'; btn.style.color = '#e7e9ea'; });
        btn.addEventListener("click", onClick);
        return btn;
    }

    const allBtn = makeIconBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
        "All memes",
        () => { loadedCount = 0; currentSearchQuery = ""; loadMichiImages("all", true); }
    );

    const randomBtn = makeIconBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>`,
        "Random meme — picks and sends one instantly",
        async () => {
            if (michiImages.length === 0) { console.error("No Michi images available."); return; }
            currentSearchQuery = "";
            const memeUrl = await quickContextMeme(getTweetContext());
            uploadImageToTweet(memeUrl, null, 'random');
            closeFlyout();
        }
    );

    const favBtn = makeIconBtn(
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        "Favorites — your saved memes",
        async () => {
            currentSearchQuery = "";
            const imageGrid = document.getElementById("michi-grid");
            if (!imageGrid) return;
            imageGrid.innerHTML = "";
            const favorites = await getFavorites();
            if (favorites.length === 0) { showSearchError("No favorites yet. Click the star on any meme to save it."); return; }
            favorites.forEach(url => {
                const thumb = createMemeThumb(url, url, 'admin.gmichi.meme', favorites);
                imageGrid.appendChild(thumb);
            });
        }
    );

    const gearBtn = document.createElement("button");
    gearBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    gearBtn.setAttribute('data-tooltip', 'Settings');
    gearBtn.style.cssText = iconBtnStyle;
    gearBtn.addEventListener("mouseenter", () => { gearBtn.style.background = 'rgba(255,255,255,0.1)'; });
    gearBtn.addEventListener("mouseleave", () => { gearBtn.style.background = 'none'; gearBtn.style.borderColor = 'rgb(47,51,54)'; gearBtn.style.color = '#e7e9ea'; });
    gearBtn.onclick = () => {
        // Close template panel if open
        if (templatePanelVisible) {
            templatePanelVisible = false;
            templatesBtn.style.borderColor = 'rgb(47,51,54)';
            templatesBtn.style.color = '#e7e9ea';
            const tp = flyoutContainer?.querySelector('#michi-template-panel');
            if (tp) tp.style.display = 'none';
            imageContainer.style.display = '';
        }
        // Close editor panel if open
        const ep = flyoutContainer?.querySelector('#michi-editor-panel');
        if (ep) { ep.style.display = 'none'; imageContainer.style.display = ''; }

        const imageGrid = document.getElementById("michi-grid");
        const settingsPanel = document.getElementById("michi-settings");
        if (settingsPanel) {
            settingsPanel.remove();
            imageGrid.style.display = "";
        } else {
            imageGrid.style.display = "none";
            const panel = document.createElement("div");
            panel.id = "michi-settings";
            panel.style.cssText = `
                padding: 16px;
                font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                color: ${getComputedStyle(document.body).color};
                font-size: 14px;
            `;

            const makeToggle = (label, key, currentValue) => {
                const row = document.createElement("div");
                row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgb(47, 51, 54);";

                const labelEl = document.createElement("span");
                labelEl.textContent = label;

                const toggle = document.createElement("input");
                toggle.type = "checkbox";
                toggle.checked = currentValue;
                toggle.style.cssText = "width: 18px; height: 18px; cursor: pointer;";
                toggle.addEventListener("change", () => {
                    chrome.storage.sync.set({ [key]: toggle.checked });
                    if (key === 'soundEnabled') soundEnabled = toggle.checked;
                    if (key === 'replaceLikeEnabled') {
                        likeReplacementEnabled = toggle.checked;
                        if (toggle.checked) replaceLikeButtons();
                        else restoreOriginalLikeButtons();
                    }
                    if (key === 'quickFireEnabled') {
                        quickFireEnabled = toggle.checked;
                        document.querySelectorAll('.gmichi-quickfire-wrapper, .gmichi-tweet-quickfire').forEach(el => {
                            el.style.display = toggle.checked ? "" : "none";
                        });
                    }
                    if (key === 'quickFireAutoPost') quickFireAutoPost = toggle.checked;
                    if (key === 'animatedProfilePicsEnabled') {
                        animatedProfilePicsEnabled = toggle.checked;
                        if (toggle.checked) fetchAndReplaceProfilePics();
                    }
                });

                row.appendChild(labelEl);
                row.appendChild(toggle);
                return row;
            };

            panel.appendChild(makeToggle("Show Quick Fire Button", "quickFireEnabled", quickFireEnabled));
            panel.appendChild(makeToggle("Quick Fire: Auto-post", "quickFireAutoPost", quickFireAutoPost));

            const textRow = document.createElement("div");
            textRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgb(47, 51, 54);";
            const textLabel = document.createElement("span");
            textLabel.textContent = "Quick Fire Text";
            const textInput = document.createElement("input");
            textInput.type = "text";
            textInput.value = quickFireText;
            textInput.style.cssText = `
                width: 120px; padding: 4px 8px; border: 1px solid rgb(47, 51, 54); border-radius: 4px;
                background: ${getComputedStyle(document.body).backgroundColor}; color: ${getComputedStyle(document.body).color};
                font-size: 13px; outline: none;
            `;
            textInput.addEventListener("input", () => {
                quickFireText = textInput.value;
                chrome.storage.sync.set({ quickFireText: textInput.value });
            });
            textRow.appendChild(textLabel);
            textRow.appendChild(textInput);
            panel.appendChild(textRow);

            panel.appendChild(makeToggle("Sound Effects", "soundEnabled", soundEnabled));
            panel.appendChild(makeToggle("Michi Mode (replace hearts)", "replaceLikeEnabled", likeReplacementEnabled));
            panel.appendChild(makeToggle("Animated Profile Pics", "animatedProfilePicsEnabled", animatedProfilePicsEnabled));

            const hint = document.createElement("div");
            hint.style.cssText = "padding: 12px 0 4px; font-size: 12px; color: rgb(113, 118, 123); line-height: 1.4;";
            hint.innerHTML = "<b>Tip:</b> Shift+click the quick fire button to add ticker info ($MICHI + CA)";
            panel.appendChild(hint);

            imageGrid.parentNode.insertBefore(panel, imageGrid);
        }
    };

    // Add search input
    const searchContainer = document.createElement("div");
    searchContainer.style.marginBottom = "8px";
    searchContainer.style.display = "flex";
    searchContainer.style.alignItems = "center";
    searchContainer.style.gap = "4px";
    searchContainer.style.width = "100%";
    searchContainer.style.padding = "8px 12px";
    searchContainer.style.flexWrap = "wrap";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "search...";
    searchInput.style.cssText = `
        width: 120px;
        padding: 8px 12px;
        border: 2px solid rgb(29, 155, 240);
        border-radius: 8px;
        background: ${getComputedStyle(document.body).backgroundColor};
        color: ${getComputedStyle(document.body).color};
        font-size: 14px;
        outline: none;
        font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
    `;

    // Add grayer placeholder color
    searchInput.style.setProperty('--placeholder-color', '#999');
    searchInput.addEventListener('input', function () {
        this.style.setProperty('--placeholder-color', '#999');
    });

    // Add search functionality
    searchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim();

        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        // Set new timeout for debounced search
        searchTimeout = setTimeout(async () => {
            if (query.length >= 2) {
                isSearching = true;
                currentSearchPage = 1;
                currentSearchQuery = query;
                hasMoreSearchResults = true;

                const cached = _getCachedSearch(query);
                let result;
                if (cached) {
                    result = cached;
                } else {
                    result = await searchImages(query, 1);
                    if (result.images.length > 0) _setCachedSearch(query, result.images, result.pagination);
                }

                if (result.images.length === 0) {
                    showSearchError("No results found. Try a different search term.");
                } else {
                    showSearchResults(result.images);
                    hasMoreSearchResults = result.pagination ? result.pagination.hasNext : false;
                }

                isSearching = false;
            } else if (query.length === 0) {
                // Clear search and show all images
                currentSearchQuery = "";
                loadMichiImages("all", true);
            }
        }, 300);
    });

    const trendingBtn = document.createElement("button");
    trendingBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14 0-5.5 3-7 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.5-2.85 2.5-3.5z"/></svg>`;
    trendingBtn.setAttribute('data-tooltip', 'Trending');
    trendingBtn.style.cssText = iconBtnStyle;
    trendingBtn.addEventListener("mouseenter", () => { trendingBtn.style.background = 'rgba(255,255,255,0.1)'; });
    trendingBtn.addEventListener("mouseleave", () => { trendingBtn.style.background = 'none'; trendingBtn.style.borderColor = 'rgb(47,51,54)'; trendingBtn.style.color = '#e7e9ea'; });
    trendingBtn.addEventListener("click", async () => {
        const container = flyoutContainer.querySelector('.michi-image-container') || imageContainer;
        if (!container) return;
        container.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">Loading trending...</div>';
        const data = await fetchTrending(20);
        if (!data || !data.trending || !data.trending.length) {
            container.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">No trending data yet</div>';
            return;
        }
        container.innerHTML = '';
        const grid = document.createElement("div");
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:8px;padding:8px;';
        for (const meme of data.trending) {
            const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(meme.url);
            let el;
            if (isVid) {
                el = createVideoThumb(meme.url);
            } else {
                el = document.createElement("img");
                el.src = meme.url;
            }
            el.title = meme.title || '';
            el.style.cssText = 'width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;';
            el.addEventListener("click", () => { uploadImageToTweet(meme.url); closeFlyout(); });
            grid.appendChild(el);
        }
        container.appendChild(grid);
    });

    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(allBtn);
    searchContainer.appendChild(randomBtn);
    searchContainer.appendChild(favBtn);
    searchContainer.appendChild(trendingBtn);

    const seasonalTag = getSeasonalTag();
    if (seasonalTag) {
      const seasonalEmoji = { christmas: '🎄', halloween: '🎃', valentine: '💝', newyear: '🎆' };
      const seasonBtn = document.createElement("button");
      seasonBtn.textContent = seasonalEmoji[seasonalTag] || '🎉';
      seasonBtn.setAttribute('data-tooltip', `${seasonalTag}`);
      seasonBtn.style.cssText = iconBtnStyle + `font-size:13px;`;
      seasonBtn.addEventListener("click", async () => {
        searchInput.value = seasonalTag;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      searchContainer.appendChild(seasonBtn);
    }

    // Spacer pushes settings to the right
    const spacer = document.createElement("div");
    spacer.style.flex = "1";
    searchContainer.appendChild(spacer);
    header.appendChild(searchContainer);

    // Create image grid container (middle content, **scrollable**)
    const imageContainer = document.createElement("div");
    imageContainer.style.flex = "1";
    imageContainer.style.overflowY = "auto";
    imageContainer.style.padding = "10px";

    const imageGrid = document.createElement("div");
    imageGrid.id = "michi-grid";
    imageGrid.style.display = "grid";
    imageGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(100px, 1fr))";
    imageGrid.style.gap = "10px";

    imageContainer.appendChild(imageGrid);

    // Create footer (bottom div)
    const footer = document.createElement("div");
    footer.style.height = "20px";
    footer.style.background = getComputedStyle(document.body).backgroundColor;

    // Grab tweet image button — detects images in the tweet and opens meme maker
    const tweetImages = getTweetImages();
    const grabBtn = document.createElement("button");
    grabBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    grabBtn.setAttribute('data-tooltip', tweetImages.length ? 'Edit post image' : 'No image in post');
    grabBtn.style.cssText = iconBtnStyle;
    if (tweetImages.length === 0) {
        grabBtn.style.opacity = '0.3';
        grabBtn.style.cursor = 'default';
    }
    grabBtn.addEventListener("mouseenter", () => { if (tweetImages.length) grabBtn.style.background = 'rgba(255,255,255,0.1)'; });
    grabBtn.addEventListener("mouseleave", () => { grabBtn.style.background = 'none'; grabBtn.style.borderColor = 'rgb(47,51,54)'; grabBtn.style.color = '#e7e9ea'; });
    let editorPanelVisible = false;
    grabBtn.addEventListener("click", () => {
        if (tweetImages.length === 0) return;
        editorPanelVisible = !editorPanelVisible;
        grabBtn.style.borderColor = editorPanelVisible ? '#f7b731' : 'rgb(47,51,54)';
        grabBtn.style.color = editorPanelVisible ? '#f7b731' : '#e7e9ea';
        if (editorPanelVisible) {
            imageContainer.style.display = 'none';
            let existingPanel = flyoutContainer.querySelector('#michi-editor-panel');
            if (!existingPanel) {
                const imgUrl = tweetImages[0].replace(/&name=\w+$/, '&name=large');
                existingPanel = createEditorPanel(imgUrl, async (blobUrl) => {
                    try {
                        showLoadingOverlay();
                        const resp = await fetch(blobUrl);
                        const blob = await resp.blob();
                        const file = new File([blob], 'michi-edit.png', { type: 'image/png' });
                        const targetToolbar = flyoutToolbar;
                        closeFlyout();
                        if (!targetToolbar) return;
                        const fileInput = targetToolbar.querySelector('input[data-testid="fileInput"]');
                        if (!fileInput) return;
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        fileInput.files = dt.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        // Don't count as blast yet — user still needs to hit Post
                    } catch (err) {
                        console.error('[editor] Upload error:', err);
                    } finally {
                        hideLoadingOverlay();
                        URL.revokeObjectURL(blobUrl);
                    }
                });
                flyoutContainer.insertBefore(existingPanel, footer);
            }
            existingPanel.style.display = 'flex';
        } else {
            imageContainer.style.display = '';
            const existingPanel = flyoutContainer.querySelector('#michi-editor-panel');
            if (existingPanel) existingPanel.style.display = 'none';
        }
    });
    searchContainer.appendChild(grabBtn);

    // Caption button
    const captionBtn = document.createElement("button");
    captionBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    captionBtn.setAttribute('data-tooltip', 'Caption');
    captionBtn.style.cssText = iconBtnStyle;
    captionBtn.addEventListener("mouseenter", () => { captionBtn.style.background = 'rgba(255,255,255,0.1)'; });
    captionBtn.addEventListener("mouseleave", () => { captionBtn.style.background = 'none'; captionBtn.style.borderColor = 'rgb(47,51,54)'; captionBtn.style.color = '#e7e9ea'; });
    captionBtn.addEventListener("click", async () => {
        const context = getTweetContext();
        const caption = generateCaption();
        insertTextInTweetInput(caption + " ");
    });
    searchContainer.appendChild(captionBtn);

    // Templates button — opens template editor tab
    const templatesBtn = document.createElement("button");
    templatesBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 21 4.3-4.3"/><path d="M12 2a1 1 0 0 1 .96.73l2.02 7.27 7.27 2.02a1 1 0 0 1 0 1.96l-7.27 2.02-2.02 7.27a1 1 0 0 1-1.92 0L9.02 16l-7.27-2.02a1 1 0 0 1 0-1.96L9.02 9.98l2.02-7.25A1 1 0 0 1 12 2z"/></svg>`;
    templatesBtn.setAttribute('data-tooltip', 'Templates');
    templatesBtn.style.cssText = iconBtnStyle;
    let templatePanelVisible = false;
    templatesBtn.addEventListener("click", () => {
        // Close settings panel if open
        const sp = document.getElementById("michi-settings");
        if (sp) { sp.remove(); document.getElementById("michi-grid").style.display = ""; }
        // Close editor panel if open
        const ep = flyoutContainer?.querySelector('#michi-editor-panel');
        if (ep) { ep.style.display = 'none'; imageContainer.style.display = ''; }

        templatePanelVisible = !templatePanelVisible;
        templatesBtn.style.borderColor = templatePanelVisible ? '#f7b731' : 'rgb(47,51,54)';
        templatesBtn.style.color = templatePanelVisible ? '#f7b731' : '#e7e9ea';
        if (templatePanelVisible) {
            imageContainer.style.display = 'none';
            let existingPanel = flyoutContainer.querySelector('#michi-template-panel');
            if (!existingPanel) {
                existingPanel = createTemplateTab(flyoutContainer, async (blobUrl) => {
                    try {
                        showLoadingOverlay();
                        const resp = await fetch(blobUrl);
                        const blob = await resp.blob();
                        const file = new File([blob], 'michi-template.png', { type: blob.type || 'image/png' });
                        const targetToolbar = flyoutToolbar;
                        closeFlyout();
                        if (!targetToolbar) return;
                        const fileInput = targetToolbar.querySelector('input[data-testid="fileInput"]');
                        if (!fileInput) return;
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        fileInput.files = dt.files;
                        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                        // Don't count as blast yet — user still needs to hit Post
                    } catch (err) {
                        console.error('[templates] Upload error:', err);
                    } finally {
                        hideLoadingOverlay();
                        URL.revokeObjectURL(blobUrl);
                    }
                });
                flyoutContainer.insertBefore(existingPanel, footer);
            }
            existingPanel.style.display = 'flex';
        } else {
            imageContainer.style.display = '';
            const existingPanel = flyoutContainer.querySelector('#michi-template-panel');
            if (existingPanel) existingPanel.style.display = 'none';
        }
    });
    searchContainer.appendChild(templatesBtn);
    searchContainer.appendChild(gearBtn);

    // Append elements in correct order
    flyoutContainer.appendChild(header);
    flyoutContainer.appendChild(imageContainer);
    flyoutContainer.appendChild(footer);
    document.body.appendChild(flyoutContainer);

    // Add spacer to page so user can scroll down on short pages (e.g. single tweet view)
    // This gives the flyout more vertical room
    let flyoutSpacer = document.getElementById('michi-flyout-spacer');
    if (!flyoutSpacer) {
        flyoutSpacer = document.createElement('div');
        flyoutSpacer.id = 'michi-flyout-spacer';
        flyoutSpacer.style.cssText = 'height:520px;pointer-events:none;flex-shrink:0;';
        const primaryColumn = document.querySelector('[data-testid="primaryColumn"]');
        if (primaryColumn) {
            primaryColumn.appendChild(flyoutSpacer);
        } else {
            document.body.appendChild(flyoutSpacer);
        }
    }

    // If the flyout is too small, scroll down to give it room
    if (availableHeight < 350) {
        const scrollBy = 350 - availableHeight;
        setTimeout(() => {
            window.scrollBy({ top: scrollBy, behavior: 'smooth' });
        }, 50);
    }

    // Load first batch of images — context-aware if tweet content detected
    const tweetContext = getTweetContext();
    if (tweetContext && tweetContext.length > 5) {
        const cleanContext = tweetContext
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[@#$]\w+/g, '')
            .trim();
        if (cleanContext.length > 5) {
            // Show local images immediately, then swap in intelligent results
            loadMichiImages("all", true);
            searchInput.placeholder = `Suggested for: "${cleanContext.substring(0, 30)}..."`;
            const excludeEx = !contextMentionsExchange(tweetContext);
            // Use hover-preloaded result if context matches, otherwise fetch
            const preloaded = _preloadedContext?.context === cleanContext ? _preloadedContext.result : null;
            const searchPromise = preloaded instanceof Promise ? preloaded
                : preloaded ? Promise.resolve(preloaded)
                : searchImagesIntelligent(cleanContext, 20, excludeEx);
            searchPromise.then(result => {
                if (!flyoutContainer || result.images.length === 0) return;
                const container = flyoutContainer.querySelector('.michi-image-container') || imageContainer;
                container.innerHTML = '';
                const grid = document.createElement("div");
                grid.id = "michi-grid";
                grid.style.display = "grid";
                grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(100px, 1fr))";
                grid.style.gap = "10px";
                container.appendChild(grid);
                for (const meme of result.images) {
                    const src = meme.thumbnailUrl || meme.url;
                    const isVid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(meme.url) || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src);
                    let el;
                    if (isVid) {
                        el = createVideoThumb(src);
                    } else {
                        el = document.createElement("img");
                        el.src = src;
                    }
                    el.title = meme.title || '';
                    el.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;';
                    el.addEventListener("click", () => { uploadImageToTweet(meme.url); closeFlyout(); });
                    grid.appendChild(el);
                }
            }).catch(() => {});
        } else {
            loadMichiImages("all", true);
        }
    } else {
        loadMichiImages("all", true);
    }

    // Attach scroll event for lazy loading
    imageContainer.addEventListener("scroll", () => handleFlyoutScroll(imageContainer));

    // Focus search input on open
    setTimeout(() => searchInput.focus(), 50);

    // Re-add event listeners every time the flyout opens
    setTimeout(() => {
        document.addEventListener("click", closeFlyoutOnOutsideClick);
    }, 100);

    // Keep flyout position in sync on scroll/resize
    window.addEventListener("scroll", updateFlyoutPosition, { capture: true, passive: true });
    window.addEventListener("resize", updateFlyoutPosition);
}

// Function to load images in batches **with correct lazy loading**
async function loadMichiImages(mode, reset = false) {
    if (!flyoutContainer) return;
    const imageGrid = document.getElementById("michi-grid");
    if (!imageGrid) return;

    // Reset if needed (for "All" or "Random" button clicks)
    if (reset) {
        imageGrid.innerHTML = "";
        loadedCount = 0;
    }

    let imagesToLoad = michiImages;
    if (mode === "random") {
        imagesToLoad = shuffleArray(michiImages).slice(0, 4); // Get 4 random images
    } else {
        imagesToLoad = michiImages.slice(loadedCount, loadedCount + batchSize);
        loadedCount += batchSize;
    }


    const batch = imagesToLoad;
    const favorites = await getFavorites();
    batch.forEach(url => {
        const thumb = createMemeThumb(url, url, 'admin.gmichi.meme', favorites);
        imageGrid.appendChild(thumb);
    });
}

async function uploadImageToTweet(imageUrl, specialBadgeId, blastContext) {
    try {
        showLoadingOverlay();

        // Fetch via background service worker to bypass CORS
        const result = await chrome.runtime.sendMessage({ type: 'fetchImage', url: imageUrl });
        if (!result || !result.success) throw new Error(result?.error || "Failed to fetch media");

        // Determine MIME type from response header, fall back to URL-based detection
        const isVideo = isVideoUrl(imageUrl);
        let mimeType = result.contentType || '';
        if (!mimeType || mimeType === 'application/octet-stream') {
            if (isVideo) {
                if (imageUrl.endsWith('.mp4')) mimeType = 'video/mp4';
                else if (imageUrl.endsWith('.webm')) mimeType = 'video/webm';
                else if (imageUrl.endsWith('.mov')) mimeType = 'video/quicktime';
                else mimeType = 'video/mp4';
            } else {
                if (imageUrl.endsWith('.jpg') || imageUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
                else if (imageUrl.endsWith('.png')) mimeType = 'image/png';
                else if (imageUrl.endsWith('.gif')) mimeType = 'image/gif';
                else if (imageUrl.endsWith('.webp')) mimeType = 'image/webp';
                else mimeType = 'image/jpeg';
            }
        }

        const fileName = isVideo ? "michi.mp4" : "michi.jpg";
        const blob = new Blob([new Uint8Array(result.data)], { type: mimeType });
        const file = new File([blob], fileName, { type: mimeType });

        // Find the **correct file input** within the same toolbar as the clicked Michi button
        const toolbar = currentMichiButton.closest('[data-testid="ScrollSnap-List"]');
        if (!toolbar) {
            console.error("No toolbar found.");
            hideLoadingOverlay();
            return;
        }

        // Get the closest file input inside the toolbar
        const fileInput = toolbar.querySelector('input[data-testid="fileInput"]');
        if (!fileInput) {
            console.error("No file input found in the toolbar.");
            hideLoadingOverlay();
            return;
        }

        // Assign the file to the correct input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Dispatch the change event to trigger Twitter's upload process
        const event = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(event);

        // Play sound only if the setting is enabled
        if (soundEnabled) {
            playMichiSound();
        }

        // Mark tweet button so we count when the tweet is actually posted
        markTweetButtonAsBlaster(imageUrl, specialBadgeId, blastContext || 'flyout');

    } catch (error) {
        console.error("Error uploading media:", error);
    } finally {
        hideLoadingOverlay();
    }
}


function showLoadingOverlay() {
    const tweetBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!tweetBox) return;

    // Ensure the parent has relative positioning for proper overlay positioning
    const tweetContainer = tweetBox.closest('[role="textbox"]') || tweetBox.parentElement;
    if (!tweetContainer) return;
    tweetContainer.style.position = "relative";

    // Create overlay if it doesn't exist
    let overlay = document.getElementById("michi-loading-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "michi-loading-overlay";
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.background = "rgba(0,0,0,0.6)";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";
        overlay.style.borderRadius = "8px";
        overlay.style.zIndex = "10000";

        // Create spinner
        const spinner = document.createElement("div");
        spinner.style.border = "4px solid rgba(255,255,255,0.3)";
        spinner.style.borderTop = "4px solid #fff";
        spinner.style.borderRadius = "50%";
        spinner.style.width = "30px";
        spinner.style.height = "30px";
        spinner.style.animation = "michi-spin 1s linear infinite";

        // Add animation if not already added
        if (!document.getElementById("michi-spinner-style")) {
            const style = document.createElement("style");
            style.id = "michi-spinner-style";
            style.innerHTML = `
                @keyframes michi-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        overlay.appendChild(spinner);
        tweetContainer.appendChild(overlay);
    }
}

function hideLoadingOverlay() {
    setTimeout(() => {
        const overlay = document.getElementById("michi-loading-overlay");
        if (overlay) {
            overlay.remove();
        }
    }, 500);
}

// Function to insert text into tweet input
function insertTextInTweetInput(text) {
    const tweetInput = document.querySelector('[data-testid="tweetTextarea_0"]'); // Twitter's text input
    if (!tweetInput) {
        console.error("Tweet input not found!");
        return;
    }

    tweetInput.focus();
    document.execCommand("insertText", false, text);
}


// Handle scrolling inside flyout to load more images progressively
function handleFlyoutScroll(imageContainer) {
    if (imageContainer.scrollTop + imageContainer.clientHeight >= imageContainer.scrollHeight - 50) {
        if (currentSearchQuery && currentSearchQuery.length >= 2) {
            // Load more search results
            if (!isSearching && hasMoreSearchResults) {
                loadMoreSearchResults();
            }
        } else {
            // Load more local images
            loadMichiImages("all", false);
        }
    }
}

async function loadMoreSearchResults() {
    if (!currentSearchQuery || isSearching || !hasMoreSearchResults) return;

    isSearching = true;
    currentSearchPage++;

    const result = await searchImages(currentSearchQuery, currentSearchPage);

    if (result.images.length > 0) {
        const favorites = await getFavorites();
        const imageGrid = document.getElementById("michi-grid");
        if (imageGrid) {
            result.images.forEach(image => {
                const thumbUrl = image.thumbnailUrl + (image.thumbnailUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
                const thumb = createMemeThumb(image.url, thumbUrl, 'michi.meme', favorites);
                imageGrid.appendChild(thumb);
            });
        }
        hasMoreSearchResults = result.pagination ? result.pagination.hasNext : false;
    } else {
        hasMoreSearchResults = false;
    }

    isSearching = false;
}

function closeFlyoutOnOutsideClick(e) {
    if (
        flyoutContainer &&
        !flyoutContainer.contains(e.target) &&
        !e.target.closest(".gmichi-toolbar-button")
    ) {
        closeFlyout();
    }
}

// Function to add the Michi button
function addMichiButtonToAllToolbars() {
    const photoButtons = findAddPhotoButtons();

    // Helper: check if a ScrollSnap-List is inside a tweet compose toolbar
    function isComposeToolbar(toolbar) {
        // Must be inside a toolBar (tweet compose area)
        if (toolbar.closest('[data-testid="toolBar"]')) return true;
        // Or near a tweet textarea
        const parent = toolbar.closest('[role="dialog"]') || toolbar.closest('[data-testid="primaryColumn"]') || toolbar.parentElement?.parentElement?.parentElement;
        if (parent && parent.querySelector('[data-testid="tweetTextarea_0"]')) return true;
        return false;
    }

    if (photoButtons.length > 0) {
        // Found at least one image button → Place Michi button next to all of them
        photoButtons.forEach(photoButton => {
            const toolbar = photoButton.closest('[data-testid="ScrollSnap-List"]');
            if (!toolbar) return;

            if (!toolbar.querySelector('.gmichi-toolbar-button-wrapper')) {
                const michiWrapper = document.createElement("div");
                michiWrapper.setAttribute("role", "presentation");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper";
                michiWrapper.appendChild(createMichiButton());

                const quickFireWrapper = document.createElement("div");
                quickFireWrapper.setAttribute("role", "presentation");
                quickFireWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-quickfire-wrapper";
                quickFireWrapper.appendChild(createQuickFireButton());
                quickFireWrapper.style.display = quickFireEnabled ? "" : "none";

                toolbar.insertBefore(quickFireWrapper, toolbar.firstChild);
                toolbar.insertBefore(michiWrapper, toolbar.firstChild);
            }
        });
    } else {
        // Fallback: only inject into ScrollSnap-Lists that are inside compose toolbars
        document.querySelectorAll('[data-testid="ScrollSnap-List"]').forEach(toolbar => {
            if (!isComposeToolbar(toolbar)) return;
            if (!toolbar.querySelector(".gmichi-toolbar-button-wrapper")) {
                const michiWrapper = document.createElement("div");
                michiWrapper.setAttribute("role", "presentation");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper";
                michiWrapper.appendChild(createMichiButton());

                const quickFireWrapper = document.createElement("div");
                quickFireWrapper.setAttribute("role", "presentation");
                quickFireWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-quickfire-wrapper";
                quickFireWrapper.appendChild(createQuickFireButton());
                quickFireWrapper.style.display = quickFireEnabled ? "" : "none";

                toolbar.insertBefore(quickFireWrapper, toolbar.firstChild);
                toolbar.insertBefore(michiWrapper, toolbar.firstChild);
            }
        });
    }
}

// Add quick fire michi button to tweet action bars (next to reply)
function addQuickFireToTweetActions() {
    if (!quickFireEnabled) return;

    document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        if (tweet.querySelector('.gmichi-tweet-quickfire')) return;

        const replyBtn = tweet.querySelector('button[data-testid="reply"]');
        if (!replyBtn) return;

        const replyWrapper = replyBtn.parentElement;
        if (!replyWrapper || !replyWrapper.parentElement) return;

        const michiWrapper = document.createElement("div");
        michiWrapper.className = "gmichi-tweet-quickfire";
        michiWrapper.style.cssText = "display: flex; align-items: center; justify-content: flex-start; flex: 1 1 0%;";

        const btn = document.createElement("button");
        btn.setAttribute("role", "button");
        btn.setAttribute("aria-label", "Quick Fire Michi Reply");
        btn.className = "css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l";
        btn.type = "button";

        const inner = document.createElement("div");
        inner.setAttribute("dir", "ltr");
        inner.className = "css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q";
        inner.style.color = "rgb(113, 118, 123)";
        inner.innerHTML = `<div class="css-175oi2r r-xoduu5" style="position: relative; display: inline-flex; align-items: center; justify-content: center;">${michiSVGBase("#FFD700")}<span style="position: absolute; bottom: 0px; right: -6px; font-size: 10px; line-height: 1; pointer-events: none;">&#9889;</span></div>`;

        btn.appendChild(inner);

        btn.addEventListener("mouseenter", () => { inner.style.color = "#FFD700"; });
        btn.addEventListener("mouseleave", () => { inner.style.color = "rgb(113, 118, 123)"; });

        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (michiImages.length === 0) return;

            // Click the reply button to open reply modal
            replyBtn.click();

            // Wait for reply modal to appear
            let retries = 0;
            let tweetInput = null;
            while (retries < 20) {
                await new Promise(r => setTimeout(r, 200));
                tweetInput = document.querySelector('[data-testid="tweetTextarea_0"]');
                if (tweetInput) break;
                retries++;
            }
            if (!tweetInput) return;

            // Small delay to ensure modal is fully ready
            await new Promise(r => setTimeout(r, 300));

            // Insert text
            tweetInput.focus();
            const text = e.shiftKey
                ? "check out michi\n\n$MICHI\nCA: AywAYdNJnSLSXwKWYxDciPjqGRnwp4iZdQptuuQTpump "
                : quickFireText + " ";
            document.execCommand("insertText", false, text);

            await new Promise(r => setTimeout(r, 300));

            // Find file input in the modal's toolbar
            const modalToolbar = tweetInput.closest('[data-testid="toolBar"]')
                || document.querySelector('[data-testid="toolBar"]');
            const fileInput = modalToolbar
                ? modalToolbar.querySelector('input[data-testid="fileInput"]')
                : document.querySelector('input[data-testid="fileInput"]');

            if (fileInput) {
                // Try intelligent search based on the tweet being replied to
                const tweetEl = tweet.querySelector('[data-testid="tweetText"]');
                const tweetText = tweetEl?.textContent?.trim().substring(0, 200) || '';
                const memeUrl = await quickContextMeme(tweetText);

                // Fetch via background worker to bypass CORS
                const result = await chrome.runtime.sendMessage({ type: 'fetchImage', url: memeUrl });
                if (!result.success) return;

                const mimeType = result.contentType || 'image/jpeg';
                const ext = memeUrl.match(/\.(gif|mp4|webm|mov)/) ? memeUrl.split('.').pop() : 'jpg';
                const blob = new Blob([new Uint8Array(result.data)], { type: mimeType });
                const file = new File([blob], `michi.${ext}`, { type: mimeType });
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event("change", { bubbles: true }));

                // Mark tweet button for counting on actual post
                markTweetButtonAsBlaster(memeUrl, e.shiftKey ? 'shift_shiller' : 'first_quickfire', 'quickfire');
            }

            if (soundEnabled) playMichiSound();

            if (quickFireAutoPost) {
                await new Promise(r => setTimeout(r, 1000));
                const postBtn = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
                if (postBtn) postBtn.click();
            }
        });

        michiWrapper.appendChild(btn);
        replyWrapper.parentNode.insertBefore(michiWrapper, replyWrapper.nextSibling);
    });
}

const likeButtonPaths = {
    default: "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z",
    liked: "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" // Filled (liked) heart button
};

// to replace matching SVGs with Michi SVG
function replaceLikeButtons() {
    if (!likeReplacementEnabled) return;
    document.querySelectorAll('svg[viewBox="0 0 24 24"]').forEach(svg => {
        const path = svg.querySelector("path");
        if (!path) return;

        const dAttribute = path.getAttribute("d");
        const isFilled = dAttribute.includes(likeButtonPaths.liked); // Filled like button class

        // Detect the like button dynamically by checking common patterns in the path
        if (dAttribute.includes(likeButtonPaths.default) || dAttribute.includes(likeButtonPaths.liked)) {
            // Replace with Michi SVG (filled or unfilled)
            svg.innerHTML = michiSVGBase(isFilled ? "rgb(249, 24, 128)" : "none");
            svg.style.width = "22px";
            svg.style.height = "22px";
        }
    });
}

function restoreOriginalLikeButtons() {
    // Restore unliked buttons
    document.querySelectorAll('button[data-testid="like"] svg').forEach(svg => {
        svg.innerHTML = `
            <g>
                <path d="${likeButtonPaths.default}"></path>
            </g>
        `;
        svg.style.width = "22px";
        svg.style.height = "22px";
    });

    // Restore liked buttons
    document.querySelectorAll('button[data-testid="unlike"] svg').forEach(svg => {
        svg.innerHTML = `
            <g>
                <path d="${likeButtonPaths.liked}"></path>
            </g>
        `;
        svg.style.width = "22px";
        svg.style.height = "22px";
    });
}

// Attach event listener to close flyout when clicking outside
setTimeout(() => {
    document.addEventListener("click", closeFlyoutOnOutsideClick);
}, 100);


// --- Toast Notifications ---

function showBadgeToast(badge) {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 100000;
        background: #1a1a1a; border: 1px solid #333; border-radius: 12px;
        padding: 14px 18px; min-width: 260px; max-width: 320px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5); color: #FAECCF;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: michiToastIn 0.3s ease; cursor: pointer;
    `;

    // Stack multiple toasts
    const existing = document.querySelectorAll('.michi-badge-toast');
    toast.style.bottom = `${20 + existing.length * 90}px`;
    toast.className = 'michi-badge-toast';

    toast.innerHTML = `
        <div style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Achievement Unlocked!</div>
        <div style="font-size: 16px; font-weight: bold; color: #FFD700;">🏆 ${badge.name}</div>
        <button class="michi-toast-share" style="
            margin-top: 8px; padding: 4px 12px; background: #FAECCF; color: #1a1a1a;
            border: none; border-radius: 6px; font-size: 12px; font-weight: bold;
            cursor: pointer;
        ">Share</button>
    `;

    // Add animation keyframes if not already added
    if (!document.getElementById('michi-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'michi-toast-styles';
        style.textContent = `
            @keyframes michiToastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes michiToastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    const shareBtn = toast.querySelector('.michi-toast-share');
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        getStats().then(stats => {
            const tweetText = `I just earned the ${badge.name} badge on Michi Meme Blaster! ${stats.memeCount} memes posted. gmichi @maboroshitoken`;
            window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
        });
    });

    toast.addEventListener('click', () => dismissToast(toast));

    document.body.appendChild(toast);

    setTimeout(() => dismissToast(toast), 5000);
}

function dismissToast(toast) {
    if (!toast.parentNode) return;
    toast.style.animation = 'michiToastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// --- Sidebar Stats Card ---

async function injectSidebarCard() {
    if (sidebarCardInjected) return;

    const stats = await getStatsFromServer();
    if (!stats.sidebarStatsEnabled) return;

    const sidebar = document.querySelector('div[data-testid="sidebarColumn"]');
    if (!sidebar) return;

    // Don't inject twice
    if (sidebar.querySelector('.michi-sidebar-card')) return;

    // Find a native card (aside or section) inside the sidebar
    const firstAside = sidebar.querySelector('aside[aria-label], section[aria-label]');
    if (!firstAside) return;

    // Walk up from the aside to find the container div that holds all sidebar cards as siblings
    // The aside sits inside wrapper divs. We need the ancestor whose parent contains multiple card wrappers.
    let cardWrapper = firstAside;
    while (cardWrapper.parentElement && cardWrapper.parentElement !== sidebar) {
        const siblings = cardWrapper.parentElement.children;
        // If this level has multiple siblings, we found the card container level
        if (siblings.length > 1) break;
        cardWrapper = cardWrapper.parentElement;
    }

    const parent = cardWrapper.parentElement;
    if (!parent) return;

    const card = document.createElement("div");
    card.className = "michi-sidebar-card";
    card.style.cssText = `
        align-items: stretch; background-color: rgb(22, 24, 28);
        border: 1px solid rgb(47, 51, 54); border-radius: 16px;
        box-sizing: border-box; display: flex; flex-direction: column;
        flex-shrink: 0; margin: 0 0 16px; padding: 0; overflow: hidden;
        min-height: 0; min-width: 0; position: relative; z-index: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #e7e9ea;
    `;

    renderSidebarCard(card, stats);
    parent.insertBefore(card, cardWrapper);

    sidebarCardInjected = true;

    // Refresh community counter every 60 seconds
    setInterval(() => {
        fetchCommunityCounter().then(data => {
            if (data) {
                const counterEl = document.getElementById('michi-community-counter');
                const todayEl = document.getElementById('michi-community-today');
                if (counterEl) counterEl.textContent = data.total.toLocaleString();
                if (todayEl) todayEl.textContent = `${data.today.toLocaleString()} today`;
            }
        });
    }, 60000);
}

function renderSidebarCard(card, stats) {
    const nextMilestone = getNextMilestone(stats.memeCount);
    const prevMilestone = MILESTONES.filter(m => m <= stats.memeCount).pop() || 0;
    const progress = nextMilestone ? ((stats.memeCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 100;
    const nextBadge = nextMilestone ? BADGE_DEFINITIONS.find(b => b.id === `meme_${nextMilestone}`) || BADGE_DEFINITIONS.find(b => b.id === 'first_meme') : null;
    const todayCount = stats.dailyLog[getTodayISO()] || 0;

    const collapsed = stats.sidebarCardCollapsed;

    const badgeStar = (fill) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="${fill}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

    card.innerHTML = `
        <div class="michi-sidebar-header" style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 12px; cursor: pointer; user-select: none;
        ">
            <div style="display: flex; align-items: center; gap: 6px;">
                ${michiSVGBase('#FAECCF')}
                <span style="font-weight: 700; font-size: 13px;">Michi Blaster Stats</span>
            </div>
            <span class="michi-sidebar-chevron" style="font-size: 14px; color: #71767b; transition: transform 0.2s;">${collapsed ? '▸' : '▾'}</span>
        </div>
        <div class="michi-sidebar-body" style="
            padding: ${collapsed ? '0' : '0 12px 12px'};
            max-height: ${collapsed ? '0' : '500px'};
            overflow: hidden; transition: max-height 0.3s ease, padding 0.3s ease;
        ">
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-size: 28px; font-weight: 800; color: #FAECCF;">${stats.memeCount}</div>
                <div style="font-size: 11px; color: #71767b;">memes posted</div>
            </div>
            <div style="display: flex; justify-content: space-around; margin-bottom: 8px; text-align: center;">
                <div>
                    <div style="font-size: 16px; font-weight: 700;">${todayCount}</div>
                    <div style="font-size: 10px; color: #71767b;">Today</div>
                </div>
                <div>
                    <div style="font-size: 16px; font-weight: 700;">${stats.currentStreak}</div>
                    <div style="font-size: 10px; color: #71767b;">Streak</div>
                </div>
                <div>
                    <div style="font-size: 16px; font-weight: 700;">${stats.longestStreak}</div>
                    <div style="font-size: 10px; color: #71767b;">Best</div>
                </div>
            </div>
            ${nextMilestone ? `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 11px; color: #71767b; margin-bottom: 3px;">
                    <span>${stats.memeCount}/${nextMilestone}</span>
                    <span>${nextBadge ? nextBadge.name : ''}</span>
                </div>
                <div style="background: #2f3336; border-radius: 3px; height: 4px; overflow: hidden;">
                    <div style="background: #FAECCF; height: 100%; width: ${progress}%; border-radius: 3px; transition: width 0.3s;"></div>
                </div>
            </div>` : ''}
            <div class="michi-badge-row" style="display: flex; flex-wrap: wrap; gap: 4px;">
                ${BADGE_DEFINITIONS.map((b, i) => {
                    const earned = stats.badges.includes(b.id);
                    return `<div data-badge-idx="${i}" style="
                        width: 22px; height: 22px; border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        background: ${earned ? '#FFD700' : '#2f3336'}; cursor: pointer;
                        transition: transform 0.15s, box-shadow 0.15s;
                    ">${badgeStar(earned ? '#1a1a1a' : '#555')}</div>`;
                }).join('')}
            </div>
            <div class="michi-badge-detail" style="display: none; background: #1a1a1a; border: 1px solid #2f3336; border-radius: 6px; padding: 8px 10px; margin-top: 6px;"></div>
            <div class="michi-share-section" style="margin-top:8px;">
                <button class="michi-share-toggle-btn" style="
                    width:100%;padding:6px 0;border:1px solid rgb(47,51,54);
                    border-radius:8px;background:none;color:#e7e9ea;font-size:12px;
                    cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;
                    transition:background 0.15s;
                ">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
                    Share on Telegram
                    <span class="michi-share-arrow" style="font-size:16px;color:#71767b;margin-left:4px;">▾</span>
                </button>
                <div class="michi-share-options" style="display:none;margin-top:6px;padding:8px;border:1px solid rgb(47,51,54);border-radius:8px;background:rgb(32,35,39);">
                    <div style="font-size:10px;color:#71767b;margin-bottom:4px;">What to share</div>
                    <div style="display:flex;gap:4px;margin-bottom:6px;">
                        <button data-share-mode="all" class="michi-share-mode active" style="flex:1;padding:4px;border:1px solid rgb(47,51,54);border-radius:6px;background:rgba(250,236,207,0.15);color:#FAECCF;font-size:11px;cursor:pointer;">All</button>
                        <button data-share-mode="today" class="michi-share-mode" style="flex:1;padding:4px;border:1px solid rgb(47,51,54);border-radius:6px;background:none;color:#e7e9ea;font-size:11px;cursor:pointer;">Today</button>
                        <button data-share-mode="total" class="michi-share-mode" style="flex:1;padding:4px;border:1px solid rgb(47,51,54);border-radius:6px;background:none;color:#e7e9ea;font-size:11px;cursor:pointer;">Total</button>
                    </div>
                    <div style="font-size:10px;color:#71767b;margin-bottom:4px;">Style</div>
                    <div style="display:flex;gap:4px;margin-bottom:8px;">
                        <button data-share-tpl="sign" class="michi-share-tpl active" style="flex:1;padding:4px;border:1px solid rgb(47,51,54);border-radius:6px;background:rgba(250,236,207,0.15);color:#FAECCF;font-size:11px;cursor:pointer;">Sign</button>
                        <button data-share-tpl="lesson" class="michi-share-tpl" style="flex:1;padding:4px;border:1px solid rgb(47,51,54);border-radius:6px;background:none;color:#e7e9ea;font-size:11px;cursor:pointer;">Whiteboard</button>
                    </div>
                    <button class="michi-share-send-btn" style="
                        width:100%;padding:6px;border:none;border-radius:6px;
                        background:linear-gradient(135deg,#0088cc,#00a0e3);color:#fff;
                        font-size:12px;font-weight:600;cursor:pointer;
                    ">Send</button>
                    <div class="michi-share-status" style="font-size:11px;text-align:center;margin-top:4px;min-height:16px;"></div>
                </div>
            </div>
        </div>
    `;

    // Community counter section
    const cardBody = card.querySelector('.michi-sidebar-body');
    if (cardBody) {
        const communityDiv = document.createElement('div');
        communityDiv.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid rgb(47,51,54);text-align:center;';
        communityDiv.innerHTML = `
          <div style="font-size:11px;color:rgb(113,118,123);margin-bottom:2px;">Community Blasts</div>
          <div id="michi-community-counter" style="font-size:18px;font-weight:700;color:#f7b731;">...</div>
          <div id="michi-community-today" style="font-size:10px;color:rgb(113,118,123);"></div>
        `;
        cardBody.appendChild(communityDiv);

        // Fetch and update
        fetchCommunityCounter().then(data => {
            if (data) {
                const counterEl = document.getElementById('michi-community-counter');
                const todayEl = document.getElementById('michi-community-today');
                if (counterEl) counterEl.textContent = data.total.toLocaleString();
                if (todayEl) todayEl.textContent = `${data.today.toLocaleString()} today`;
            }
        });
    }

    // Toggle collapse
    const header = card.querySelector('.michi-sidebar-header');
    header.addEventListener('click', async () => {
        const newState = !stats.sidebarCardCollapsed;
        stats.sidebarCardCollapsed = newState;
        chrome.storage.sync.set({ sidebarCardCollapsed: newState });
        renderSidebarCard(card, stats);
    });

    // Badge click-to-explain
    const badgeDetail = card.querySelector('.michi-badge-detail');
    let selectedSidebarBadge = null;
    card.querySelectorAll('[data-badge-idx]').forEach(el => {
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = selectedSidebarBadge === el ? 'scale(1.2)' : 'scale(1)'; });
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(el.dataset.badgeIdx);
            const badge = BADGE_DEFINITIONS[idx];
            const earned = stats.badges.includes(badge.id);

            if (selectedSidebarBadge === el) {
                badgeDetail.style.display = 'none';
                el.style.boxShadow = 'none';
                el.style.transform = 'scale(1)';
                selectedSidebarBadge = null;
                return;
            }
            if (selectedSidebarBadge) {
                selectedSidebarBadge.style.boxShadow = 'none';
                selectedSidebarBadge.style.transform = 'scale(1)';
            }
            selectedSidebarBadge = el;
            el.style.boxShadow = '0 0 0 2px #FAECCF';
            el.style.transform = 'scale(1.2)';
            badgeDetail.style.display = 'block';
            badgeDetail.innerHTML = `
                <div style="font-size: 12px; font-weight: 700; color: ${earned ? '#FFD700' : '#e7e9ea'};">${badge.name}</div>
                <div style="font-size: 11px; color: #71767b;">${badge.desc}</div>
                <div style="font-size: 10px; margin-top: 3px; font-weight: 600; color: ${earned ? '#4ade80' : '#71767b'};">${earned ? 'Unlocked!' : 'Locked'}</div>
            `;
        });
    });

    // Share on Telegram — toggle options panel
    const shareToggle = card.querySelector('.michi-share-toggle-btn');
    const shareOptions = card.querySelector('.michi-share-options');
    if (shareToggle && shareOptions) {
        shareToggle.addEventListener('mouseenter', () => { shareToggle.style.background = 'rgba(255,255,255,0.1)'; });
        shareToggle.addEventListener('mouseleave', () => { shareToggle.style.background = 'none'; });
        shareToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            shareOptions.style.display = shareOptions.style.display === 'none' ? 'block' : 'none';
        });

        // Mode buttons
        let selectedMode = 'all';
        card.querySelectorAll('.michi-share-mode').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedMode = btn.dataset.shareMode;
                card.querySelectorAll('.michi-share-mode').forEach(b => {
                    b.style.background = 'none'; b.style.color = '#e7e9ea';
                });
                btn.style.background = 'rgba(250,236,207,0.15)'; btn.style.color = '#FAECCF';
            });
        });

        // Template buttons
        let selectedTpl = 'sign';
        card.querySelectorAll('.michi-share-tpl').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedTpl = btn.dataset.shareTpl;
                card.querySelectorAll('.michi-share-tpl').forEach(b => {
                    b.style.background = 'none'; b.style.color = '#e7e9ea';
                });
                btn.style.background = 'rgba(250,236,207,0.15)'; btn.style.color = '#FAECCF';
            });
        });

        // Send button
        const sendBtn = card.querySelector('.michi-share-send-btn');
        const statusEl = card.querySelector('.michi-share-status');
        if (sendBtn) {
            sendBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const handle = getLoggedInHandle();
                if (!handle) {
                    statusEl.innerHTML = '<span style="color:#f87171;">Could not detect handle</span>';
                    return;
                }

                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending...';
                statusEl.textContent = '';

                try {
                    const res = await fetch('https://michi.meme/api/blaster/share', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ handle, mode: selectedMode, template: selectedTpl }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Share failed');
                    statusEl.innerHTML = '<span style="color:#4ade80;">Sent!</span>';
                    setTimeout(() => { shareOptions.style.display = 'none'; statusEl.textContent = ''; }, 2000);
                } catch (err) {
                    statusEl.innerHTML = `<span style="color:#f87171;">${err.message || 'Failed'}</span>`;
                }

                sendBtn.disabled = false;
                sendBtn.textContent = 'Send';
            });
        }
    }
}

async function updateSidebarCard() {
    const card = document.querySelector('.michi-sidebar-card');
    if (!card) return;
    const stats = await getStatsFromServer();
    renderSidebarCard(card, stats);
}

// --- Tooltip styles ---
if (!document.getElementById('michi-tooltip-styles')) {
    const tooltipStyle = document.createElement('style');
    tooltipStyle.id = 'michi-tooltip-styles';
    tooltipStyle.textContent = `
        [data-tooltip] { position: relative; }
        [data-tooltip]:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a1a;
            color: #e7e9ea;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 99999;
            pointer-events: none;
            border: 1px solid rgb(47,51,54);
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            animation: michiTooltipIn 0.1s ease;
        }
        @keyframes michiTooltipIn { from { opacity: 0; transform: translateX(-50%) translateY(4px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
    `;
    document.head.appendChild(tooltipStyle);
}

// --- Initialize ---

// --- Bottom Bar Michi Button ---

let michiFloatingBtnInjected = false;
function injectFloatingMichiButton() {
    if (michiFloatingBtnInjected || document.getElementById('michi-floating-btn')) return;

    const btn = document.createElement('div');
    btn.id = 'michi-floating-btn';
    btn.title = 'Michi Blaster Stats';
    btn.style.cssText = `
        position: fixed; bottom: 147px; right: 20px; z-index: 9999;
        width: 55px; height: 55px; max-width: 55px;
        border-radius: 16px;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(12px);
        border: 1px solid rgb(75, 78, 82);
        box-shadow: rgba(255, 255, 255, 0.2) 0px 0px 15px, rgba(255, 255, 255, 0.15) 0px 0px 3px 1px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease;
        color: #e7e9ea;
        pointer-events: auto;
        align-self: flex-end;
    `;
    btn.innerHTML = michiSVGBase('none');

    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
    });

    let popup = null;

    btn.addEventListener('click', async (e) => {
        e.stopPropagation();

        if (popup && popup.parentNode) {
            popup.remove();
            popup = null;
            return;
        }

        popup = document.createElement('div');
        popup.id = 'michi-floating-popup';
        popup.style.cssText = `
            position: fixed; bottom: 186px; right: 16px; width: 320px;
            background: rgb(22, 24, 28); border: 1px solid rgb(47, 51, 54);
            border-radius: 16px; z-index: 10000; overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #e7e9ea; max-height: 500px; overflow-y: auto;
        `;

        const closeBtn = document.createElement('div');
        closeBtn.style.cssText = `
            position: sticky; top: 0; text-align: right; padding: 6px 10px 0 0;
            cursor: pointer; color: #71767b; font-size: 18px; z-index: 1;
        `;
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            popup.remove();
            popup = null;
        });
        popup.appendChild(closeBtn);

        const stats = await getStatsFromServer();
        renderSidebarCard(popup, stats);

        document.body.appendChild(popup);

        const outsideHandler = (ev) => {
            if (popup && !popup.contains(ev.target) && !btn.contains(ev.target)) {
                popup.remove();
                popup = null;
                document.removeEventListener('click', outsideHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', outsideHandler), 100);
    });

    document.body.appendChild(btn);
    michiFloatingBtnInjected = true;
}

// --- Ad replacement ---
const AD_STICKERS = [
    'michi_normal.png', 'smug.png', 'side-eye.png', 'troll.png',
    'grumpy.png', 'laughing.png', 'rofl.png', 'neutral.png',
];

function replaceAdsWithMichiBanner() {
    // Ads have impression-tracking pixel divs that normal tweets don't
    const adCells = document.querySelectorAll(
        '[data-testid="cellInnerDiv"]:has([data-testid="top-impression-pixel"]):not([data-michi-ad-replaced])'
    );
    adCells.forEach(cell => {
        cell.setAttribute('data-michi-ad-replaced', 'true');
        const inner = cell.firstElementChild;
        if (inner) inner.style.display = 'none';

        const stickerFile = AD_STICKERS[Math.floor(Math.random() * AD_STICKERS.length)];
        const stickerUrl = chrome.runtime.getURL(`stickers/${stickerFile}`);
        const banner = document.createElement('div');
        banner.style.cssText = `
            display: flex;
            align-items: center;
            gap: 10px;
            height: 50px;
            padding: 0 16px;
            border-top: 1px solid rgb(47,51,54);
            border-bottom: 1px solid rgb(47,51,54);
            color: rgb(113, 118, 123);
            font-size: 13px;
        `;
        banner.innerHTML = `
            <img src="${stickerUrl}" style="height: 36px; width: 36px; object-fit: contain;" />
            <span>michi removed this ad for you</span>
        `;
        cell.appendChild(banner);
    });
}

// Run on page load and observe for changes
addMichiButtonToAllToolbars();
addQuickFireToTweetActions();
replaceLikeButtons();
injectSidebarCard();
injectFloatingMichiButton();
replaceAdsWithMichiBanner();

const observer = new MutationObserver(() => {
    // Extension was reloaded/updated — stop the observer gracefully
    if (!chrome.runtime?.id) {
        observer.disconnect();
        return;
    }
    try {
        addMichiButtonToAllToolbars();
        addQuickFireToTweetActions();
        if (animatedProfilePicsEnabled) replaceProfilePics();
        replaceAdsWithMichiBanner();
        if (likeReplacementEnabled) {
            replaceLikeButtons();
        }
        if (!sidebarCardInjected) {
            injectSidebarCard();
        }
    } catch (e) {
        if (e?.message?.includes('Extension context invalidated')) {
            observer.disconnect();
        }
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Re-apply profile pic replacements on X SPA navigation
let lastPathname = window.location.pathname;
const navInterval = setInterval(() => {
    if (!chrome.runtime?.id) {
        clearInterval(navInterval);
        return;
    }
    if (window.location.pathname !== lastPathname) {
        lastPathname = window.location.pathname;
        if (animatedProfilePicsEnabled) replaceProfilePics();
    }
}, 1000);

console.info(`michi meme blaster ${version} active!`);