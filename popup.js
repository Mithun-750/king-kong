// DOM elements
const enableFilterCheckbox = document.getElementById("enableFilter");
const statusText = document.getElementById("statusText");
const showAddFormBtn = document.getElementById("showAddFormBtn");
const addPatternForm = document.getElementById("addPatternForm");
const patternTitle = document.getElementById("patternTitle");
const regexInput = document.getElementById("regexInput");
const addPatternBtn = document.getElementById("addPattern");
const cancelAddBtn = document.getElementById("cancelAdd");
const patternsList = document.getElementById("patternsList");
const filteredCount = document.getElementById("filteredCount");
const clearAllBtn = document.getElementById("clearAll");
const loadDefaultsBtn = document.getElementById("loadDefaults");
const exportPatternsBtn = document.getElementById("exportPatterns");
const importPatternsBtn = document.getElementById("importPatterns");

// Initialize popup
document.addEventListener("DOMContentLoaded", async () => {
  await loadSettings();
  await loadPatterns();
  await updateStats();
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["filterEnabled"]);
    const isEnabled = result.filterEnabled || false;

    enableFilterCheckbox.checked = isEnabled;
    updateStatusText(isEnabled);
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Load patterns from storage
async function loadPatterns() {
  try {
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    const patterns = result.regexPatterns || [];

    // If no patterns exist, automatically load defaults on first use
    if (patterns.length === 0) {
      console.log("No patterns found, loading defaults...");
      await loadDefaultPatternsQuietly();

      // Reload patterns after loading defaults
      const updatedResult = await chrome.storage.sync.get(["regexPatterns"]);
      displayPatterns(updatedResult.regexPatterns || []);
    } else {
      displayPatterns(patterns);
    }
  } catch (error) {
    console.error("Error loading patterns:", error);
  }
}

// Display patterns in the UI
function displayPatterns(patterns) {
  if (patterns.length === 0) {
    patternsList.innerHTML =
      '<div class="empty-state">No patterns added yet</div>';
    return;
  }

  patternsList.innerHTML = patterns
    .map((pattern, index) => {
      // Handle both old string format and new object format for backwards compatibility
      const patternObj =
        typeof pattern === "string" ? { regex: pattern, title: "" } : pattern;
      const displayTitle = patternObj.title
        ? `<div class="pattern-title">${escapeHtml(patternObj.title)}</div>`
        : "";
      const escapedRegex = escapeHtml(patternObj.regex);

      return `
        <div class="pattern-item" data-index="${index}">
            <div class="pattern-content">
                ${displayTitle}
                <div class="pattern-text">${escapedRegex}</div>
            </div>
            <div class="pattern-actions">
                <button class="btn-small btn-test" data-pattern="${escapedRegex}">Test</button>
                <button class="btn-small btn-delete" data-index="${index}">Delete</button>
            </div>
        </div>
    `;
    })
    .join("");

  // Add event listeners for all test and delete buttons
  setupPatternEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  enableFilterCheckbox.addEventListener("change", toggleFilter);
  showAddFormBtn.addEventListener("click", showAddForm);
  addPatternBtn.addEventListener("click", addPattern);
  cancelAddBtn.addEventListener("click", hideAddForm);

  // Enter key to add pattern from either input
  patternTitle.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addPattern();
    } else if (e.key === "Escape") {
      hideAddForm();
    }
  });

  regexInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addPattern();
    } else if (e.key === "Escape") {
      hideAddForm();
    }
  });

  clearAllBtn.addEventListener("click", clearAllPatterns);
  loadDefaultsBtn.addEventListener("click", loadDefaultPatterns);
  exportPatternsBtn.addEventListener("click", exportPatterns);
  importPatternsBtn.addEventListener("click", importPatterns);
}

// Toggle filter on/off
async function toggleFilter() {
  const isEnabled = enableFilterCheckbox.checked;

  try {
    await chrome.storage.sync.set({ filterEnabled: isEnabled });
    updateStatusText(isEnabled);

    // Send message to content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url.includes("youtube.com")) {
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleFilter",
        enabled: isEnabled,
      });
    }
  } catch (error) {
    console.error("Error toggling filter:", error);
  }
}

// Update status text
function updateStatusText(isEnabled) {
  statusText.textContent = isEnabled ? "Filter Enabled" : "Filter Disabled";
  statusText.style.color = isEnabled ? "#4ecdc4" : "#a0a0a0";
}

// Add new regex pattern
async function addPattern() {
  const pattern = regexInput.value.trim();
  const title = patternTitle.value.trim();

  if (!pattern) {
    showNotification("Please enter a regex pattern", "error");
    return;
  }

  // Validate regex
  try {
    new RegExp(pattern);
  } catch (error) {
    showNotification("Invalid regex pattern", "error");
    return;
  }

  try {
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    const patterns = result.regexPatterns || [];

    // Create pattern object
    const newPattern = {
      regex: pattern,
      title: title || `Pattern ${patterns.length + 1}`,
    };

    // Check if pattern already exists (compare regex only)
    const existingPattern = patterns.find((p) => {
      const existingRegex = typeof p === "string" ? p : p.regex;
      return existingRegex === pattern;
    });

    if (existingPattern) {
      showNotification("Pattern already exists", "warning");
      return;
    }

    patterns.push(newPattern);
    await chrome.storage.sync.set({ regexPatterns: patterns });

    displayPatterns(patterns);

    // Hide form and clear inputs after successful addition
    hideAddForm();

    showNotification("Pattern added successfully", "success");

    // Update content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url.includes("youtube.com")) {
      chrome.tabs.sendMessage(tab.id, {
        action: "updatePatterns",
        patterns: patterns,
      });
    }
  } catch (error) {
    console.error("Error adding pattern:", error);
    showNotification("Error adding pattern", "error");
  }
}

// Delete pattern
async function deletePattern(index) {
  try {
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    const patterns = result.regexPatterns || [];

    patterns.splice(index, 1);
    await chrome.storage.sync.set({ regexPatterns: patterns });

    displayPatterns(patterns);
    showNotification("Pattern deleted", "success");

    // Update content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url.includes("youtube.com")) {
      chrome.tabs.sendMessage(tab.id, {
        action: "updatePatterns",
        patterns: patterns,
      });
    }
  } catch (error) {
    console.error("Error deleting pattern:", error);
    showNotification("Error deleting pattern", "error");
  }
}

// Test pattern
function testPattern(pattern) {
  const testString = prompt(
    "Enter text to test against pattern:",
    "Test comment text here"
  );
  if (testString !== null) {
    try {
      const regex = new RegExp(pattern, "i");
      const matches = regex.test(testString);
      showNotification(
        matches ? "Pattern matches!" : "Pattern does not match",
        matches ? "success" : "info"
      );
    } catch (error) {
      showNotification("Invalid regex pattern", "error");
    }
  }
}

// Clear all patterns
async function clearAllPatterns() {
  if (confirm("Are you sure you want to delete all patterns?")) {
    try {
      await chrome.storage.sync.set({ regexPatterns: [] });
      displayPatterns([]);
      showNotification("All patterns cleared", "success");

      // Update content script
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url.includes("youtube.com")) {
        chrome.tabs.sendMessage(tab.id, {
          action: "updatePatterns",
          patterns: [],
        });
      }
    } catch (error) {
      console.error("Error clearing patterns:", error);
      showNotification("Error clearing patterns", "error");
    }
  }
}

// Export patterns
async function exportPatterns() {
  try {
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    const patterns = result.regexPatterns || [];

    const data = {
      version: "1.1",
      exportDate: new Date().toISOString(),
      patterns: patterns.map((pattern) => {
        // Ensure all patterns are in object format for export
        if (typeof pattern === "string") {
          return { regex: pattern, title: `Imported Pattern` };
        }
        return pattern;
      }),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "king-kong-patterns.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Patterns exported successfully", "success");
  } catch (error) {
    console.error("Error exporting patterns:", error);
    showNotification("Error exporting patterns", "error");
  }
}

// Import patterns
function importPatterns() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.patterns || !Array.isArray(data.patterns)) {
        showNotification("Invalid file format", "error");
        return;
      }

      // Validate and normalize all patterns
      const normalizedPatterns = [];
      for (const pattern of data.patterns) {
        try {
          let patternObj;

          // Handle different formats
          if (typeof pattern === "string") {
            // Old format - string only
            new RegExp(pattern); // Validate regex
            patternObj = { regex: pattern, title: `Imported Pattern` };
          } else if (pattern.regex) {
            // New format - object with regex and title
            new RegExp(pattern.regex); // Validate regex
            patternObj = {
              regex: pattern.regex,
              title: pattern.title || `Imported Pattern`,
            };
          } else {
            throw new Error("Invalid pattern format");
          }

          normalizedPatterns.push(patternObj);
        } catch (error) {
          showNotification(
            `Invalid pattern: ${JSON.stringify(pattern)}`,
            "error"
          );
          return;
        }
      }

      await chrome.storage.sync.set({ regexPatterns: normalizedPatterns });
      displayPatterns(normalizedPatterns);
      showNotification(
        `Imported ${normalizedPatterns.length} patterns successfully`,
        "success"
      );

      // Update content script
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url.includes("youtube.com")) {
        chrome.tabs.sendMessage(tab.id, {
          action: "updatePatterns",
          patterns: normalizedPatterns,
        });
      }
    } catch (error) {
      console.error("Error importing patterns:", error);
      showNotification("Error importing patterns", "error");
    }
  };

  input.click();
}

// Update statistics
async function updateStats() {
  try {
    const result = await chrome.storage.local.get(["filteredCommentsCount"]);
    const count = result.filteredCommentsCount || 0;
    filteredCount.textContent = count;
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

// Show notification
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;

  switch (type) {
    case "success":
      notification.style.background =
        "linear-gradient(45deg, #4ecdc4, #44a08d)";
      break;
    case "error":
      notification.style.background =
        "linear-gradient(45deg, #e74c3c, #c0392b)";
      break;
    case "warning":
      notification.style.background =
        "linear-gradient(45deg, #f39c12, #e67e22)";
      break;
    default:
      notification.style.background =
        "linear-gradient(45deg, #3498db, #2980b9)";
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateStats") {
    updateStats();
  }
});

// Load default patterns
async function loadDefaultPatterns() {
  try {
    // Fetch the default patterns from the extension's default.json file
    const response = await fetch(chrome.runtime.getURL("default.json"));
    if (!response.ok) {
      throw new Error("Failed to fetch default patterns");
    }

    const defaultPatterns = await response.json();

    // Validate the patterns
    const validPatterns = [];
    for (const pattern of defaultPatterns) {
      try {
        if (pattern.regex && pattern.title) {
          new RegExp(pattern.regex); // Validate regex
          validPatterns.push(pattern);
        }
      } catch (error) {
        console.warn("Invalid default pattern:", pattern, error);
      }
    }

    if (validPatterns.length === 0) {
      showNotification("No valid default patterns found", "error");
      return;
    }

    // Get existing patterns
    const result = await chrome.storage.sync.get(["regexPatterns"]);
    const existingPatterns = result.regexPatterns || [];

    // Check for duplicates and add only new patterns
    const newPatterns = [];
    for (const defaultPattern of validPatterns) {
      const exists = existingPatterns.some((existing) => {
        const existingRegex =
          typeof existing === "string" ? existing : existing.regex;
        return existingRegex === defaultPattern.regex;
      });

      if (!exists) {
        newPatterns.push(defaultPattern);
      }
    }

    if (newPatterns.length === 0) {
      showNotification("All default patterns already exist", "info");
      return;
    }

    // Add new patterns to existing ones
    const allPatterns = [...existingPatterns, ...newPatterns];
    await chrome.storage.sync.set({ regexPatterns: allPatterns });

    displayPatterns(allPatterns);
    showNotification(
      `Added ${newPatterns.length} default pattern(s)`,
      "success"
    );

    // Update content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab && tab.url.includes("youtube.com")) {
      chrome.tabs.sendMessage(tab.id, {
        action: "updatePatterns",
        patterns: allPatterns,
      });
    }
  } catch (error) {
    console.error("Error loading default patterns:", error);
    showNotification("Error loading default patterns", "error");
  }
}

// Load default patterns quietly (without notifications)
async function loadDefaultPatternsQuietly() {
  try {
    const response = await fetch(chrome.runtime.getURL("default.json"));
    if (!response.ok) {
      throw new Error("Failed to fetch default patterns");
    }

    const defaultPatterns = await response.json();

    // Validate the patterns
    const validPatterns = [];
    for (const pattern of defaultPatterns) {
      try {
        if (pattern.regex && pattern.title) {
          new RegExp(pattern.regex); // Validate regex
          validPatterns.push(pattern);
        }
      } catch (error) {
        console.warn("Invalid default pattern:", pattern, error);
      }
    }

    if (validPatterns.length > 0) {
      await chrome.storage.sync.set({ regexPatterns: validPatterns });
      console.log(`Loaded ${validPatterns.length} default patterns`);
    }
  } catch (error) {
    console.error("Error loading default patterns quietly:", error);
  }
}

// Add event listeners for all test and delete buttons
function setupPatternEventListeners() {
  const testButtons = document.querySelectorAll(".btn-test");
  const deleteButtons = document.querySelectorAll(".btn-delete");

  testButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pattern = button.getAttribute("data-pattern");
      testPattern(pattern);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = button.getAttribute("data-index");
      deletePattern(index);
    });
  });
}

// Show add pattern form
function showAddForm() {
  showAddFormBtn.classList.add("hidden");
  addPatternForm.classList.remove("hidden");

  // Focus on the title input for better UX
  setTimeout(() => {
    patternTitle.focus();
  }, 100);
}

// Hide add pattern form
function hideAddForm() {
  addPatternForm.classList.add("hidden");
  showAddFormBtn.classList.remove("hidden");

  // Clear form inputs
  patternTitle.value = "";
  regexInput.value = "";
}
