// Tab Manager Module - Handles tabbed interface
class TabManager {
  constructor() {
    this.activeTab = "filter";
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.showTab(this.activeTab);
  }

  setupEventListeners() {
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabId = button.getAttribute("data-tab");
        this.showTab(tabId);
      });
    });
  }

  showTab(tabId) {
    // Update active tab
    this.activeTab = tabId;

    // Update tab buttons
    const tabButtons = document.querySelectorAll(".tab-button");
    tabButtons.forEach((button) => {
      if (button.getAttribute("data-tab") === tabId) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Update tab content
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach((content) => {
      if (content.id === `${tabId}Tab`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });

    // Update header based on active tab
    this.updateHeader(tabId);
  }

  updateHeader(tabId) {
    const statusSection = document.querySelector(".status");
    const searchStatusSection = document.querySelector(".search-status");

    switch (tabId) {
      case "filter":
        statusSection.style.display = "flex";
        if (searchStatusSection) {
          searchStatusSection.style.display = "flex";
        }
        break;
      case "highlight":
        statusSection.style.display = "none";
        if (searchStatusSection) {
          searchStatusSection.style.display = "none";
        }
        break;
    }
  }

  getActiveTab() {
    return this.activeTab;
  }
}
