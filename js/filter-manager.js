// Filter Manager Module - Handles comment filtering functionality
class FilterManager {
  constructor() {
    this.patterns = [];
    this.isEnabled = false;
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadPatterns();
    this.setupEventListeners();
  }

  async loadSettings() {
    this.isEnabled = await StorageManager.getFilterSettings();
    this.updateToggleUI();
  }

  async loadPatterns() {
    this.patterns = await StorageManager.getFilterPatterns();

    // Auto-load defaults if no patterns exist
    if (this.patterns.length === 0) {
      await this.loadDefaultPatternsQuietly();
      this.patterns = await StorageManager.getFilterPatterns();
    }

    this.displayPatterns();
  }

  updateToggleUI() {
    const enableFilterCheckbox = document.getElementById("enableFilter");
    const statusText = document.getElementById("statusText");

    enableFilterCheckbox.checked = this.isEnabled;
    statusText.textContent = this.isEnabled
      ? "Filter Enabled"
      : "Filter Disabled";
    statusText.style.color = this.isEnabled ? "#4ecdc4" : "#a0a0a0";
  }

  setupEventListeners() {
    const enableFilterCheckbox = document.getElementById("enableFilter");
    const showAddFormBtn = document.getElementById("showFilterFormBtn");
    const addPatternBtn = document.getElementById("addFilterPattern");
    const cancelAddBtn = document.getElementById("cancelFilterAdd");
    const clearAllBtn = document.getElementById("clearAllFilter");
    const loadDefaultsBtn = document.getElementById("loadDefaultsFilter");
    const exportBtn = document.getElementById("exportFilter");
    const importBtn = document.getElementById("importFilter");

    enableFilterCheckbox?.addEventListener("change", () => this.toggleFilter());
    showAddFormBtn?.addEventListener("click", () => this.showAddForm());
    addPatternBtn?.addEventListener("click", () => this.addPattern());
    cancelAddBtn?.addEventListener("click", () => this.hideAddForm());
    clearAllBtn?.addEventListener("click", () => this.clearAllPatterns());
    loadDefaultsBtn?.addEventListener("click", () =>
      this.loadDefaultPatterns()
    );
    exportBtn?.addEventListener("click", () => this.exportPatterns());
    importBtn?.addEventListener("click", () => this.importPatterns());

    // Keyboard shortcuts
    const titleInput = document.getElementById("filterPatternTitle");
    const regexInput = document.getElementById("filterRegexInput");

    [titleInput, regexInput].forEach((input) => {
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.addPattern();
        if (e.key === "Escape") this.hideAddForm();
      });
    });
  }

  async toggleFilter() {
    this.isEnabled = !this.isEnabled;
    await StorageManager.setFilterSettings(this.isEnabled);
    this.updateToggleUI();

    Utils.sendToContentScript({
      action: "toggleFilter",
      enabled: this.isEnabled,
    });
  }

  showAddForm() {
    const showBtn = document.getElementById("showFilterFormBtn");
    const form = document.getElementById("addFilterForm");
    const titleInput = document.getElementById("filterPatternTitle");

    showBtn?.classList.add("hidden");
    form?.classList.remove("hidden");

    setTimeout(() => titleInput?.focus(), 100);
  }

  hideAddForm() {
    const showBtn = document.getElementById("showFilterFormBtn");
    const form = document.getElementById("addFilterForm");
    const titleInput = document.getElementById("filterPatternTitle");
    const regexInput = document.getElementById("filterRegexInput");

    form?.classList.add("hidden");
    showBtn?.classList.remove("hidden");

    if (titleInput) titleInput.value = "";
    if (regexInput) regexInput.value = "";
  }

  async addPattern() {
    const titleInput = document.getElementById("filterPatternTitle");
    const regexInput = document.getElementById("filterRegexInput");

    const title = titleInput?.value.trim() || "";
    const regex = regexInput?.value.trim() || "";

    if (!regex) {
      Utils.showNotification("Please enter a regex pattern", "error");
      return;
    }

    if (!Utils.isValidRegex(regex)) {
      Utils.showNotification("Invalid regex pattern", "error");
      return;
    }

    // Check for duplicates
    const exists = this.patterns.some((p) => {
      const existingRegex = typeof p === "string" ? p : p.regex;
      return existingRegex === regex;
    });

    if (exists) {
      Utils.showNotification("Pattern already exists", "warning");
      return;
    }

    const newPattern = {
      regex: regex,
      title: title || `Filter Pattern ${this.patterns.length + 1}`,
    };

    this.patterns.push(newPattern);
    await StorageManager.setFilterPatterns(this.patterns);

    this.displayPatterns();
    this.hideAddForm();

    Utils.showNotification("Filter pattern added successfully", "success");
    Utils.sendToContentScript({
      action: "updatePatterns",
      patterns: this.patterns,
    });
  }

  displayPatterns() {
    const patternsList = document.getElementById("filterPatternsList");
    if (!patternsList) return;

    if (this.patterns.length === 0) {
      patternsList.innerHTML =
        '<div class="empty-state">No filter patterns added yet</div>';
      return;
    }

    patternsList.innerHTML = this.patterns
      .map((pattern, index) => {
        const patternObj =
          typeof pattern === "string" ? { regex: pattern, title: "" } : pattern;
        const displayTitle = patternObj.title
          ? `<div class="pattern-title">${Utils.escapeHtml(
              patternObj.title
            )}</div>`
          : "";
        const escapedRegex = Utils.escapeHtml(patternObj.regex);

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

    this.setupPatternEventListeners();
  }

  setupPatternEventListeners() {
    const testButtons = document.querySelectorAll(".btn-test");
    const deleteButtons = document.querySelectorAll(".btn-delete");

    testButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const pattern = button.getAttribute("data-pattern");
        this.testPattern(pattern);
      });
    });

    deleteButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = parseInt(button.getAttribute("data-index"));
        this.deletePattern(index);
      });
    });
  }

  testPattern(pattern) {
    const testString = prompt(
      "Enter text to test against pattern:",
      "Test comment text here"
    );
    if (testString !== null) {
      try {
        const regex = new RegExp(pattern, "i");
        const matches = regex.test(testString);
        Utils.showNotification(
          matches ? "Pattern matches!" : "Pattern does not match",
          matches ? "success" : "info"
        );
      } catch (error) {
        Utils.showNotification("Invalid regex pattern", "error");
      }
    }
  }

  async deletePattern(index) {
    this.patterns.splice(index, 1);
    await StorageManager.setFilterPatterns(this.patterns);

    this.displayPatterns();
    Utils.showNotification("Filter pattern deleted", "success");
    Utils.sendToContentScript({
      action: "updatePatterns",
      patterns: this.patterns,
    });
  }

  async clearAllPatterns() {
    if (confirm("Are you sure you want to delete all filter patterns?")) {
      this.patterns = [];
      await StorageManager.setFilterPatterns(this.patterns);

      this.displayPatterns();
      Utils.showNotification("All filter patterns cleared", "success");
      Utils.sendToContentScript({
        action: "updatePatterns",
        patterns: [],
      });
    }
  }

  async loadDefaultPatterns() {
    const defaultPatterns = await StorageManager.loadDefaultPatterns();
    const newPatterns = [];

    for (const pattern of defaultPatterns) {
      const exists = this.patterns.some((existing) => {
        const existingRegex =
          typeof existing === "string" ? existing : existing.regex;
        return existingRegex === pattern.regex;
      });

      if (!exists) {
        newPatterns.push(pattern);
      }
    }

    if (newPatterns.length === 0) {
      Utils.showNotification("All default patterns already exist", "info");
      return;
    }

    this.patterns = [...this.patterns, ...newPatterns];
    await StorageManager.setFilterPatterns(this.patterns);

    this.displayPatterns();
    Utils.showNotification(
      `Added ${newPatterns.length} default pattern(s)`,
      "success"
    );
    Utils.sendToContentScript({
      action: "updatePatterns",
      patterns: this.patterns,
    });
  }

  async loadDefaultPatternsQuietly() {
    const defaultPatterns = await StorageManager.loadDefaultPatterns();
    if (defaultPatterns.length > 0) {
      await StorageManager.setFilterPatterns(defaultPatterns);
      console.log(`Loaded ${defaultPatterns.length} default filter patterns`);
    }
  }

  exportPatterns() {
    const data = {
      version: "1.1",
      type: "filter",
      exportDate: new Date().toISOString(),
      patterns: this.patterns.map((pattern) => {
        if (typeof pattern === "string") {
          return { regex: pattern, title: "Imported Pattern" };
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
    a.download = "king-kong-filter-patterns.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showNotification("Filter patterns exported successfully", "success");
  }

  importPatterns() {
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
          Utils.showNotification("Invalid file format", "error");
          return;
        }

        const normalizedPatterns = [];
        for (const pattern of data.patterns) {
          try {
            let patternObj;

            if (typeof pattern === "string") {
              if (Utils.isValidRegex(pattern)) {
                patternObj = { regex: pattern, title: "Imported Pattern" };
              }
            } else if (pattern.regex && Utils.isValidRegex(pattern.regex)) {
              patternObj = {
                regex: pattern.regex,
                title: pattern.title || "Imported Pattern",
              };
            }

            if (patternObj) {
              normalizedPatterns.push(patternObj);
            }
          } catch (error) {
            console.warn("Invalid pattern:", pattern, error);
          }
        }

        if (normalizedPatterns.length === 0) {
          Utils.showNotification("No valid patterns found in file", "error");
          return;
        }

        this.patterns = normalizedPatterns;
        await StorageManager.setFilterPatterns(this.patterns);

        this.displayPatterns();
        Utils.showNotification(
          `Imported ${normalizedPatterns.length} patterns successfully`,
          "success"
        );
        Utils.sendToContentScript({
          action: "updatePatterns",
          patterns: this.patterns,
        });
      } catch (error) {
        console.error("Error importing patterns:", error);
        Utils.showNotification("Error importing patterns", "error");
      }
    };

    input.click();
  }
}
