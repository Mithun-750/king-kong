// Stats Manager Module - Handles statistics tracking and display
class StatsManager {
  constructor() {
    this.stats = {
      filteredComments: 0,
      highlightedComments: 0,
      totalComments: 0,
    };
    this.init();
  }

  async init() {
    await this.loadStats();
    this.displayStats();
    this.setupEventListeners();
  }

  async loadStats() {
    try {
      const result = await chrome.storage.local.get([
        "filteredCommentsCount",
        "highlightedCommentsCount",
        "totalCommentsCount",
      ]);

      this.stats.filteredComments = result.filteredCommentsCount || 0;
      this.stats.highlightedComments = result.highlightedCommentsCount || 0;
      this.stats.totalComments = result.totalCommentsCount || 0;
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  setupEventListeners() {
    const resetStatsBtn = document.getElementById("resetStats");

    resetStatsBtn?.addEventListener("click", () => this.resetStats());
  }

  displayStats() {
    // Update filtered comments count
    const filteredCountElement = document.getElementById("filteredCount");
    if (filteredCountElement) {
      filteredCountElement.textContent = this.stats.filteredComments;
    }

    // Update highlighted comments count
    const highlightedCountElement = document.getElementById("highlightedCount");
    if (highlightedCountElement) {
      highlightedCountElement.textContent = this.stats.highlightedComments;
    }

    // Update total comments processed
    const totalCountElement = document.getElementById("totalCount");
    if (totalCountElement) {
      totalCountElement.textContent = this.stats.totalComments;
    }

    // Calculate efficiency percentage
    const efficiencyElement = document.getElementById("efficiency");
    if (efficiencyElement) {
      if (this.stats.totalComments > 0) {
        const efficiency = (
          ((this.stats.filteredComments + this.stats.highlightedComments) /
            this.stats.totalComments) *
          100
        ).toFixed(1);
        efficiencyElement.textContent = `${efficiency}%`;
      } else {
        efficiencyElement.textContent = "0%";
      }
    }

    // Update filter rate
    const filterRateElement = document.getElementById("filterRate");
    if (filterRateElement) {
      if (this.stats.totalComments > 0) {
        const rate = (
          (this.stats.filteredComments / this.stats.totalComments) *
          100
        ).toFixed(1);
        filterRateElement.textContent = `${rate}%`;
      } else {
        filterRateElement.textContent = "0%";
      }
    }

    // Update highlight rate
    const highlightRateElement = document.getElementById("highlightRate");
    if (highlightRateElement) {
      if (this.stats.totalComments > 0) {
        const rate = (
          (this.stats.highlightedComments / this.stats.totalComments) *
          100
        ).toFixed(1);
        highlightRateElement.textContent = `${rate}%`;
      } else {
        highlightRateElement.textContent = "0%";
      }
    }
  }

  async updateFilteredCount(count) {
    this.stats.filteredComments = count;
    await this.saveStats();
    this.displayStats();
  }

  async incrementHighlightedCount() {
    this.stats.highlightedComments++;
    await this.saveStats();
    this.displayStats();
  }

  async incrementTotalCount() {
    this.stats.totalComments++;
    await this.saveStats();
    this.displayStats();
  }

  async saveStats() {
    try {
      await chrome.storage.local.set({
        filteredCommentsCount: this.stats.filteredComments,
        highlightedCommentsCount: this.stats.highlightedComments,
        totalCommentsCount: this.stats.totalComments,
      });
    } catch (error) {
      console.error("Error saving stats:", error);
    }
  }

  async resetStats() {
    if (confirm("Are you sure you want to reset all statistics?")) {
      this.stats = {
        filteredComments: 0,
        highlightedComments: 0,
        totalComments: 0,
      };

      await this.saveStats();
      this.displayStats();
      Utils.showNotification("Statistics reset successfully", "success");
    }
  }

  // Listen for messages from content script
  handleMessage(request) {
    switch (request.action) {
      case "updateStats":
        this.displayStats();
        break;
      case "incrementHighlighted":
        this.incrementHighlightedCount();
        break;
      case "incrementTotal":
        this.incrementTotalCount();
        break;
    }
  }
}
