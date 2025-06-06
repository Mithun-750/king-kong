// Main Popup Script - Initializes all managers and handles communication

// Global managers
let tabManager;
let filterManager;
let highlightManager;
let searchManager;

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize all managers in the correct order
    tabManager = new TabManager();
    filterManager = new FilterManager();
    highlightManager = new HighlightManager();
    searchManager = new SearchManager();

    console.log("🦍 King Kong popup initialized successfully");
  } catch (error) {
    console.error("Error initializing popup:", error);
    Utils.showNotification("Error initializing extension", "error");
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Message handling for remaining managers can be added here if needed
});
