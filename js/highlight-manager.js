// Highlight Manager Module - Handles comment highlighting functionality
class HighlightManager {
  constructor() {
    this.patterns = [];
    this.isEnabled = true; // Highlights are enabled by default
    this.init();
  }

  async init() {
    await this.loadPatterns();
    this.setupEventListeners();
  }

  async loadPatterns() {
    this.patterns = await StorageManager.getHighlightPatterns();
    this.displayPatterns();
  }

  setupEventListeners() {
    const showAddFormBtn = document.getElementById("showHighlightFormBtn");
    const addPatternBtn = document.getElementById("addHighlightPattern");
    const cancelAddBtn = document.getElementById("cancelHighlightAdd");
    const clearAllBtn = document.getElementById("clearAllHighlight");
    const exportBtn = document.getElementById("exportHighlight");
    const importBtn = document.getElementById("importHighlight");

    showAddFormBtn?.addEventListener("click", () => this.showAddForm());
    addPatternBtn?.addEventListener("click", () => this.addPattern());
    cancelAddBtn?.addEventListener("click", () => this.hideAddForm());
    clearAllBtn?.addEventListener("click", () => this.clearAllPatterns());
    exportBtn?.addEventListener("click", () => this.exportPatterns());
    importBtn?.addEventListener("click", () => this.importPatterns());

    // Color randomizer
    const randomColorBtn = document.getElementById("randomHighlightColor");
    randomColorBtn?.addEventListener("click", () => this.randomizeColor());

    // Keyboard shortcuts
    const titleInput = document.getElementById("highlightPatternTitle");
    const regexInput = document.getElementById("highlightRegexInput");

    [titleInput, regexInput].forEach((input) => {
      input?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.addPattern();
        if (e.key === "Escape") this.hideAddForm();
      });
    });
  }

  showAddForm() {
    const showBtn = document.getElementById("showHighlightFormBtn");
    const form = document.getElementById("addHighlightForm");
    const titleInput = document.getElementById("highlightPatternTitle");
    const colorInput = document.getElementById("highlightColorInput");

    showBtn?.classList.add("hidden");
    form?.classList.remove("hidden");

    // Set random color if not already set
    if (colorInput && !colorInput.value) {
      colorInput.value = Utils.generateRandomColor();
    }

    setTimeout(() => titleInput?.focus(), 100);
  }

  hideAddForm() {
    const showBtn = document.getElementById("showHighlightFormBtn");
    const form = document.getElementById("addHighlightForm");
    const titleInput = document.getElementById("highlightPatternTitle");
    const regexInput = document.getElementById("highlightRegexInput");
    const colorInput = document.getElementById("highlightColorInput");

    form?.classList.add("hidden");
    showBtn?.classList.remove("hidden");

    if (titleInput) titleInput.value = "";
    if (regexInput) regexInput.value = "";
    if (colorInput) colorInput.value = Utils.generateRandomColor();
  }

  randomizeColor() {
    const colorInput = document.getElementById("highlightColorInput");
    if (colorInput) {
      colorInput.value = Utils.generateRandomColor();
    }
  }

  async addPattern() {
    const titleInput = document.getElementById("highlightPatternTitle");
    const regexInput = document.getElementById("highlightRegexInput");
    const colorInput = document.getElementById("highlightColorInput");

    const title = titleInput?.value.trim() || "";
    const regex = regexInput?.value.trim() || "";
    const color = colorInput?.value || Utils.generateRandomColor();

    if (!regex) {
      Utils.showNotification("Please enter a regex pattern", "error");
      return;
    }

    if (!Utils.isValidRegex(regex)) {
      Utils.showNotification("Invalid regex pattern", "error");
      return;
    }

    // Check for duplicates
    const exists = this.patterns.some((p) => p.regex === regex);
    if (exists) {
      Utils.showNotification("Pattern already exists", "warning");
      return;
    }

    const newPattern = {
      regex: regex,
      title: title || `Highlight Pattern ${this.patterns.length + 1}`,
      color: color,
    };

    this.patterns.push(newPattern);
    await StorageManager.setHighlightPatterns(this.patterns);

    this.displayPatterns();
    this.hideAddForm();

    Utils.showNotification("Highlight pattern added successfully", "success");
    Utils.sendToContentScript({
      action: "updateHighlightPatterns",
      patterns: this.patterns,
    });
  }

  displayPatterns() {
    const patternsList = document.getElementById("highlightPatternsList");
    if (!patternsList) return;

    if (this.patterns.length === 0) {
      patternsList.innerHTML =
        '<div class="empty-state">No highlight patterns added yet</div>';
      return;
    }

    patternsList.innerHTML = this.patterns
      .map((pattern, index) => {
        const displayTitle = pattern.title
          ? `<div class="pattern-title">${Utils.escapeHtml(
              pattern.title
            )}</div>`
          : "";
        const escapedRegex = Utils.escapeHtml(pattern.regex);

        return `
          <div class="pattern-item highlight-pattern-item" data-index="${index}">
            <div class="pattern-content">
              ${displayTitle}
              <div class="pattern-text">${escapedRegex}</div>
            </div>
            <div class="pattern-actions">
              <div class="color-indicator" style="background-color: ${pattern.color};" title="Color: ${pattern.color}"></div>
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
    const testButtons = document.querySelectorAll(
      "#highlightPatternsList .btn-test"
    );
    const deleteButtons = document.querySelectorAll(
      "#highlightPatternsList .btn-delete"
    );

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
        const regex = new RegExp(pattern, "gi");
        const matches = testString.match(regex);
        if (matches) {
          Utils.showNotification(
            `Pattern matches! Found: "${matches.join('", "')}"`,
            "success"
          );
        } else {
          Utils.showNotification("Pattern does not match", "info");
        }
      } catch (error) {
        Utils.showNotification("Invalid regex pattern", "error");
      }
    }
  }

  async deletePattern(index) {
    this.patterns.splice(index, 1);
    await StorageManager.setHighlightPatterns(this.patterns);

    this.displayPatterns();
    Utils.showNotification("Highlight pattern deleted", "success");
    Utils.sendToContentScript({
      action: "updateHighlightPatterns",
      patterns: this.patterns,
    });
  }

  async clearAllPatterns() {
    if (confirm("Are you sure you want to delete all highlight patterns?")) {
      this.patterns = [];
      await StorageManager.setHighlightPatterns(this.patterns);

      this.displayPatterns();
      Utils.showNotification("All highlight patterns cleared", "success");
      Utils.sendToContentScript({
        action: "updateHighlightPatterns",
        patterns: [],
      });
    }
  }

  exportPatterns() {
    const data = {
      version: "1.1",
      type: "highlight",
      exportDate: new Date().toISOString(),
      patterns: this.patterns,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "king-kong-highlight-patterns.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Utils.showNotification(
      "Highlight patterns exported successfully",
      "success"
    );
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
            if (
              pattern.regex &&
              pattern.title &&
              pattern.color &&
              Utils.isValidRegex(pattern.regex)
            ) {
              normalizedPatterns.push({
                regex: pattern.regex,
                title: pattern.title,
                color: pattern.color,
              });
            }
          } catch (error) {
            console.warn("Invalid highlight pattern:", pattern, error);
          }
        }

        if (normalizedPatterns.length === 0) {
          Utils.showNotification(
            "No valid highlight patterns found in file",
            "error"
          );
          return;
        }

        this.patterns = normalizedPatterns;
        await StorageManager.setHighlightPatterns(this.patterns);

        this.displayPatterns();
        Utils.showNotification(
          `Imported ${normalizedPatterns.length} highlight patterns successfully`,
          "success"
        );
        Utils.sendToContentScript({
          action: "updateHighlightPatterns",
          patterns: this.patterns,
        });
      } catch (error) {
        console.error("Error importing highlight patterns:", error);
        Utils.showNotification("Error importing highlight patterns", "error");
      }
    };

    input.click();
  }
}
