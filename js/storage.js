// Storage Module - Handles all Chrome storage operations
class StorageManager {
  static async getFilterSettings() {
    try {
      const result = await chrome.storage.sync.get(["filterEnabled"]);
      return result.filterEnabled || false;
    } catch (error) {
      console.error("Error loading filter settings:", error);
      return false;
    }
  }

  static async setFilterSettings(enabled) {
    try {
      await chrome.storage.sync.set({ filterEnabled: enabled });
    } catch (error) {
      console.error("Error saving filter settings:", error);
    }
  }

  static async getFilterPatterns() {
    try {
      const result = await chrome.storage.sync.get(["regexPatterns"]);
      return result.regexPatterns || [];
    } catch (error) {
      console.error("Error loading filter patterns:", error);
      return [];
    }
  }

  static async setFilterPatterns(patterns) {
    try {
      await chrome.storage.sync.set({ regexPatterns: patterns });
    } catch (error) {
      console.error("Error saving filter patterns:", error);
    }
  }

  static async getHighlightPatterns() {
    try {
      const result = await chrome.storage.sync.get(["highlightPatterns"]);
      return result.highlightPatterns || [];
    } catch (error) {
      console.error("Error loading highlight patterns:", error);
      return [];
    }
  }

  static async setHighlightPatterns(patterns) {
    try {
      await chrome.storage.sync.set({ highlightPatterns: patterns });
    } catch (error) {
      console.error("Error saving highlight patterns:", error);
    }
  }

  static async getFilteredCount() {
    try {
      const result = await chrome.storage.local.get(["filteredCommentsCount"]);
      return result.filteredCommentsCount || 0;
    } catch (error) {
      console.error("Error loading filtered count:", error);
      return 0;
    }
  }

  static async setFilteredCount(count) {
    try {
      await chrome.storage.local.set({ filteredCommentsCount: count });
    } catch (error) {
      console.error("Error saving filtered count:", error);
    }
  }

  static async loadDefaultPatterns() {
    try {
      const response = await fetch(chrome.runtime.getURL("default.json"));
      if (!response.ok) {
        throw new Error("Failed to fetch default patterns");
      }
      return await response.json();
    } catch (error) {
      console.error("Error loading default patterns:", error);
      return [];
    }
  }
}
