<div align="center">
  
  # 🦍 King Kong
  ### YouTube Comment Filter Extension
  
  **Filter out spam, repetitive, and unwanted YouTube comments with powerful regex patterns**
  
  ![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
  ![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
  ![Manifest V3](https://img.shields.io/badge/Manifest-V3-FF6B6B?style=for-the-badge)
  ![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📥 Installation](#-installation)
- [🎯 Usage](#-usage)
- [🛠️ Default Patterns](#️-default-patterns)
- [📊 Examples](#-examples)
- [🔧 Technical Details](#-technical-details)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### 🎯 **Smart Filtering**
- **Regex-powered filtering** - Use powerful regular expressions to target specific comment patterns
- **Real-time detection** - Automatically filters new comments as they load
- **Case-insensitive matching** - Catches variations in capitalization
- **YouTube SPA support** - Works seamlessly across YouTube's single-page application

### 🏷️ **Pattern Management**
- **Titled patterns** - Give descriptive names to your regex patterns for easy management
- **Default patterns included** - Pre-loaded with common spam detection patterns
- **Easy pattern testing** - Test your regex against sample text before adding
- **Import/Export** - Share pattern collections or backup your configurations

### 📊 **Analytics & Control**
- **Real-time statistics** - Track how many comments have been filtered
- **Toggle on/off** - Instantly enable or disable filtering
- **Cross-device sync** - Patterns sync across your Chrome browsers
- **Visual indicators** - See which comments were filtered (in debug mode)

### 🎨 **Modern Interface**
- **Dark theme design** - Easy on the eyes with gradient backgrounds
- **Responsive layout** - Clean, organized popup interface
- **Smooth animations** - Polished user experience
- **Intuitive controls** - Simple, clear interface for all features

---

## 🚀 Quick Start

1. **Install the extension** (see [Installation](#-installation) below)
2. **Open YouTube** in any tab
3. **Click the King Kong icon** in your browser toolbar
4. **Enable the filter** using the toggle switch
5. **Default patterns are automatically loaded** - start filtering immediately!
6. **Add custom patterns** for your specific needs

---

## 📥 Installation

### Option 1: Load Unpacked (Developer Mode)

1. **Download or clone** this repository
   ```bash
   git clone https://github.com/Mithun-750/king-kong.git
   cd king-kong-extension
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or go to Chrome menu → More Tools → Extensions
   - Or in any other Chromium browser, navigate to the extensions management page. extensions → manage extensions

3. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right

4. **Load the extension**
   - Click "Load unpacked"
   - Select the extension folder
   - The King Kong icon should appear in your toolbar

### Option 2: Chrome Web Store
*Coming soon - Extension will be published to the Chrome Web Store*

---

## 🎯 Usage

### Basic Usage

1. **Navigate to YouTube** - Open any YouTube video with comments
2. **Open King Kong** - Click the extension icon in your toolbar
3. **Enable filtering** - Toggle the switch to start filtering
4. **View statistics** - See how many comments have been filtered

### Managing Patterns

#### Adding Custom Patterns
1. **Enter a title** - Give your pattern a descriptive name (e.g., "Spam Comments")
2. **Enter regex pattern** - Input your regular expression
3. **Click "Add"** - Pattern is saved and immediately active

#### Using Default Patterns
- **Auto-loaded** - Default patterns load automatically on first use
- **Manual loading** - Click "Load Defaults" to add pre-built patterns
- **Smart merging** - Only adds patterns that don't already exist

#### Testing Patterns
1. **Click "Test"** on any pattern
2. **Enter sample text** in the prompt
3. **See if it matches** - Instant feedback on pattern effectiveness

#### Import/Export
- **Export** - Save your patterns as a JSON file for backup or sharing
- **Import** - Load patterns from a JSON file
- **Cross-compatible** - Works with both old and new format patterns

---

## 🛠️ Default Patterns

King Kong comes with 5 pre-built patterns targeting the most common YouTube spam comments:

| Pattern Name                      | Description                             | Example Matches                                              |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------ |
| **Anyone here in YEAR?**          | Catches basic "anyone here" variations  | "anyone here in 2024?", "anyone watching from 2024"          |
| **Who's still watching in YEAR?** | Detects "who's still watching" comments | "who's still watching in 2024?", "who is still here in 2024" |
| **Still watching in YEAR?**       | Targets "still watching" patterns       | "still watching in 2024?", "still here in 2024"              |
| **YEAR anyone?**                  | Catches year-first formats              | "2024 anyone?", "2024 who's here?"                           |
| **MONTH YEAR anyone?**            | Handles month/year combinations         | "January 2024 anyone?", "Dec 2024 who's watching?"           |

These patterns are designed to be:
- **Precise** - Minimize false positives
- **Comprehensive** - Cover common variations
- **Future-proof** - Handle years 2020-2039
- **Flexible** - Account for different spacing and punctuation

---

## 📊 Examples

### Regex Pattern Examples

```regex
# Basic spam detection
\b(spam|bot|fake|scam)\b

# Promotional content
\b(buy|sale|discount|offer|deal)\b.*\b(link|description|bio)\b

# Self-promotion
\b(check.*out|visit.*channel|subscribe.*me)\b

# Repetitive characters
(.)\1{4,}

# External links
\b(bit\.ly|tinyurl|t\.co)\b
```

### Advanced Patterns

```regex
# Cryptocurrency scams
\b(bitcoin|crypto|btc|eth|invest|profit|earn)\b.*\b(guaranteed|easy|fast)\b

# Like begging
\b(like.*if|give.*like|smash.*like)\b

# First comments
\b(first|1st|uno|number.*one)\b.*\b(comment|here)\b
```

---

## 🔧 Technical Details

### Architecture
- **Manifest V3** - Uses the latest Chrome extension standard
- **Content Script** - Monitors YouTube DOM for comment elements
- **MutationObserver** - Efficiently detects new comments as they load
- **Chrome Storage API** - Syncs patterns across devices
- **Vanilla JavaScript** - No external dependencies

### Browser Compatibility
- ✅ **Chrome** 88+ (Manifest V3 support)
- ✅ **Edge** 88+ (Chromium-based)
- ⏳ **Firefox** (Manifest V3 support coming)

### Performance
- **Lightweight** - Minimal resource usage
- **Efficient** - Uses optimized DOM queries
- **Non-blocking** - Doesn't interfere with YouTube functionality
- **Memory conscious** - Proper cleanup and observer management

### Privacy
- **No data collection** - All processing happens locally
- **No external requests** - No data sent to external servers
- **Chrome sync only** - Patterns sync through Chrome's built-in system
- **Open source** - Fully transparent code

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues
- Use the [Issues](https://github.com/yourusername/king-kong-extension/issues) tab
- Provide detailed bug reports with steps to reproduce
- Include browser version and extension version

### Suggesting Features
- Open a feature request in Issues
- Describe the use case and expected behavior
- Consider implementation complexity

### Contributing Code
1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/king-kong-extension.git
cd king-kong-extension

# Load the extension in Chrome for testing
# Follow the installation instructions above
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  
  **Made with ❤️ for a cleaner YouTube experience**
  
  [Report Bug](https://github.com/Mithun-750/king-kong/issues) · [Request Feature](https://github.com/Mithun-750/king-kong/issues)
  
</div> 
