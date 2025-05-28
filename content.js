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
let searchTerm = "";
let searchInput = null;

// Initialize the extension
async function init() {
  await loadSettings();
  await loadPatterns();
  await loadStoredCounts();

  startObserving();

  // Inject search functionality
  injectSearchInput();

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
    let hasNewCommentsHeader = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        // Check for new comment elements
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for comments header
            if (node.matches && node.matches("ytd-comments-header-renderer")) {
              hasNewCommentsHeader = true;
            } else if (
              node.querySelector &&
              node.querySelector("ytd-comments-header-renderer")
            ) {
              hasNewCommentsHeader = true;
            }

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

    if (hasNewCommentsHeader) {
      // Inject search input when comments header appears
      setTimeout(injectSearchInput, 100);
    }

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

  // Apply search filter first
  if (searchTerm) {
    const lowerCommentText = commentText.toLowerCase();
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerCommentText.includes(lowerSearchTerm)) {
      commentThread.style.display = "none";
      commentThread.setAttribute("data-king-kong-search-hidden", "true");
      return; // Don't process further if hidden by search
    } else {
      commentThread.removeAttribute("data-king-kong-search-hidden");
    }
  }

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

// Inject search input into YouTube comments header
function injectSearchInput() {
  // Check if search input already exists
  if (searchInput && document.contains(searchInput)) {
    return;
  }

  const commentsHeader = document.querySelector("ytd-comments-header-renderer");
  if (!commentsHeader) {
    // If comments header not found, try again later
    setTimeout(injectSearchInput, 1000);
    return;
  }

  const titleDiv = commentsHeader.querySelector("#title");
  if (!titleDiv) {
    setTimeout(injectSearchInput, 1000);
    return;
  }

  // Create search container
  const searchContainer = document.createElement("div");
  searchContainer.id = "king-kong-search-container";
  searchContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0;
    margin-left: 24px;
    flex: 1;
    max-width: 400px;
    position: relative;
  `;

  // Create search input wrapper
  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = `
    display: flex;
    align-items: center;
    flex: 1;
    position: relative;
    border-bottom: 1px solid var(--yt-spec-icon-disabled);
    transition: border-color 0.2s ease;
  `;

  // Create magnifying glass SVG icon
  const searchIcon = document.createElement("div");
  searchIcon.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
    </svg>
  `;
  searchIcon.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 12px 8px 0;
    color: var(--yt-spec-icon-inactive);
    pointer-events: none;
  `;

  // Create search input
  searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.id = "king-kong-search-input";
  searchInput.placeholder = "Search comments...";
  searchInput.style.cssText = `
    flex: 1;
    padding: 8px 0 8px 8px;
    border: none;
    background: transparent;
    color: var(--yt-spec-text-primary);
    font-size: 14px;
    font-family: "Roboto", "Arial", sans-serif;
    outline: none;
    font-weight: 400;
    line-height: 20px;
  `;

  // Create clear button
  const clearButton = document.createElement("button");
  clearButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
    </svg>
  `;
  clearButton.title = "Clear search";
  clearButton.style.cssText = `
    display: none;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--yt-spec-icon-inactive);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-right: 4px;
  `;

  // Add event listeners
  searchInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    searchTerm = value;

    // Show/hide clear button
    if (value) {
      clearButton.style.display = "flex";
    } else {
      clearButton.style.display = "none";
    }

    // Apply search filter
    applySearchFilter(value);
  });

  searchInput.addEventListener("focus", () => {
    inputWrapper.style.borderBottomColor = "var(--yt-spec-text-primary)";
    inputWrapper.style.borderBottomWidth = "2px";
    searchIcon.style.color = "var(--yt-spec-text-primary)";
  });

  searchInput.addEventListener("blur", () => {
    inputWrapper.style.borderBottomColor = "var(--yt-spec-icon-disabled)";
    inputWrapper.style.borderBottomWidth = "1px";
    searchIcon.style.color = "var(--yt-spec-icon-inactive)";
  });

  clearButton.addEventListener("click", () => {
    searchInput.value = "";
    searchTerm = "";
    clearButton.style.display = "none";
    applySearchFilter("");
    searchInput.focus();
  });

  clearButton.addEventListener("mouseover", () => {
    clearButton.style.backgroundColor = "var(--yt-spec-badge-chip-background)";
    clearButton.style.color = "var(--yt-spec-text-primary)";
  });

  clearButton.addEventListener("mouseout", () => {
    clearButton.style.backgroundColor = "transparent";
    clearButton.style.color = "var(--yt-spec-icon-inactive)";
  });

  // Assemble the search UI
  inputWrapper.appendChild(searchIcon);
  inputWrapper.appendChild(searchInput);
  inputWrapper.appendChild(clearButton);
  searchContainer.appendChild(inputWrapper);

  // Insert search container into the title div
  titleDiv.style.display = "flex";
  titleDiv.style.alignItems = "center";
  titleDiv.appendChild(searchContainer);

  console.log("🦍 King Kong: Search input injected successfully");
}

// Apply search filter to comments
function applySearchFilter(term) {
  const commentThreads = document.querySelectorAll(
    "ytd-comment-thread-renderer"
  );

  // First, clear all existing search highlights regardless of the term
  commentThreads.forEach((thread) => {
    const commentTextElement = thread.querySelector(
      ".yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap"
    );
    if (
      commentTextElement &&
      commentTextElement.getAttribute("data-king-kong-search-highlighted") ===
        "true"
    ) {
      const originalHTML =
        commentTextElement.getAttribute("data-original-html");
      if (originalHTML) {
        commentTextElement.innerHTML = originalHTML;
      }
      commentTextElement.removeAttribute("data-king-kong-search-highlighted");
      // Keep the original HTML stored for potential re-highlighting
    }
  });

  if (!term) {
    // Show all comments and clean up when search is empty
    commentThreads.forEach((thread) => {
      thread.style.display = "";
      thread.removeAttribute("data-king-kong-search-hidden");

      const commentTextElement = thread.querySelector(
        ".yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap"
      );
      if (commentTextElement) {
        commentTextElement.removeAttribute("data-original-html");
      }
    });
    console.log("🦍 King Kong: Search cleared, showing all comments");
    return;
  }

  const lowerTerm = term.toLowerCase();
  let hiddenCount = 0;
  let visibleCount = 0;

  commentThreads.forEach((thread) => {
    const commentTextElement = thread.querySelector(
      ".yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap"
    );

    if (!commentTextElement) {
      return;
    }

    // Get the actual text content (without HTML tags)
    const commentText =
      commentTextElement.textContent || commentTextElement.innerText || "";
    const lowerCommentText = commentText.toLowerCase();

    // Check if comment contains search term
    if (lowerCommentText.includes(lowerTerm)) {
      thread.style.display = "";
      thread.removeAttribute("data-king-kong-search-hidden");
      visibleCount++;

      // Store original HTML if not already stored
      if (!commentTextElement.getAttribute("data-original-html")) {
        const originalHTML = commentTextElement.innerHTML;
        commentTextElement.setAttribute("data-original-html", originalHTML);
      }

      // Apply highlighting to the current HTML content
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedTerm})`, "gi");

      // Get current HTML (should be the original at this point)
      const workingHTML = commentTextElement.innerHTML;

      // Find all text nodes and replace the search term
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = workingHTML;

      // Function to recursively process text nodes
      function highlightTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          if (regex.test(text)) {
            const highlightedText = text.replace(regex, (match) => {
              return `<span class="king-kong-search-highlight" style="background-color: rgba(255, 255, 255, 0.2); padding: 1px 2px; border-radius: 2px;">${match}</span>`;
            });

            // Replace the text node with highlighted content
            const wrapper = document.createElement("span");
            wrapper.innerHTML = highlightedText;
            node.parentNode.replaceChild(wrapper, node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Don't highlight inside existing highlight spans
          if (!node.classList.contains("king-kong-search-highlight")) {
            const children = Array.from(node.childNodes);
            children.forEach((child) => highlightTextNodes(child));
          }
        }
      }

      highlightTextNodes(tempDiv);
      commentTextElement.innerHTML = tempDiv.innerHTML;
      commentTextElement.setAttribute(
        "data-king-kong-search-highlighted",
        "true"
      );
    } else {
      thread.style.display = "none";
      thread.setAttribute("data-king-kong-search-hidden", "true");
      hiddenCount++;
    }
  });

  console.log(
    `🦍 King Kong: Search "${term}" - ${visibleCount} visible, ${hiddenCount} hidden`
  );
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
