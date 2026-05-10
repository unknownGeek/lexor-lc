// background.js

chrome.runtime.onInstalled.addListener(() => {
  console.log("Problem Description Extractor extension installed!");
  // Ensure sensible defaults for settings (so Java is selected by default)
  try {
    chrome.storage && chrome.storage.local && chrome.storage.local.get && chrome.storage.local.get(['includeCode','languages','autoExtract','includeTimestamp'], (items) => {
      const toSet = {};
      if (typeof items.includeCode === 'undefined') toSet.includeCode = true;
      if (!items.languages || !Array.isArray(items.languages) || items.languages.length === 0) toSet.languages = ['java'];
      if (typeof items.autoExtract === 'undefined') toSet.autoExtract = true;
      if (typeof items.includeTimestamp === 'undefined') toSet.includeTimestamp = false;
      if (Object.keys(toSet).length) chrome.storage.local.set(toSet);
    });
  } catch (e) {
    // ignore storage errors during install
  }
});

// Handle save request from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === 'SAVE_PROBLEM_DESCRIPTION') {
    const filename = request.filename || 'lexor-lc/problem_description.txt';
    const content = request.content || '';

    // Use a data URL for the content because URL.createObjectURL is not
    // available in the extension service worker context. Data URL is fine
    // for text content.
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);

    // Use chrome.downloads API to save to user's Downloads/lexor-lc/
    chrome.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'overwrite',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true, downloadId });
      }
      // no object URL to revoke when using data URL
    });

    // Indicate we'll send a response asynchronously
    return true;
  }
});

// Listen for download completion and notify popup or active tab
chrome.downloads.onChanged.addListener((delta) => {
  if (!delta || !delta.state || delta.state.current !== 'complete') return;
  const id = delta.id;
  chrome.downloads.search({ id }, (items) => {
    if (!items || !items[0]) return;
    const filename = items[0].filename || '';
    const entry = { id, filename, when: Date.now() };
    // Save into chrome.storage.local downloadHistory (append)
    chrome.storage.local.get({ downloadHistory: [] }, (items) => {
      const history = items.downloadHistory || [];
      history.unshift(entry);
      // Keep last 50
      const capped = history.slice(0, 50);
      chrome.storage.local.set({ downloadHistory: capped }, () => {
        // broadcast a message to extension (popup will listen)
        chrome.runtime.sendMessage({ type: 'DOWNLOAD_COMPLETE', entry });
      });
    });
  });
});

// Notify user when a download is interrupted/failed (helps detect Save As prompts)
chrome.downloads.onChanged.addListener((delta) => {
  if (!delta || !delta.state) return;
  if (delta.state.current === 'interrupted') {
    // Show a notification advising how to set automatic downloads
    const opt = {
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: 'Download interrupted',
      message: 'A download was interrupted. If Chrome prompts "Ask where to save each file", disable it in Chrome settings -> Downloads so the extension can save automatically.'
    };
    if (chrome && chrome.notifications && typeof chrome.notifications.create === 'function') {
      chrome.notifications.create('', opt);
    }
  }
});

  