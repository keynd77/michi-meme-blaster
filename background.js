// New memes indicator: check periodically for new memes in gallery
async function checkNewMemes() {
    try {
        const res = await fetch('https://michi.meme/api/gallery-memes?limit=1&page=1');
        if (!res.ok) return;
        const data = await res.json();
        const latestCount = data.totalMemes || data.totalDocs || 0;
        const stored = await chrome.storage.sync.get(['lastKnownMemeCount']);
        const lastCount = stored.lastKnownMemeCount || 0;
        if (latestCount > lastCount && lastCount > 0) {
            chrome.action.setBadgeText({ text: '•' });
            chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
        }
        chrome.storage.sync.set({ lastKnownMemeCount: latestCount });
    } catch (e) {}
}

chrome.runtime.onInstalled?.addListener(() => checkNewMemes());
setInterval(checkNewMemes, 30 * 60 * 1000);

// Proxy image fetches to bypass CORS restrictions on content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'fetchImage') {
        fetch(message.url, { method: 'GET' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const contentType = response.headers.get('Content-Type') || '';
                return response.arrayBuffer().then(buffer => ({ buffer, contentType }));
            })
            .then(({ buffer, contentType }) => {
                sendResponse({ success: true, data: Array.from(new Uint8Array(buffer)), contentType });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // keep message channel open for async response
    }
});
