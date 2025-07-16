const container = document.getElementById("imageContainer");
const allBtn = document.getElementById("allBtn");
const randomBtn = document.getElementById("randomBtn");
const searchInput = document.getElementById("searchInput");
const darkModeToggle = document.getElementById("darkModeToggle");
const batchSize = 20;
let images = [];
let loadedCount = 0;
let currentMode = "all";
let isSearching = false;
let searchTimeout = null;
let currentSearchPage = 1;
let currentSearchQuery = "";
let hasMoreSearchResults = true;

fetch("images.json")
    .then(response => response.json())
    .then(data => {
        images = data;
        loadAllImages();
    })
    .catch(error => console.error("Error loading images:", error));

function loadAllImages() {
    container.innerHTML = "";
    loadedCount = 0;
    loadNextBatch();
}

function loadNextBatch() {
    if (currentMode !== "all") return;
    const batch = images.slice(loadedCount, loadedCount + batchSize);
    batch.forEach(url => addImage(url));
    loadedCount += batch.length;
}

function loadRandomImages() {
    container.innerHTML = "";
    let shuffled = [...images].sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 4);
    selected.forEach(url => addImage(url));
}

function addImage(url) {
    const img = document.createElement("img");
    img.src = url;
    img.loading = "lazy";
    container.appendChild(img);
}

async function searchImages(query, page = 1, size = 20) {
    if (!query || query.trim() === "") {
        return { images: [], pagination: null };
    }

    try {
        const response = await fetch(`https://michi-meme-search.vercel.app/api/images?page=${page}&size=${size}&q=${encodeURIComponent(query.trim())}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle the specific API response structure
        if (data && Array.isArray(data.images)) {
            // Extract URLs from the image objects
            const urls = data.images.map(image => image.url).filter(url => url);
            return { images: urls, pagination: data.pagination };
        } else {
            console.warn("Unexpected API response format:", data);
            return { images: [], pagination: null };
        }
        
    } catch (error) {
        console.error("Search error:", error);
        showError("Search failed. Please try again.");
        return { images: [], pagination: null };
    }
}

function showError(message) {
    container.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; padding: 20px; color: var(--text-color); width: 100%;">${message}</div>`;
}

function showLoading() {
    container.innerHTML = `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; padding: 20px; color: var(--text-color); width: 100%;">
        <div class="loading-spinner"></div>
        <div style="margin-top: 10px;">Searching...</div>
    </div>`;
}

function showSearchResults(results, query) {
    container.innerHTML = "";
    if (results.length > 0) {
        results.forEach(url => addImage(url));
    }
}

function clearSearch() {
    searchInput.value = "";
    currentMode = "all";
    currentSearchPage = 1;
    currentSearchQuery = "";
    hasMoreSearchResults = true;
    loadAllImages();
}

window.addEventListener("scroll", async () => {
    if (currentMode === "all" && window.innerHeight + window.scrollY >= document.body.scrollHeight - 50) {
        loadNextBatch();
    }
    // Infinite scrolling for search results
    else if (currentMode === "search" && !isSearching && hasMoreSearchResults && 
             window.innerHeight + window.scrollY >= document.body.scrollHeight - 50) {
        
        isSearching = true;
        currentSearchPage++;
        
        const result = await searchImages(currentSearchQuery, currentSearchPage);
        
        if (result.images.length > 0) {
            result.images.forEach(url => addImage(url));
            hasMoreSearchResults = result.pagination ? result.pagination.hasNext : false;
        } else {
            hasMoreSearchResults = false;
        }
        
        isSearching = false;
    }
});

// Real-time search as user types
searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    searchTimeout = setTimeout(async () => {
        if (query.length >= 2) { // Only search if query is 2+ characters
            currentMode = "search";
            isSearching = true;
            showLoading();
            
            // Reset search state for new query
            currentSearchPage = 1;
            currentSearchQuery = query;
            hasMoreSearchResults = true;
            
            const result = await searchImages(query, 1);
            
            if (result.images.length === 0) {
                showError("No results found. Try a different search term.");
            } else {
                showSearchResults(result.images, query);
                hasMoreSearchResults = result.pagination ? result.pagination.hasNext : false;
            }
            
            isSearching = false;
        } else if (query.length === 0) {
            // Clear search and show all images
            clearSearch();
        }
    }, 300); // 300ms delay for responsive feel
});

// Clear search when switching to All or Random
allBtn.addEventListener("click", () => {
    clearSearch();
    currentMode = "all";
    loadAllImages();
});

randomBtn.addEventListener("click", () => {
    clearSearch();
    currentMode = "random";
    loadRandomImages();
});

const enableDarkMode = () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
};

const disableDarkMode = () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
};

const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
    enableDarkMode();
}

document.addEventListener("DOMContentLoaded", () => {
    const toggleLikeReplace = document.getElementById("toggleLikeReplace");
    const toggleSound = document.getElementById("toggleSound");

    // Load stored toggle states
    chrome.storage.sync.get(["replaceLikeEnabled", "soundEnabled"], (data) => {
        toggleLikeReplace.checked = data.replaceLikeEnabled ?? true; // Default: Enabled
        toggleSound.checked = data.soundEnabled ?? false; // Default: Disabled
    });

    // Listen for "Replace Like" toggle changes
    toggleLikeReplace.addEventListener("change", () => {
        const enabled = toggleLikeReplace.checked;
        chrome.storage.sync.set({ replaceLikeEnabled: enabled });

        // Send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { replaceLikeEnabled: enabled });
            }
        });
    });

    // Listen for "Enable Sound" toggle changes
    toggleSound.addEventListener("change", () => {
        const soundEnabled = toggleSound.checked;
        chrome.storage.sync.set({ soundEnabled });

        // Send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { soundEnabled });
            }
        });
    });
});

