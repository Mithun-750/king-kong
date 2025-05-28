// Utilities Module - Common helper functions
class Utils {
  // Escape HTML to prevent XSS
  static escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Validate regex pattern
  static isValidRegex(pattern) {
    try {
      new RegExp(pattern);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate random color
  static generateRandomColor() {
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
      "#00d2d3",
      "#ff9f43",
      "#c44569",
      "#f8b500",
      "#40739e",
      "#487eb0",
      "#8c7ae6",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Convert hex to rgba
  static hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Send message to content script
  static async sendToContentScript(message) {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab && tab.url.includes("youtube.com")) {
        return await chrome.tabs.sendMessage(tab.id, message);
      }
    } catch (error) {
      console.error("Error sending message to content script:", error);
    }
  }

  // Show notification
  static showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach((n) => n.remove());

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
}
