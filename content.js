// Global variables
const version = "2.1";
let michiImages = [];
let loadedCount = 0;
const batchSize = 20;
let flyoutContainer = null;
let likeReplacementEnabled = true; 
let soundEnabled = false;
const TEXT_TO_ADD = "gmichi";


// Configuration object at the top
const vipUserConfig = {
    users: [
        {
            username: "thealexblade", // Your X username
            gifUrl: "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2poNGp5ZXJwemNicmVhNTN0Nm1iaGs5N3pibXF4eW02cTNuaDJ1bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/o4vD25fPGhwp2Q1O3k/giphy.gif",  // GIF in root folder
            headerImageUrl: "",
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
async function replaceProfilePics() {
    for (const user of vipUserConfig.users) {
        // Validate profile GIF URL
        const isProfileGifValid = await checkImageUrl(user.gifUrl);
        if (!isProfileGifValid) {
            console.error(`Invalid or unreachable profile GIF URL for ${user.username}: ${user.gifUrl}`);
            continue;
        }
        console.log(`Profile GIF valid for ${user.username}: ${user.gifUrl}`);

        // Validate header GIF URL if provided
        let isHeaderGifValid = true;
        if (user.headerImageUrl) {
            isHeaderGifValid = await checkImageUrl(user.headerImageUrl);
            if (!isHeaderGifValid) {
                console.error(`Invalid or unreachable header GIF URL for ${user.username}: ${user.headerImageUrl}`);
            } else {
                console.log(`Header GIF valid for ${user.username}: ${user.headerImageUrl}`);
            }
        }

        // Replace profile pictures using data-testid
        const avatarContainers = document.querySelectorAll(`div[data-testid="UserAvatar-Container-${user.username}"]`);
        avatarContainers.forEach(container => {
            const bgDiv = container.querySelector('div[style*="background-image"]');
            if (bgDiv && !bgDiv.style.backgroundImage.includes(user.gifUrl)) {
                console.log(`Replacing profile background for ${user.username}: ${bgDiv.style.backgroundImage}`);
                bgDiv.style.backgroundImage = `url("${user.gifUrl}")`;
            }

            const img = container.querySelector("img");
            if (img && img.src !== user.gifUrl) {
                console.log(`Replacing profile img for ${user.username}: ${img.src}`);
                img.src = user.gifUrl;
                img.alt = `Animated profile pic for ${user.username}`;
            }
        });

        // Replace header photos using href="/username/header_photo"
        if (user.headerImageUrl && isHeaderGifValid) {
            const headerLinks = document.querySelectorAll(`a[href="/${user.username}/header_photo"]`);
            headerLinks.forEach(link => {
                const parentDiv = link.parentElement;
                if (!parentDiv) return;

                const bgDiv = parentDiv.querySelector('div[style*="background-image"]');
                if (bgDiv && !bgDiv.style.backgroundImage.includes(user.headerImageUrl)) {
                    console.log(`Replacing header background for ${user.username}: ${bgDiv.style.backgroundImage}`);
                    bgDiv.style.backgroundImage = `url("${user.headerImageUrl}")`;
                }

                const img = parentDiv.querySelector("img");
                if (img && img.src !== user.headerImageUrl) {
                    console.log(`Replacing header img for ${user.username}: ${img.src}`);
                    img.src = user.headerImageUrl;
                    img.alt = `Animated header for ${user.username}`;
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

// Load initial state from storage
chrome.storage.sync.get(["replaceLikeEnabled", "soundEnabled"], (data) => {
    likeReplacementEnabled = data.replaceLikeEnabled ?? true;
    soundEnabled = data.soundEnabled ?? false; // Load sound setting

    if (likeReplacementEnabled) {
        replaceLikeButtons();
    }
});

// Listen for messages from popup
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
        soundEnabled = message.soundEnabled; // Update sound setting when changed
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
    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6"; // Matches Twitter's button container

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

    // Hover effect (matches Twitter button behavior)
    button.addEventListener("mouseenter", () => {
        buttonInner.style.color = "#FAECCF"; // Example hover color (Orange)
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
    buttonWrapper.appendChild(button);
    return buttonWrapper;
}

async function handleShiftClickMichiButton() {
    showLoadingOverlay(); 

    const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
    await uploadImageToTweet(randomImage);

    hideLoadingOverlay(); 
}

async function handleCmdShiftClickMichiButton() {
    showLoadingOverlay(); 
    insertTextInTweetInput(TEXT_TO_ADD + " "); 

    await new Promise(resolve => setTimeout(resolve, 300)); 

    const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
    await uploadImageToTweet(randomImage); 

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
        document.removeEventListener("click", closeFlyoutOnOutsideClick);
        document.removeEventListener("scroll", closeFlyoutOnScroll); // Remove scroll event
    }
}

// Function to close flyout when scrolling the body
function closeFlyoutOnScroll() {
    closeFlyout();
}

function shuffleArray(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Function to create and open the flyout
function openMichiFlyout(event, button) {
    const toolbar = button.closest('[data-testid="toolBar"]');
    if (!toolbar) return;
    
    const toolbarRect = toolbar.getBoundingClientRect();

    loadedCount = 0;

    flyoutContainer = document.createElement("div");
    flyoutContainer.id = "michi-flyout";
    flyoutContainer.style.position = "fixed";
    flyoutContainer.style.width = `${toolbarRect.width}px`;
    flyoutContainer.style.height = "250px";
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
    header.style.justifyContent = "space-around";
    header.style.padding = "8px";
    header.style.borderBottom = "1px solid rgb(47, 51, 54)";
    header.style.background = getComputedStyle(document.body).backgroundColor;

    const buttonStyle = `
        border: none;
        padding: 6px 12px;
        cursor: pointer;
        background: transparent;
        color: rgb(29, 155, 240);
        font-size: 14px;
        font-family: "TwitterChirp", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-weight: 700; 
    `;


    const allBtn = document.createElement("button");
    allBtn.textContent = "All";
    allBtn.style.cssText = buttonStyle;
    allBtn.onclick = () => {
        loadedCount = 0;
        loadMichiImages("all", true);
    };
    
    // Create "Random" button
    const randomBtn = document.createElement("button");
    randomBtn.textContent = "Random";
    randomBtn.style.cssText = buttonStyle;
    randomBtn.onclick = () => {
        if (michiImages.length === 0) {
            console.error("No Michi images available.");
            return;
        }
        
        const randomImage = michiImages[Math.floor(Math.random() * michiImages.length)];
        uploadImageToTweet(randomImage, button); // Uploads a random image to the Twitter tweet field
        closeFlyout(); // Close the extension UI after inserting the image
    };

    const addTextBtn = document.createElement("button");
        addTextBtn.textContent = "Add Gmichi";
        addTextBtn.style.cssText = buttonStyle;
        addTextBtn.onclick = () => {
        insertTextInTweetInput(TEXT_TO_ADD + " ");
    };

    header.appendChild(allBtn);
    header.appendChild(randomBtn);
    header.appendChild(addTextBtn);

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

    // Append elements in correct order
    flyoutContainer.appendChild(header);
    flyoutContainer.appendChild(imageContainer);
    flyoutContainer.appendChild(footer);
    document.body.appendChild(flyoutContainer);

    // Load first batch of images
    loadMichiImages("all", true);

    // Attach scroll event for lazy loading
    imageContainer.addEventListener("scroll", () => handleFlyoutScroll(imageContainer));
   
    // Re-add both event listeners every time the flyout opens
    setTimeout(() => {
        document.addEventListener("click", closeFlyoutOnOutsideClick);
        window.addEventListener("scroll", closeFlyoutOnScroll, { passive: true });
    }, 100);
}

// Function to load images in batches **with correct lazy loading**
function loadMichiImages(mode, reset = false) {
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
    batch.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        img.style.width = "100%";
        img.style.height = "100px";
        img.style.objectFit = "cover";
        img.style.cursor = "pointer";
        img.style.borderRadius = "5px";
        img.style.boxShadow = "0px 2px 5px rgba(0, 0, 0, 0.2)";
        img.addEventListener("click", async () => {
            console.log("Selected Image URL:", img.src); // Log the image URL instead
        });
        img.addEventListener("click", () => {
            uploadImageToTweet(img.src); // Uploads the image to Twitter tweet field
            closeFlyout(); // Optional: Close the extension UI
        });
        imageGrid.appendChild(img);
    });

    loadedCount += batch.length;
}

async function uploadImageToTweet(imageUrl) {
    try {
        showLoadingOverlay();

        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error("Failed to fetch image");
        const blob = await response.blob();
        const file = new File([blob], "michi.jpg", { type: blob.type });

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

    } catch (error) {
        console.error("Error uploading image:", error);
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
    if (!flyoutContainer) return;
    if (imageContainer.scrollTop + imageContainer.clientHeight >= imageContainer.scrollHeight - 20) {
        loadMichiImages("all"); // Load next batch when scrolled to bottom
    }
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

    if (photoButtons.length > 0) {
        // Found at least one image button → Place Michi button next to all of them
        photoButtons.forEach(photoButton => {
            const toolbar = photoButton.closest('[data-testid="ScrollSnap-List"]');
            if (!toolbar) return; // Skip if no toolbar is found

            // Ensure Michi button is only added once
            if (!toolbar.querySelector('.gmichi-toolbar-button-wrapper')) {
                const michiWrapper = document.createElement("div");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper"; // Match other button wrappers

                const michiButton = createMichiButton();
                michiWrapper.appendChild(michiButton);

                // Insert at the **start** of the toolbar
                toolbar.insertBefore(michiWrapper, toolbar.firstChild);
            }
        });
    } else {
        document.querySelectorAll('[data-testid="ScrollSnap-List"]').forEach(toolbar => {
            if (!toolbar.querySelector(".gmichi-toolbar-button-wrapper")) {
                const michiWrapper = document.createElement("div");
                michiWrapper.className = "css-175oi2r r-14tvyh0 r-cpa5s6 gmichi-toolbar-button-wrapper"; // Consistent styling
                michiWrapper.appendChild(createMichiButton());

                // Insert at the **beginning** instead of the end
                toolbar.insertBefore(michiWrapper, toolbar.firstChild);
            }
        });
    }
}

const likeButtonPaths = {
    default: "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z", 
    liked: "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z" // Filled (liked) heart button
}

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


// Run on page load and observe for changes
addMichiButtonToAllToolbars();
replaceProfilePics();
replaceLikeButtons(); // Also replace like buttons initially

const observer = new MutationObserver(() => {
    addMichiButtonToAllToolbars();
    replaceProfilePics();
    if (likeReplacementEnabled) {
        replaceLikeButtons(); 
    }
});

observer.observe(document.body, { childList: true, subtree: true });

console.info(`michi meme blaster ${version} active!`);