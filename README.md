# Problem Description Extractor

This Chrome extension extracts the problem description from LeetCode problem pages, sanitizes the HTML into readable plain text, and saves it as a .txt file under `Downloads/lexor-lc/`.

Features
- Finds the container `div.HTMLContent_html__0OZLp[data-track-load="description_content"]` (falls back to `div[data-track-load="description_content"]`).
- Removes images and hidden/irrelevant spans, converts sup/sub, formats lists, and outputs a clean plain-text file.
- Saves the file using the Chrome downloads API into `Downloads/lexor-lc/problem_description_{problem_name}.txt`.

How to install
1. Open `chrome://extensions` in Chrome or Chromium-based browser.
2. Enable Developer mode.
3. Click "Load unpacked" and choose this repository folder.

Usage
- Open a LeetCode problem page and either:
  - Click the extension icon and press "Extract & Save", or
  - The extension will attempt to auto-extract shortly after the page loads.

Permissions
- activeTab: to talk to the active tab and inject/communicate with content scripts.
- downloads: to save the sanitized text file into the user's Downloads directory.
- storage: (kept from original) unused but harmless.

Notes
- The extension saves files relative to the user's Downloads folder; Chrome won't let extensions write to arbitrary locations outside Downloads.
- If LeetCode changes their DOM structure, the selector used may need adjustment. If you see missing content, share a page sample and I'll tweak the parser.

Popup download history
- The popup shows a history of saved files (filename + timestamp).
- Each entry has "Reveal" and "Open" buttons: "Reveal" will reveal the file in your system file manager, and "Open" will attempt to open the file.
- These use the Chrome `downloads` API.

Running the sanitizer tests (optional)
1. Install dev dependencies:

```bash
npm install
```

2. Run the test harness:

```bash
npm test
```

This runs a small jsdom-based test that loads the sanitizer and checks it against a fixture HTML snippet.

