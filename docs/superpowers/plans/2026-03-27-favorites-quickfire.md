# Favorites + Quick Fire Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add favorites (star/save memes) and a quick fire button (one-click random meme post with optional auto-post) to the Michi Meme Blaster Chrome extension, plus a settings tab in the flyout.

**Architecture:** Favorites stored in `chrome.storage.sync` as URL array. Quick fire button is a second toolbar button with distinct styling. Settings panel replaces the image grid in the flyout when gear icon is clicked. All settings synced via `chrome.storage.sync` and communicated to content script via `chrome.runtime.onMessage`.

**Tech Stack:** Vanilla JS, Chrome Extensions MV3, Chrome Storage API

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `content.js` | Modify | Add quick fire button, favorites tab, settings panel, star overlay on meme thumbnails |
| `popup.js` | Modify | Add favorites tab, star overlay on meme thumbnails, settings in popup |
| `popup.html` | Modify | Add favorites button, settings section in footer |
| `utils.js` | Modify | Add shared favorites helper functions (get/set/toggle) |
| `manifest.json` | Modify | Bump version to 2.2.0 |

---

### Task 1: Favorites Storage Helpers in utils.js

**Files:**
- Modify: `utils.js`

- [ ] **Step 1: Add favorites helper functions to utils.js**

Add these functions after the existing `createDebouncedSearch` function, before the `module.exports` block:

```javascript
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
```

Update the `module.exports` line:

```javascript
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchImages, createDebouncedSearch, getFavorites, toggleFavorite, isFavorite };
}
```

- [ ] **Step 2: Commit**

```bash
git add utils.js
git commit -m "feat: add favorites storage helpers to utils.js"
```

---

### Task 2: Star Overlay on Flyout Meme Thumbnails (content.js)

**Files:**
- Modify: `content.js`

This task adds a star icon to every meme thumbnail in the flyout. Clicking the star toggles the meme as a favorite. The star is visually an overlay in the top-right corner of each image.

- [ ] **Step 1: Add a helper function to create a meme image element with star overlay**

Add this function after the `showSearchError` function (around line 248). This replaces the inline image creation scattered across `loadMichiImages`, `showSearchResults`, and `loadMoreSearchResults`.

```javascript
// Create a meme thumbnail with favorite star overlay for the flyout
function createMemeThumb(imageUrl, thumbnailUrl, sourceType, favorites) {
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";
    wrapper.style.borderRadius = "5px";
    wrapper.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";

    const img = document.createElement("img");
    img.style.width = "100%";
    img.style.height = "100px";
    img.style.objectFit = "cover";
    img.style.cursor = "pointer";
    img.style.display = "block";
    img.addEventListener("click", () => {
        uploadImageToTweet(imageUrl, sourceType);
        closeFlyout();
    });
    img.src = thumbnailUrl;

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

    wrapper.appendChild(img);
    wrapper.appendChild(star);
    return wrapper;
}
```

- [ ] **Step 2: Refactor `loadMichiImages` to use `createMemeThumb`**

Replace the image creation loop inside `loadMichiImages` (the `batch.forEach(url => { ... })` block, lines ~625-641) with:

```javascript
    const favorites = await getFavorites();
    batch.forEach(url => {
        const thumb = createMemeThumb(url, url, 'admin.gmichi.meme', favorites);
        imageGrid.appendChild(thumb);
    });
```

Also make `loadMichiImages` async by changing its signature to:

```javascript
async function loadMichiImages(mode, reset = false) {
```

- [ ] **Step 3: Refactor `showSearchResults` to use `createMemeThumb`**

Replace the body of `showSearchResults` with:

```javascript
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
```

- [ ] **Step 4: Refactor `loadMoreSearchResults` to use `createMemeThumb`**

Replace the image creation loop inside `loadMoreSearchResults` (the `result.images.forEach(image => { ... })` block) with:

```javascript
        const favorites = await getFavorites();
        if (imageGrid) {
            result.images.forEach(image => {
                const thumbUrl = image.thumbnailUrl + (image.thumbnailUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
                const thumb = createMemeThumb(image.url, thumbUrl, 'michi.meme', favorites);
                imageGrid.appendChild(thumb);
            });
        }
```

- [ ] **Step 5: Test manually**

1. Reload the extension in chrome://extensions
2. Open X, click the Michi button to open flyout
3. Verify star icons appear on every thumbnail (top-right corner)
4. Click a star — it should toggle between filled (gold) and outline (white)
5. Close and reopen flyout — starred memes should stay starred

- [ ] **Step 6: Commit**

```bash
git add content.js
git commit -m "feat: add favorite star overlay to flyout meme thumbnails"
```

---

### Task 3: Favorites Tab in Flyout

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add "Favorites" button to the flyout header**

In `openMichiFlyout`, after the `addTextBtn` creation (around line 488), add:

```javascript
    const favBtn = document.createElement("button");
    favBtn.textContent = "Favs";
    favBtn.style.cssText = buttonStyle;
    favBtn.onclick = async () => {
        currentSearchQuery = "";
        const imageGrid = document.getElementById("michi-grid");
        if (!imageGrid) return;
        imageGrid.innerHTML = "";

        const favorites = await getFavorites();
        if (favorites.length === 0) {
            showSearchError("No favorites yet. Click the star on any meme to save it.");
            return;
        }
        favorites.forEach(url => {
            const thumb = createMemeThumb(url, url, 'admin.gmichi.meme', favorites);
            imageGrid.appendChild(thumb);
        });
    };
```

- [ ] **Step 2: Add favBtn to the searchContainer**

Find where buttons are appended to `searchContainer` (around line 556-559):

```javascript
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(allBtn);
    searchContainer.appendChild(randomBtn);
    searchContainer.appendChild(addTextBtn);
```

Change to:

```javascript
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(allBtn);
    searchContainer.appendChild(randomBtn);
    searchContainer.appendChild(favBtn);
    searchContainer.appendChild(addTextBtn);
```

- [ ] **Step 3: Test manually**

1. Reload extension, open flyout
2. Click "Favs" — should show "No favorites yet" message
3. Go to "All", star a few memes
4. Click "Favs" — should show only starred memes
5. Unstar a meme from Favs view — star should toggle

- [ ] **Step 4: Commit**

```bash
git add content.js
git commit -m "feat: add favorites tab to flyout"
```

---

### Task 4: Settings Panel in Flyout

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Add `quickFireAutoPost` global variable**

At the top of `content.js`, after `let soundEnabled = false;` (line 9), add:

```javascript
let quickFireAutoPost = false;
```

Also update the storage load (around line 251) to include the new key:

```javascript
chrome.storage.sync.get(["replaceLikeEnabled", "soundEnabled", "quickFireAutoPost"], (data) => {
    likeReplacementEnabled = data.replaceLikeEnabled ?? true;
    soundEnabled = data.soundEnabled ?? false;
    quickFireAutoPost = data.quickFireAutoPost ?? false;

    if (likeReplacementEnabled) {
        replaceLikeButtons();
    }
});
```

And update the message listener (around line 261) to handle the new key:

```javascript
chrome.runtime.onMessage.addListener((message) => {
    if (message.replaceLikeEnabled !== undefined) {
        likeReplacementEnabled = message.replaceLikeEnabled;
        if (likeReplacementEnabled) {
            replaceLikeButtons();
        } else {
            restoreOriginalLikeButtons();
        }
    }
    if (message.soundEnabled !== undefined) {
        soundEnabled = message.soundEnabled;
    }
    if (message.quickFireAutoPost !== undefined) {
        quickFireAutoPost = message.quickFireAutoPost;
    }
});
```

- [ ] **Step 2: Add gear button and settings panel to flyout**

In `openMichiFlyout`, after the `favBtn` creation, add:

```javascript
    const gearBtn = document.createElement("button");
    gearBtn.textContent = "\u2699";
    gearBtn.style.cssText = buttonStyle;
    gearBtn.style.fontSize = "18px";
    gearBtn.onclick = () => {
        const imageGrid = document.getElementById("michi-grid");
        const settingsPanel = document.getElementById("michi-settings");
        if (settingsPanel) {
            // Toggle back to images
            settingsPanel.remove();
            imageGrid.style.display = "";
        } else {
            // Show settings
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
                    if (key === 'quickFireAutoPost') quickFireAutoPost = toggle.checked;
                });

                row.appendChild(labelEl);
                row.appendChild(toggle);
                return row;
            };

            panel.appendChild(makeToggle("Quick Fire: Auto-post", "quickFireAutoPost", quickFireAutoPost));
            panel.appendChild(makeToggle("Sound Effects", "soundEnabled", soundEnabled));
            panel.appendChild(makeToggle("Michi Mode (replace hearts)", "replaceLikeEnabled", likeReplacementEnabled));

            imageGrid.parentNode.insertBefore(panel, imageGrid);
        }
    };
```

- [ ] **Step 3: Add gearBtn to the searchContainer**

Update the searchContainer appends:

```javascript
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(allBtn);
    searchContainer.appendChild(randomBtn);
    searchContainer.appendChild(favBtn);
    searchContainer.appendChild(addTextBtn);
    searchContainer.appendChild(gearBtn);
```

- [ ] **Step 4: Test manually**

1. Reload extension, open flyout
2. Click gear icon — settings panel should replace image grid
3. Toggle each setting — verify it persists (close/reopen flyout)
4. Click gear again — image grid should return
5. Verify sound/michi mode changes take effect immediately

- [ ] **Step 5: Commit**

```bash
git add content.js
git commit -m "feat: add settings panel to flyout with gear toggle"
```

---

### Task 5: Quick Fire Button in Toolbar

**Files:**
- Modify: `content.js`

- [ ] **Step 1: Create the quick fire button function**

Add this function after `createMichiButton()` (after line 333):

```javascript
function createQuickFireButton() {
    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6";

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

    // Michi SVG with lightning bolt tint
    buttonInner.innerHTML = `
        <div style="position: relative; display: inline-block;">
            ${michiSVGBase("#FFD700")}
            <span style="position: absolute; bottom: -2px; right: -4px; font-size: 12px; line-height: 1;">&#9889;</span>
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
        const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
        await uploadImageToTweet(randomImage);

        if (quickFireAutoPost) {
            // Wait for the image to attach, then click the post button
            await new Promise(resolve => setTimeout(resolve, 800));
            const tweetButton = document.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
            if (tweetButton) {
                tweetButton.click();
            }
        }

        hideLoadingOverlay();
    });

    button.appendChild(buttonInner);
    buttonWrapper.appendChild(button);
    return buttonWrapper;
}
```

- [ ] **Step 2: Inject quick fire button into toolbars**

In `addMichiButtonToAllToolbars`, after the michi button is inserted into each toolbar, add the quick fire button. Find the first `if (!toolbar.querySelector('.gmichi-toolbar-button-wrapper'))` block (around line 867) and update:

```javascript
            if (!toolbar.querySelector('.gmichi-toolbar-button-wrapper')) {
                const michiWrapper = document.createElement("div");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper";

                const michiButton = createMichiButton();
                michiWrapper.appendChild(michiButton);

                toolbar.insertBefore(michiWrapper, toolbar.firstChild);

                // Add quick fire button
                const quickFireWrapper = document.createElement("div");
                quickFireWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-quickfire-wrapper";
                quickFireWrapper.appendChild(createQuickFireButton());
                toolbar.insertBefore(quickFireWrapper, michiWrapper.nextSibling);
            }
```

Do the same for the `else` block (around line 879):

```javascript
            if (!toolbar.querySelector(".gmichi-toolbar-button-wrapper")) {
                const michiWrapper = document.createElement("div");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper";
                michiWrapper.appendChild(createMichiButton());

                toolbar.insertBefore(michiWrapper, toolbar.firstChild);

                // Add quick fire button
                const quickFireWrapper = document.createElement("div");
                quickFireWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-quickfire-wrapper";
                quickFireWrapper.appendChild(createQuickFireButton());
                toolbar.insertBefore(quickFireWrapper, michiWrapper.nextSibling);
            }
```

- [ ] **Step 3: Test manually**

1. Reload extension, open X
2. Verify a gold michi icon with lightning bolt appears next to the regular blue michi icon
3. Click quick fire — should attach a random meme immediately (no flyout)
4. Open settings (gear icon), enable "Quick Fire: Auto-post"
5. Click quick fire again — should attach meme AND click the post button automatically
6. Verify it works on both new tweet and reply composers

- [ ] **Step 4: Commit**

```bash
git add content.js
git commit -m "feat: add quick fire button to toolbar"
```

---

### Task 6: Favorites in Popup

**Files:**
- Modify: `popup.html`
- Modify: `popup.js`

- [ ] **Step 1: Add Favorites button to popup.html**

In `popup.html`, add a Favorites button after the Random button in the button-container:

```html
        <div class="button-container">
            <button id="allBtn">All</button>
            <button id="randomBtn">Random</button>
            <button id="favBtn">Favs</button>
        </div>
```

- [ ] **Step 2: Add favorites loading logic to popup.js**

At the top of `popup.js`, add the favBtn reference after the existing element references:

```javascript
const favBtn = document.getElementById("favBtn");
```

Add a `loadFavorites` function after `loadRandomImages`:

```javascript
async function loadFavorites() {
    container.innerHTML = "";
    const favorites = await getFavorites();
    if (favorites.length === 0) {
        showError("No favorites yet. Star memes to save them here.");
        return;
    }
    favorites.forEach(url => addImage(url));
}
```

Add the click handler after the `randomBtn` handler:

```javascript
favBtn.addEventListener("click", () => {
    clearSearch();
    currentMode = "favorites";
    loadFavorites();
});
```

- [ ] **Step 3: Test manually**

1. Click the extension icon to open popup
2. Click "Favs" button — should show favorites or empty message
3. Favorites added in the flyout should appear here too (shared storage)

- [ ] **Step 4: Commit**

```bash
git add popup.html popup.js
git commit -m "feat: add favorites tab to popup"
```

---

### Task 7: Settings in Popup

**Files:**
- Modify: `popup.html`

- [ ] **Step 1: Add Quick Fire Auto-post toggle to popup footer**

In `popup.html`, add the Quick Fire toggle to the footer alongside the existing toggles:

```html
    <div class="footer">
        more at <a href="https://gmichi.meme" target="_blank">gmichi.meme</a>
        <br>
        <label
            style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px; cursor: pointer;">
            Michi Mode
            <input type="checkbox" id="toggleLikeReplace" style="cursor: pointer;">
        </label>
        <label
            style="display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer;">
            Enable Sound
            <input type="checkbox" id="toggleSound" style="cursor: pointer;">
        </label>
        <label
            style="display: flex; align-items: center; justify-content: center; gap: 5px; cursor: pointer;">
            Quick Fire: Auto-post
            <input type="checkbox" id="toggleQuickFire" style="cursor: pointer;">
        </label>
    </div>
```

- [ ] **Step 2: Add Quick Fire toggle logic to popup.js**

In the `DOMContentLoaded` handler in `popup.js`, add after the existing toggle setup:

```javascript
    const toggleQuickFire = document.getElementById("toggleQuickFire");

    // Load quick fire state
    chrome.storage.sync.get(["quickFireAutoPost"], (data) => {
        toggleQuickFire.checked = data.quickFireAutoPost ?? false;
    });

    // Listen for Quick Fire toggle changes
    toggleQuickFire.addEventListener("change", () => {
        const enabled = toggleQuickFire.checked;
        chrome.storage.sync.set({ quickFireAutoPost: enabled });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { quickFireAutoPost: enabled });
            }
        });
    });
```

- [ ] **Step 3: Test manually**

1. Open popup, verify Quick Fire toggle appears
2. Toggle it on — verify it persists after closing/reopening popup
3. Verify the setting syncs with the flyout gear settings

- [ ] **Step 4: Commit**

```bash
git add popup.html popup.js
git commit -m "feat: add quick fire auto-post toggle to popup settings"
```

---

### Task 8: Version Bump & Final Testing

**Files:**
- Modify: `manifest.json`
- Modify: `content.js`

- [ ] **Step 1: Bump version**

In `manifest.json`, change:
```json
"version": "2.2.0",
```

In `content.js`, change:
```javascript
const version = "2.2";
```

- [ ] **Step 2: Full integration test**

Test all features end-to-end:
1. Open X, verify both buttons appear (blue michi + gold quick fire)
2. Open flyout — verify All/Random/Favs/Add Gmichi/Gear buttons
3. Star several memes, click Favs — verify they appear
4. Unstar a meme from Favs — verify it disappears on re-click
5. Click gear — settings panel appears with 3 toggles
6. Toggle Quick Fire auto-post ON
7. Click quick fire button — meme should attach AND post
8. Toggle Quick Fire auto-post OFF
9. Click quick fire button — meme should attach but NOT post
10. Open popup — verify Favs tab and Quick Fire toggle
11. Verify settings sync between popup and flyout

- [ ] **Step 3: Commit**

```bash
git add manifest.json content.js
git commit -m "chore: bump version to 2.2.0"
```
