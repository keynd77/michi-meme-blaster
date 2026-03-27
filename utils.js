// Shared utility functions for Michi Meme Blaster

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

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchImages, createDebouncedSearch, getFavorites, toggleFavorite, isFavorite };
} 