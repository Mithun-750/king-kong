// King Kong Content Script - YouTube Comment Filter
console.log("🦍 King Kong: Comment filter loaded");

// Global variables
let isFilterEnabled = false;
let regexPatterns = [];
let filteredCommentsCount = 0;
let observer = null;

// Initialize the extension
async function init() {
  await loadSettings();
  await loadPatterns();
  await loadStoredCount();

  if (isFilterEnabled) {
    startObserving();
    // Only process existing comments if filter is enabled
    processExistingComments();
  }

  console.log(
    "🦍 King Kong: Initialized with",
    regexPatterns.length,
    "patterns, filter",
    isFilterEnabled ? "enabled" : "disabled"
  );
}

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["filterEnabled"]);
    isFilterEnabled = result.filterEnabled || false;
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Load regex patterns from storage
async function loadPatterns() {
  try {
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    regexPatterns = result.regexPatterns || [];
  } catch (error) {
    console.error("Error loading patterns:", error);
  }
}

// Load stored count from storage
async function loadStoredCount() {
  try {
    const result = await chrome.storage.local.get(["filteredCommentsCount"]);
    filteredCommentsCount = result.filteredCommentsCount || 0;
  } catch (error) {
    console.error("Error loading stored count:", error);
  }
}

// Start observing DOM changes
function startObserving() {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    let hasNewComments = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        // Check for new comment elements
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a comment thread or contains comment threads
            const commentThreads = node.querySelectorAll
              ? node.querySelectorAll("ytd-comment-thread-renderer")
              : [];

            if (node.matches && node.matches("ytd-comment-thread-renderer")) {
              hasNewComments = true;
              processCommentThread(node);
            } else if (commentThreads.length > 0) {
              hasNewComments = true;
              commentThreads.forEach(processCommentThread);
            }
          }
        });
      }
    });

    if (hasNewComments) {
      updateFilteredCount();
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("🦍 King Kong: Started observing for new comments");
}

// Stop observing DOM changes
function stopObserving() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  console.log("🦍 King Kong: Stopped observing");
}

// Process existing comments on page
function processExistingComments() {
  if (!isFilterEnabled) {
    console.log("🦍 King Kong: Filter disabled, skipping existing comments");
    return;
  }

  const commentThreads = document.querySelectorAll(
    "ytd-comment-thread-renderer"
  );
  console.log(
    `🦍 King Kong: Processing ${commentThreads.length} existing comments`
  );

  commentThreads.forEach(processCommentThread);
  updateFilteredCount();
}

// Process a single comment thread
function processCommentThread(commentThread) {
  if (!isFilterEnabled || regexPatterns.length === 0) {
    return;
  }

  // Find the comment text element
  const commentTextElement = commentThread.querySelector(
    ".yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap"
  );

  if (!commentTextElement) {
    return;
  }

  const commentText =
    commentTextElement.textContent || commentTextElement.innerText || "";

  // Check if comment matches any regex pattern
  const shouldHide = regexPatterns.some((pattern) => {
    try {
      // Handle both old string format and new object format for backwards compatibility
      const regex = typeof pattern === "string" ? pattern : pattern.regex;
      const regexObj = new RegExp(regex, "i"); // Case insensitive
      return regexObj.test(commentText);
    } catch (error) {
      const patternDisplay =
        typeof pattern === "string"
          ? pattern
          : `${pattern.title}: ${pattern.regex}`;
      console.warn(
        "🦍 King Kong: Invalid regex pattern:",
        patternDisplay,
        error
      );
      return false;
    }
  });

  if (shouldHide) {
    hideComment(commentThread, commentText);
  } else {
    showComment(commentThread);
  }
}

// Hide a comment
function hideComment(commentThread, commentText) {
  // Check if already hidden to avoid double-counting
  if (
    commentThread.style.display === "none" &&
    commentThread.getAttribute("data-king-kong-filtered") === "true"
  ) {
    return; // Already filtered, don't count again
  }

  commentThread.style.display = "none";
  commentThread.setAttribute("data-king-kong-filtered", "true");
  filteredCommentsCount++;

  console.log(
    "🦍 King Kong: Filtered comment:",
    commentText.substring(0, 50) + "..."
  );

  // Add a subtle indicator for debugging (only visible in dev mode)
  if (!commentThread.querySelector(".king-kong-indicator")) {
    const indicator = document.createElement("div");
    indicator.className = "king-kong-indicator";
    indicator.style.cssText = `
              position: absolute;
              top: -2px;
              left: -2px;
              width: 4px;
              height: 4px;
              background: #ff6b6b;
              border-radius: 50%;
              z-index: 1000;
              opacity: 0.7;
          `;
    indicator.title = "Filtered by King Kong";
    commentThread.style.position = "relative";
    commentThread.appendChild(indicator);
  }
}

// Show a comment (in case patterns change)
function showComment(commentThread) {
  if (
    commentThread.style.display === "none" &&
    commentThread.getAttribute("data-king-kong-filtered") === "true"
  ) {
    commentThread.style.display = "";
    commentThread.removeAttribute("data-king-kong-filtered");

    // Decrement count when showing a previously hidden comment
    if (filteredCommentsCount > 0) {
      filteredCommentsCount--;
    }

    // Remove indicator
    const indicator = commentThread.querySelector(".king-kong-indicator");
    if (indicator) {
      indicator.remove();
    }
  }
}

// Update filtered comments count
async function updateFilteredCount() {
  try {
    await chrome.storage.local.set({
      filteredCommentsCount: filteredCommentsCount,
    });

    // Notify popup to update stats
    chrome.runtime.sendMessage({ action: "updateStats" }).catch(() => {
      // Popup might not be open, ignore error
    });
  } catch (error) {
    console.error("Error updating filtered count:", error);
  }
}

// Reset filtered count
function resetFilteredCount() {
  filteredCommentsCount = 0;
  updateFilteredCount();
}

// Show all hidden comments
function showAllComments() {
  const hiddenComments = document.querySelectorAll(
    'ytd-comment-thread-renderer[data-king-kong-filtered="true"]'
  );

  let countToSubtract = 0;
  hiddenComments.forEach((commentThread) => {
    commentThread.style.display = "";
    commentThread.removeAttribute("data-king-kong-filtered");
    countToSubtract++;

    // Remove indicator
    const indicator = commentThread.querySelector(".king-kong-indicator");
    if (indicator) {
      indicator.remove();
    }
  });

  // Subtract the actual number of comments we just showed
  filteredCommentsCount = Math.max(0, filteredCommentsCount - countToSubtract);
  updateFilteredCount();

  console.log(`🦍 King Kong: Showed ${countToSubtract} hidden comments`);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "toggleFilter":
      isFilterEnabled = request.enabled;
      console.log(
        "🦍 King Kong: Filter",
        isFilterEnabled ? "enabled" : "disabled"
      );

      if (isFilterEnabled) {
        startObserving();
        processExistingComments();
      } else {
        stopObserving();
        showAllComments();
      }
      break;

    case "updatePatterns":
      regexPatterns = request.patterns;
      console.log("🦍 King Kong: Updated patterns:", regexPatterns);

      if (isFilterEnabled) {
        // Re-evaluate all comments with new patterns
        showAllComments();
        resetFilteredCount();
        processExistingComments();
      }
      break;
  }

  sendResponse({ success: true });
});

// Handle page navigation (YouTube is a SPA)
let currentUrl = location.href;
const urlObserver = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log("🦍 King Kong: Page changed, resetting");

    resetFilteredCount();

    // Wait for new page content to load
    setTimeout(() => {
      if (isFilterEnabled) {
        processExistingComments();
      }
    }, 1000);
  }
});

urlObserver.observe(document.body, {
  childList: true,
  subtree: true,
});

// Add some CSS for better performance
const style = document.createElement("style");
style.textContent = `
    ytd-comment-thread-renderer[data-king-kong-filtered="true"] {
        display: none !important;
    }
    
    .king-kong-indicator {
        pointer-events: none;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Handle case where script loads after page is already loaded
setTimeout(init, 1000);
