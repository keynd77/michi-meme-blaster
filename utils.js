// Shared utility functions for Michi Meme Blaster

// Common search function used by both popup and content script
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
            const urls = data.images.map(image => image.thumbnail_url).filter(url => url);
            return { images: urls, pagination: data.pagination };
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
    return function(query) {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => callback(query), delay);
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchImages, createDebouncedSearch };
} 