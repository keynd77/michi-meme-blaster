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
