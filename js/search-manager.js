// Search Manager Module - Handles search bar functionality
class SearchManager {
  constructor() {
    this.isEnabled = false;
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateToggleUI();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(["searchBarEnabled"]);
      this.isEnabled =
        result.searchBarEnabled !== undefined ? result.searchBarEnabled : true; // Default to enabled
    } catch (error) {
      console.error("Error loading search settings:", error);
      this.isEnabled = true; // Default to enabled
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        searchBarEnabled: this.isEnabled,
      });
    } catch (error) {
      console.error("Error saving search settings:", error);
    }
  }

  updateToggleUI() {
    const enableSearchBarCheckbox = document.getElementById("enableSearchBar");
    const searchStatusText = document.getElementById("searchStatusText");

    if (enableSearchBarCheckbox) {
      enableSearchBarCheckbox.checked = this.isEnabled;
    }

    if (searchStatusText) {
      searchStatusText.textContent = this.isEnabled
        ? "Search Bar Enabled"
        : "Search Bar Disabled";
      searchStatusText.style.color = this.isEnabled ? "#4ecdc4" : "#a0a0a0";
    }
  }

  setupEventListeners() {
    const enableSearchBarCheckbox = document.getElementById("enableSearchBar");

    if (enableSearchBarCheckbox) {
      enableSearchBarCheckbox.addEventListener("change", () =>
        this.toggleSearchBar()
      );
    }
  }

  async toggleSearchBar() {
    this.isEnabled = !this.isEnabled;
    await this.saveSettings();
    this.updateToggleUI();

    // Send message to content script to show/hide search bar
    Utils.sendToContentScript({
      action: "toggleSearchBar",
      enabled: this.isEnabled,
    });

    // Show notification
    Utils.showNotification(
      this.isEnabled ? "Search bar enabled" : "Search bar disabled",
      "success"
    );
  }

  // Method to be called by other managers if needed
  getSearchBarStatus() {
    return this.isEnabled;
  }
}
