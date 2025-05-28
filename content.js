// King Kong Content Script - YouTube Comment Manager
console.log("🦍 King Kong: Comment manager loaded");

// Global variables
let isFilterEnabled = false;
let filterPatterns = [];
let highlightPatterns = [];
let filteredCommentsCount = 0;
let highlightedCommentsCount = 0;
let totalCommentsCount = 0;
let observer = null;

// Initialize the extension
async function init() {
  await loadSettings();
  await loadPatterns();
  await loadStoredCounts();

  startObserving();

  // Process existing comments
  processExistingComments();

  console.log(
    "🦍 King Kong: Initialized with",
    filterPatterns.length,
    "filter patterns,",
    highlightPatterns.length,
    "highlight patterns, filter",
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

// Load patterns from storage
async function loadPatterns() {
  try {
    const result = await chrome.storage.sync.get([
      "regexPatterns",
      "highlightPatterns",
    ]);
    filterPatterns = result.regexPatterns || [];
    highlightPatterns = result.highlightPatterns || [];
  } catch (error) {
    console.error("Error loading patterns:", error);
  }
}

// Load stored counts from storage
async function loadStoredCounts() {
  try {
    const result = await chrome.storage.local.get([
      "filteredCommentsCount",
      "highlightedCommentsCount",
      "totalCommentsCount",
    ]);
    filteredCommentsCount = result.filteredCommentsCount || 0;
    highlightedCommentsCount = result.highlightedCommentsCount || 0;
    totalCommentsCount = result.totalCommentsCount || 0;
  } catch (error) {
    console.error("Error loading stored counts:", error);
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
      updateCounts();
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
  const commentThreads = document.querySelectorAll(
    "ytd-comment-thread-renderer"
  );
  console.log(
    `🦍 King Kong: Processing ${commentThreads.length} existing comments`
  );

  commentThreads.forEach(processCommentThread);
  updateCounts();
}

// Process a single comment thread
function processCommentThread(commentThread) {
  // Skip if already processed
  if (commentThread.getAttribute("data-king-kong-processed") === "true") {
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

  // Mark as processed
  commentThread.setAttribute("data-king-kong-processed", "true");
  totalCommentsCount++;

  // Apply filtering if enabled
  if (isFilterEnabled && shouldFilterComment(commentText)) {
    hideComment(commentThread, commentText);
    return; // Don't highlight filtered comments
  }

  // Apply highlighting
  applyHighlighting(commentTextElement, commentText);

  // Ensure comment is visible (in case it was previously filtered)
  showComment(commentThread);
}

// Check if comment should be filtered
function shouldFilterComment(commentText) {
  if (!isFilterEnabled || filterPatterns.length === 0) {
    return false;
  }

  return filterPatterns.some((pattern) => {
    try {
      const regex = typeof pattern === "string" ? pattern : pattern.regex;
      const regexObj = new RegExp(regex, "i"); // Case insensitive
      return regexObj.test(commentText);
    } catch (error) {
      console.warn("🦍 King Kong: Invalid filter pattern:", pattern, error);
      return false;
    }
  });
}

// Apply highlighting to comment text
function applyHighlighting(commentTextElement, commentText) {
  if (highlightPatterns.length === 0) {
    return;
  }

  let hasHighlights = false;
  let highlightedHTML = commentText;
  let matchedColors = new Set(); // Track unique colors used

  // Apply each highlight pattern
  highlightPatterns.forEach((pattern) => {
    try {
      const regexObj = new RegExp(pattern.regex, "gi"); // Global and case insensitive
      const matches = commentText.match(regexObj);

      if (matches) {
        hasHighlights = true;
        matchedColors.add(pattern.color);
        // Replace matches with highlighted spans
        highlightedHTML = highlightedHTML.replace(regexObj, (match) => {
          return `<span style="background-color: ${pattern.color}; color: #000; padding: 2px 4px; border-radius: 3px; font-weight: 600;">${match}</span>`;
        });
      }
    } catch (error) {
      console.warn("🦍 King Kong: Invalid highlight pattern:", pattern, error);
    }
  });

  // Apply highlights if any were found
  if (hasHighlights) {
    commentTextElement.innerHTML = highlightedHTML;
    commentTextElement.setAttribute("data-king-kong-highlighted", "true");

    // Apply background color to the entire comment thread
    const commentThread = commentTextElement.closest(
      "ytd-comment-thread-renderer"
    );
    if (commentThread && matchedColors.size > 0) {
      // Use the first matched color for the background
      const backgroundColor = Array.from(matchedColors)[0];
      const rgbaColor = hexToRgba(backgroundColor, 0.1); // Low opacity background

      commentThread.style.backgroundColor = rgbaColor;
      commentThread.style.border = `1px solid ${hexToRgba(
        backgroundColor,
        0.3
      )}`;
      commentThread.style.borderRadius = "8px";
      commentThread.style.padding = "8px";
      commentThread.style.margin = "4px 0";
      commentThread.setAttribute("data-king-kong-thread-highlighted", "true");
      commentThread.setAttribute("data-highlight-color", backgroundColor);
    }

    highlightedCommentsCount++;
    console.log(
      "🦍 King Kong: Highlighted comment:",
      commentText.substring(0, 50) + "..."
    );
  }
}

// Helper function to convert hex to rgba
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Hide a comment
function hideComment(commentThread, commentText) {
  // Check if already hidden to avoid double-counting
  if (
    commentThread.style.display === "none" &&
    commentThread.getAttribute("data-king-kong-filtered") === "true"
  ) {
    return;
  }

  commentThread.style.display = "none";
  commentThread.setAttribute("data-king-kong-filtered", "true");
  filteredCommentsCount++;

  console.log(
    "🦍 King Kong: Filtered comment:",
    commentText.substring(0, 50) + "..."
  );

  // Add a subtle indicator for debugging
  if (!commentThread.querySelector(".king-kong-indicator")) {
    const indicator = document.createElement("div");
    indicator.className = "king-kong-indicator";
    indicator.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      background: #e74c3c;
      color: white;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 0 0 0 4px;
      z-index: 1000;
      pointer-events: none;
    `;
    indicator.textContent = "🦍 FILTERED";

    // Make the comment thread relatively positioned
    commentThread.style.position = "relative";
    commentThread.appendChild(indicator);
  }
}

// Show a comment
function showComment(commentThread) {
  if (commentThread.getAttribute("data-king-kong-filtered") === "true") {
    commentThread.style.display = "";
    commentThread.removeAttribute("data-king-kong-filtered");

    // Remove indicator
    const indicator = commentThread.querySelector(".king-kong-indicator");
    if (indicator) {
      indicator.remove();
    }

    if (filteredCommentsCount > 0) {
      filteredCommentsCount--;
    }
  }
}

// Update all counts and notify popup
async function updateCounts() {
  try {
    await chrome.storage.local.set({
      filteredCommentsCount,
      highlightedCommentsCount,
      totalCommentsCount,
    });

    // Notify popup to update stats display
    chrome.runtime
      .sendMessage({
        action: "updateStats",
      })
      .catch(() => {
        // Popup might not be open, ignore error
      });
  } catch (error) {
    console.error("Error updating counts:", error);
  }
}

// Reset all counts
function resetCounts() {
  filteredCommentsCount = 0;
  highlightedCommentsCount = 0;
  totalCommentsCount = 0;
  updateCounts();
}

// Show all comments (remove all filters)
function showAllComments() {
  const filteredComments = document.querySelectorAll(
    '[data-king-kong-filtered="true"]'
  );
  let restoredCount = 0;

  filteredComments.forEach((comment) => {
    comment.style.display = "";
    comment.removeAttribute("data-king-kong-filtered");

    // Remove indicator
    const indicator = comment.querySelector(".king-kong-indicator");
    if (indicator) {
      indicator.remove();
    }

    restoredCount++;
  });

  filteredCommentsCount = Math.max(0, filteredCommentsCount - restoredCount);
  updateCounts();

  console.log(`🦍 King Kong: Restored ${restoredCount} comments`);
}

// Remove all highlights
function removeAllHighlights() {
  const highlightedComments = document.querySelectorAll(
    '[data-king-kong-highlighted="true"]'
  );

  highlightedComments.forEach((commentElement) => {
    // Restore original text content
    const originalText =
      commentElement.textContent || commentElement.innerText || "";
    commentElement.innerHTML = originalText;
    commentElement.removeAttribute("data-king-kong-highlighted");
  });

  // Remove background styling from comment threads
  const highlightedThreads = document.querySelectorAll(
    '[data-king-kong-thread-highlighted="true"]'
  );

  highlightedThreads.forEach((thread) => {
    thread.style.backgroundColor = "";
    thread.style.border = "";
    thread.style.borderRadius = "";
    thread.style.padding = "";
    thread.style.margin = "";
    thread.removeAttribute("data-king-kong-thread-highlighted");
    thread.removeAttribute("data-highlight-color");
  });

  highlightedCommentsCount = 0;
  updateCounts();

  console.log("🦍 King Kong: Removed all highlights");
}

// Reprocess all comments (useful when patterns change)
function reprocessAllComments() {
  // Remove processing markers
  const processedComments = document.querySelectorAll(
    '[data-king-kong-processed="true"]'
  );
  processedComments.forEach((comment) => {
    comment.removeAttribute("data-king-kong-processed");
  });

  // Reset counts
  resetCounts();

  // Remove existing highlights
  removeAllHighlights();

  // Reprocess
  processExistingComments();

  console.log("🦍 King Kong: Reprocessed all comments");
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "toggleFilter":
      isFilterEnabled = request.enabled;
      if (request.enabled) {
        processExistingComments();
      } else {
        showAllComments();
      }
      break;

    case "updatePatterns":
      filterPatterns = request.patterns;
      reprocessAllComments();
      break;

    case "updateHighlightPatterns":
      highlightPatterns = request.patterns;
      reprocessAllComments();
      break;

    case "getStats":
      sendResponse({
        filtered: filteredCommentsCount,
        highlighted: highlightedCommentsCount,
        total: totalCommentsCount,
      });
      break;
  }
});

// Handle navigation in YouTube SPA
let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    console.log("🦍 King Kong: Page navigation detected, reinitializing...");

    // Reset observer and reinitialize
    stopObserving();
    setTimeout(() => {
      init();
    }, 1000); // Small delay to let page load
  }
}).observe(document, { subtree: true, childList: true });

// Initialize when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
