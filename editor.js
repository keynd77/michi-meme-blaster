/**
 * Michi Sticker Editor — place michi emotes & stickers on any image
 * Uses real PNG stickers from /stickers/ folder
 */

const EDITOR_STICKERS = [
    { id: 'michi_full', label: 'Michi', file: 'michi_full.png' },
    { id: 'michi_normal', label: 'Normal', file: 'michi_normal.png' },
    { id: 'angry', label: 'Angry', file: 'angry.png' },
    { id: 'anxious', label: 'Anxious', file: 'anxious.png' },
    { id: 'bliss', label: 'Bliss', file: 'bliss.png' },
    { id: 'cute', label: 'Cute', file: 'cute.png' },
    { id: 'determined', label: 'Determined', file: 'determined.png' },
    { id: 'grumpy', label: 'Grumpy', file: 'grumpy.png' },
    { id: 'laughing', label: 'Laughing', file: 'laughing.png' },
    { id: 'meltdown', label: 'Meltdown', file: 'meltdown.png' },
    { id: 'neutral', label: 'Neutral', file: 'neutral.png' },
    { id: 'rofl', label: 'ROFL', file: 'rofl.png' },
    { id: 'side-eye', label: 'Side Eye', file: 'side-eye.png' },
    { id: 'smug', label: 'Smug', file: 'smug.png' },
    { id: 'troll', label: 'Troll', file: 'troll.png' },
    { id: 'worried', label: 'Worried', file: 'worried.png' },
];

// Preload all sticker images
const stickerImages = {};
for (const s of EDITOR_STICKERS) {
    const img = new Image();
    img.src = chrome.runtime.getURL(`stickers/${s.file}`);
    stickerImages[s.id] = img;
}

/**
 * Create the sticker editor panel for the flyout
 * @param {string} imageUrl - background image URL
 * @param {Function} uploadFn - called with blob URL when user posts
 * @returns {HTMLElement} the editor panel
 */
function createEditorPanel(imageUrl, uploadFn) {
    const panel = document.createElement('div');
    panel.id = 'michi-editor-panel';
    panel.style.cssText = `
        display: flex; flex-direction: column; height: 100%; overflow-y: auto;
        padding: 8px; gap: 8px; box-sizing: border-box;
        font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #e7e9ea; font-size: 13px;
    `;

    // --- State ---
    const stickers = []; // { img, x, y, width, height, rotation, flipped }
    let selectedIdx = -1;
    let dragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let bgImage = null;
    let activeHandle = null; // 'rotate' | 'tl' | 'tr' | 'bl' | 'br' | null
    let handleStartAngle = 0;
    let handleStartRotation = 0;
    let handleStartDist = 0;
    let handleStartW = 0, handleStartH = 0;
    let handleStartX = 0, handleStartY = 0;

    // --- Canvas ---
    const canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'position:relative;border-radius:8px;overflow:hidden;border:1px solid rgb(47,51,54);flex-shrink:0;background:#000;display:flex;align-items:center;justify-content:center;max-height:280px;';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;max-width:100%;max-height:280px;cursor:crosshair;';
    canvasWrap.appendChild(canvas);
    panel.appendChild(canvasWrap);

    const ctx = canvas.getContext('2d');

    // --- Controls row ---
    const controlsRow = document.createElement('div');
    controlsRow.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;';

    const ctrlBtnStyle = `background:none;border:1px solid rgb(47,51,54);color:#e7e9ea;border-radius:8px;
        padding:4px 8px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;
        transition:background 0.15s;min-width:28px;`;

    function makeCtrlBtn(label, tooltip, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.setAttribute('data-tooltip', tooltip);
        btn.style.cssText = ctrlBtnStyle;
        btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,0.1)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
        btn.addEventListener('click', onClick);
        return btn;
    }

    controlsRow.appendChild(makeCtrlBtn('↺', 'Rotate left', () => rotateSelected(-15)));
    controlsRow.appendChild(makeCtrlBtn('↻', 'Rotate right', () => rotateSelected(15)));
    controlsRow.appendChild(makeCtrlBtn('+', 'Scale up', () => scaleSelected(1.2)));
    controlsRow.appendChild(makeCtrlBtn('−', 'Scale down', () => scaleSelected(0.8)));
    controlsRow.appendChild(makeCtrlBtn('⇔', 'Flip', () => flipSelected()));
    controlsRow.appendChild(makeCtrlBtn('🗑', 'Delete', () => deleteSelected()));

    const ctrlSpacer = document.createElement('div');
    ctrlSpacer.style.flex = '1';
    controlsRow.appendChild(ctrlSpacer);

    controlsRow.appendChild(makeCtrlBtn('↩', 'Undo', () => {
        if (stickers.length > 0) { stickers.pop(); selectedIdx = stickers.length - 1; draw(); }
    }));

    panel.appendChild(controlsRow);

    // --- Sticker palette ---
    const paletteLabel = document.createElement('div');
    paletteLabel.textContent = 'Stickers';
    paletteLabel.style.cssText = 'font-size:11px;color:rgb(113,118,123);text-transform:uppercase;letter-spacing:0.5px;';
    panel.appendChild(paletteLabel);

    const palette = document.createElement('div');
    palette.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

    for (const sticker of EDITOR_STICKERS) {
        const thumb = document.createElement('button');
        thumb.setAttribute('data-tooltip', sticker.label);
        thumb.style.cssText = `
            width:40px;height:40px;border-radius:8px;border:1px solid rgb(47,51,54);
            background:rgb(22,24,28);cursor:pointer;display:flex;align-items:center;
            justify-content:center;padding:2px;transition:border-color 0.15s;overflow:hidden;
        `;
        const thumbImg = document.createElement('img');
        thumbImg.src = chrome.runtime.getURL(`stickers/${sticker.file}`);
        thumbImg.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
        thumb.appendChild(thumbImg);

        thumb.addEventListener('mouseenter', () => { thumb.style.borderColor = '#f7b731'; });
        thumb.addEventListener('mouseleave', () => { thumb.style.borderColor = 'rgb(47,51,54)'; });
        thumb.addEventListener('click', () => addSticker(sticker));
        palette.appendChild(thumb);
    }
    panel.appendChild(palette);

    // --- Post button ---
    const postBtn = document.createElement('button');
    postBtn.textContent = 'Use in post';
    postBtn.style.cssText = `
        padding:8px 20px;border:none;border-radius:20px;background:rgb(29,155,240);
        color:#fff;font-weight:700;font-size:14px;cursor:pointer;
        font-family:"TwitterChirp",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        align-self:center;margin-top:4px;
    `;
    postBtn.addEventListener('click', exportAndPost);
    panel.appendChild(postBtn);

    // --- Load background image (keep original proportions) ---
    function loadBackground() {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => { setBgImage(img); };
        img.onerror = () => {
            // CORS blocked — fetch via background script
            chrome.runtime.sendMessage({ type: 'fetchImage', url: imageUrl }, (result) => {
                if (!result || !result.success) return;
                const blob = new Blob([new Uint8Array(result.data)], { type: result.contentType || 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                const img2 = new Image();
                img2.onload = () => { setBgImage(img2); URL.revokeObjectURL(url); };
                img2.src = url;
            });
        };
        img.src = imageUrl;
    }

    function setBgImage(img) {
        bgImage = img;
        // Use the image's native dimensions — no stretching
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        draw();
    }

    // --- Handle size (in canvas pixels) ---
    const HANDLE_SIZE = () => Math.max(12, canvas.width * 0.018);
    const ROTATE_HANDLE_DIST = () => Math.max(30, canvas.width * 0.04);

    // --- Draw everything ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bgImage) {
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        }

        for (let i = 0; i < stickers.length; i++) {
            const s = stickers[i];
            ctx.save();
            ctx.translate(s.x + s.width / 2, s.y + s.height / 2);
            ctx.rotate((s.rotation * Math.PI) / 180);
            if (s.flipped) ctx.scale(-1, 1);
            ctx.drawImage(s.img, -s.width / 2, -s.height / 2, s.width, s.height);

            // Selection outline + handles
            if (i === selectedIdx) {
                const hw = s.width / 2, hh = s.height / 2;
                const pad = 4;
                ctx.strokeStyle = '#f7b731';
                ctx.lineWidth = Math.max(3, canvas.width * 0.004);
                ctx.setLineDash([8, 6]);
                ctx.strokeRect(-hw - pad, -hh - pad, s.width + pad * 2, s.height + pad * 2);
                ctx.setLineDash([]);

                // Corner resize handles
                const hs = HANDLE_SIZE();
                const corners = [
                    { id: 'tl', cx: -hw - pad, cy: -hh - pad },
                    { id: 'tr', cx: hw + pad, cy: -hh - pad },
                    { id: 'bl', cx: -hw - pad, cy: hh + pad },
                    { id: 'br', cx: hw + pad, cy: hh + pad },
                ];
                for (const c of corners) {
                    ctx.fillStyle = '#fff';
                    ctx.strokeStyle = '#f7b731';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(c.cx, c.cy, hs / 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                // Rotation handle (above top center)
                const rotDist = ROTATE_HANDLE_DIST();
                ctx.strokeStyle = '#f7b731';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(0, -hh - pad);
                ctx.lineTo(0, -hh - pad - rotDist);
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = '#f7b731';
                ctx.beginPath();
                ctx.arc(0, -hh - pad - rotDist, hs / 2 + 1, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Rotation icon (↻)
                ctx.fillStyle = '#fff';
                ctx.font = `${hs * 0.8}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('↻', 0, -hh - pad - rotDist + 1);
            }
            ctx.restore();
        }
    }

    // --- Get sticker center in canvas coords ---
    function getStickerCenter(s) {
        return { x: s.x + s.width / 2, y: s.y + s.height / 2 };
    }

    // --- Hit-test handles for selected sticker ---
    function hitTestHandles(px, py) {
        if (selectedIdx < 0) return null;
        const s = stickers[selectedIdx];
        const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
        const rad = (s.rotation * Math.PI) / 180;

        // Transform point into sticker-local coords
        const dx = px - cx, dy = py - cy;
        const cos = Math.cos(-rad), sin = Math.sin(-rad);
        const lx = dx * cos - dy * sin;
        const ly = dx * sin + dy * cos;

        const hw = s.width / 2, hh = s.height / 2;
        const pad = 4;
        const hs = HANDLE_SIZE();
        const hitR = hs * 0.8; // generous hit area

        // Rotation handle
        const rotDist = ROTATE_HANDLE_DIST();
        const rotY = -hh - pad - rotDist;
        if (Math.hypot(lx, ly - rotY) < hitR) return 'rotate';

        // Corner handles
        const corners = [
            { id: 'tl', cx: -hw - pad, cy: -hh - pad },
            { id: 'tr', cx: hw + pad, cy: -hh - pad },
            { id: 'bl', cx: -hw - pad, cy: hh + pad },
            { id: 'br', cx: hw + pad, cy: hh + pad },
        ];
        for (const c of corners) {
            if (Math.hypot(lx - c.cx, ly - c.cy) < hitR) return c.id;
        }
        return null;
    }

    // --- Add sticker ---
    function addSticker(stickerDef) {
        const img = stickerImages[stickerDef.id];
        if (!img || !img.complete) return;

        // Size sticker to ~25% of canvas height, keep aspect ratio
        const targetH = canvas.height * 0.25;
        const aspect = img.naturalWidth / img.naturalHeight;
        const w = targetH * aspect;
        const h = targetH;

        stickers.push({
            img, x: (canvas.width - w) / 2, y: (canvas.height - h) / 2,
            width: w, height: h, rotation: 0, flipped: false,
        });
        selectedIdx = stickers.length - 1;
        draw();
    }

    // --- Transform helpers ---
    function rotateSelected(deg) {
        if (selectedIdx < 0) return;
        stickers[selectedIdx].rotation += deg;
        draw();
    }

    function scaleSelected(factor) {
        if (selectedIdx < 0) return;
        const s = stickers[selectedIdx];
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        s.width *= factor;
        s.height *= factor;
        s.x = cx - s.width / 2;
        s.y = cy - s.height / 2;
        draw();
    }

    function flipSelected() {
        if (selectedIdx < 0) return;
        stickers[selectedIdx].flipped = !stickers[selectedIdx].flipped;
        draw();
    }

    function deleteSelected() {
        if (selectedIdx < 0) return;
        stickers.splice(selectedIdx, 1);
        selectedIdx = stickers.length - 1;
        draw();
    }

    // --- Mouse interaction ---
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height),
        };
    }

    function hitTest(px, py) {
        // Hit-test using rotation-aware local coords for each sticker
        for (let i = stickers.length - 1; i >= 0; i--) {
            const s = stickers[i];
            const cx = s.x + s.width / 2, cy = s.y + s.height / 2;
            const rad = -(s.rotation * Math.PI) / 180;
            const dx = px - cx, dy = py - cy;
            const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
            if (Math.abs(lx) <= s.width / 2 && Math.abs(ly) <= s.height / 2) return i;
        }
        return -1;
    }

    function startInteraction(pos) {
        // Check handles first (on selected sticker)
        const handle = hitTestHandles(pos.x, pos.y);
        if (handle) {
            activeHandle = handle;
            const s = stickers[selectedIdx];
            const center = getStickerCenter(s);

            if (handle === 'rotate') {
                handleStartAngle = Math.atan2(pos.y - center.y, pos.x - center.x);
                handleStartRotation = s.rotation;
            } else {
                handleStartDist = Math.hypot(pos.x - center.x, pos.y - center.y);
                handleStartW = s.width;
                handleStartH = s.height;
                handleStartX = s.x;
                handleStartY = s.y;
            }
            canvas.style.cursor = handle === 'rotate' ? 'grab' : 'nwse-resize';
            draw();
            return;
        }

        // Then check sticker body
        const hit = hitTest(pos.x, pos.y);
        if (hit >= 0) {
            selectedIdx = hit;
            dragging = true;
            dragOffsetX = pos.x - stickers[hit].x;
            dragOffsetY = pos.y - stickers[hit].y;
            canvas.style.cursor = 'grabbing';
        } else {
            selectedIdx = -1;
        }
        activeHandle = null;
        draw();
    }

    function moveInteraction(pos) {
        if (activeHandle && selectedIdx >= 0) {
            const s = stickers[selectedIdx];
            const center = getStickerCenter(s);

            if (activeHandle === 'rotate') {
                const angle = Math.atan2(pos.y - center.y, pos.x - center.x);
                const delta = (angle - handleStartAngle) * (180 / Math.PI);
                s.rotation = handleStartRotation + delta;
            } else {
                // Corner resize — scale proportionally
                const dist = Math.hypot(pos.x - center.x, pos.y - center.y);
                const scale = dist / (handleStartDist || 1);
                const newW = handleStartW * scale;
                const newH = handleStartH * scale;
                // Minimum size
                if (newW > 10 && newH > 10) {
                    s.width = newW;
                    s.height = newH;
                    s.x = center.x - newW / 2;
                    s.y = center.y - newH / 2;
                }
            }
            draw();
            return;
        }

        if (!dragging || selectedIdx < 0) return;
        stickers[selectedIdx].x = pos.x - dragOffsetX;
        stickers[selectedIdx].y = pos.y - dragOffsetY;
        draw();
    }

    function endInteraction() {
        dragging = false;
        activeHandle = null;
        canvas.style.cursor = 'crosshair';
    }

    canvas.addEventListener('mousedown', (e) => startInteraction(getCanvasPos(e)));
    canvas.addEventListener('mousemove', (e) => {
        moveInteraction(getCanvasPos(e));
        // Update cursor on hover over handles
        if (!dragging && !activeHandle && selectedIdx >= 0) {
            const pos = getCanvasPos(e);
            const h = hitTestHandles(pos.x, pos.y);
            if (h === 'rotate') canvas.style.cursor = 'grab';
            else if (h) canvas.style.cursor = 'nwse-resize';
            else if (hitTest(pos.x, pos.y) >= 0) canvas.style.cursor = 'move';
            else canvas.style.cursor = 'crosshair';
        }
    });
    canvas.addEventListener('mouseup', endInteraction);
    canvas.addEventListener('mouseleave', endInteraction);

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startInteraction(getCanvasPos(e.touches[0]));
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        moveInteraction(getCanvasPos(e.touches[0]));
    }, { passive: false });

    canvas.addEventListener('touchend', endInteraction);

    // --- Export ---
    function exportAndPost() {
        const prevSelected = selectedIdx;
        selectedIdx = -1;
        draw();
        canvas.toBlob((blob) => {
            if (!blob) return;
            uploadFn(URL.createObjectURL(blob));
        }, 'image/png');
        selectedIdx = prevSelected;
    }

    loadBackground();
    return panel;
}
