// On popup load, request the MAX_LOT_SIZE_BY_SYMBOL from content.js
window.onload = () => {
  const btn = document.getElementById('extractBtn');
  const status = document.getElementById('status');
  const previewBtn = document.getElementById('previewBtn');
  const previewArea = document.getElementById('previewArea');
  const previewText = document.getElementById('previewText');

  btn.addEventListener('click', () => {
    status.textContent = 'Sending extraction request...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        status.textContent = 'No active tab found.';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_PROBLEM_DESCRIPTION' }, (resp) => {
        if (chrome.runtime.lastError) {
          status.textContent = 'Error: ' + chrome.runtime.lastError.message;
          return;
        }
        status.textContent = 'Extraction request sent.';
      });
    });
  });

  previewBtn.addEventListener('click', () => {
    status.textContent = 'Requesting preview...';
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) { status.textContent = 'No active tab found.'; return; }
      sendMessageWithInject(tabs[0].id, { type: 'PREVIEW_PROBLEM_DESCRIPTION' }, (err, resp) => {
        if (err) { status.textContent = 'Error: ' + err; return; }
        if (!resp || !resp.content) { status.textContent = 'No content returned.'; return; }
        previewArea.style.display = 'block';
        previewText.value = resp.content;
        const previewDebug = document.getElementById('previewDebug');
        if (resp.debug && Array.isArray(resp.debug.candidates)) {
          previewDebug.textContent = resp.debug.candidates.map((c,i) => `${i+1}. score=${c.score}\n${c.snippet}\n`).join('\n----\n');
        } else {
          previewDebug.textContent = 'No debug candidates.';
        }
        status.textContent = 'Preview loaded.';
      });
    });
  });

  // sendMessage helper: if the page has no listener, inject content scripts and retry
  function sendMessageWithInject(tabId, message, cb) {
    chrome.tabs.sendMessage(tabId, message, (resp) => {
      if (chrome.runtime.lastError && chrome.runtime.lastError.message && chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
        // inject content scripts then retry
        chrome.scripting.executeScript({ target: { tabId }, files: ['webpage_format/sanitizer_core.js', 'webpage_content_extractor.js'] }, () => {
          // small delay to allow the script to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tabId, message, (resp2) => {
              if (chrome.runtime.lastError) return cb(chrome.runtime.lastError.message);
              cb(null, resp2);
            });
          }, 250);
        });
      } else if (chrome.runtime.lastError) {
        return cb(chrome.runtime.lastError.message);
      } else {
        cb(null, resp);
      }
    });
  }
  
  const autoCheckbox = document.getElementById('autoExtract');
  const tsCheckbox = document.getElementById('includeTimestamp');
  const includeCodeCheckbox = document.getElementById('includeCode');
  const langCheckboxes = Array.from(document.querySelectorAll('.lang'));

  const historyEl = document.getElementById('history');
  const clearBtn = document.getElementById('clearHistory');

  // load saved settings
  chrome.storage.local.get({ autoExtract: true, includeTimestamp: false, includeCode: true, languages: ['java'] }, (items) => {
    autoCheckbox.checked = Boolean(items.autoExtract);
    tsCheckbox.checked = Boolean(items.includeTimestamp);
    includeCodeCheckbox.checked = Boolean(items.includeCode);
    const langs = items.languages || [];
    langCheckboxes.forEach(cb => { cb.checked = langs.includes(cb.value); });
  });

  autoCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ autoExtract: autoCheckbox.checked });
  });

  tsCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ includeTimestamp: tsCheckbox.checked });
  });

  includeCodeCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ includeCode: includeCodeCheckbox.checked });
  });

  langCheckboxes.forEach(cb => cb.addEventListener('change', () => {
    const selected = langCheckboxes.filter(c => c.checked).map(c => c.value);
    chrome.storage.local.set({ languages: selected });
  }));

  // Listen for background messages about download completion (optional)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'DOWNLOAD_COMPLETE') {
      const entry = msg.entry || { filename: msg.filename, when: Date.now() };
      renderHistoryEntry(entry, true);
      status.textContent = 'Saved: ' + (entry.filename || 'file');
    }
  });

  function renderHistoryEntry(entry, prepend = false) {
    const el = document.createElement('div');
    el.style.padding = '6px 4px';
    el.style.borderBottom = '1px solid #eee';
    const when = new Date(entry.when).toLocaleString();
    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.justifyContent = 'space-between';

    const textWrap = document.createElement('div');
    textWrap.innerHTML = `<div style="font-size:12px;color:#333">${entry.filename}</div><div style="font-size:11px;color:#666">${when}</div>`;

    const btnWrap = document.createElement('div');
    btnWrap.style.display = 'flex';
    btnWrap.style.gap = '6px';

    const revealBtn = document.createElement('button');
    revealBtn.textContent = 'Reveal';
    revealBtn.style.fontSize = '11px';
    revealBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chrome && chrome.downloads && typeof chrome.downloads.show === 'function') {
        chrome.downloads.show(entry.id);
      } else {
        console.warn('chrome.downloads.show not available');
      }
    });

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.style.fontSize = '11px';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (chrome && chrome.downloads && typeof chrome.downloads.open === 'function') {
        chrome.downloads.open(entry.id);
      } else {
        console.warn('chrome.downloads.open not available');
      }
    });

    btnWrap.appendChild(revealBtn);
    btnWrap.appendChild(openBtn);

    info.appendChild(textWrap);
    info.appendChild(btnWrap);

    el.appendChild(info);

    if (prepend && historyEl.firstChild) historyEl.insertBefore(el, historyEl.firstChild);
    else historyEl.appendChild(el);
  }

  function loadHistory() {
    chrome.storage.local.get({ downloadHistory: [] }, (items) => {
      historyEl.innerHTML = '';
      (items.downloadHistory || []).forEach(e => renderHistoryEntry(e));
    });
  }

  clearBtn.addEventListener('click', () => {
    chrome.storage.local.set({ downloadHistory: [] }, () => loadHistory());
  });

  loadHistory();

  const openSettingsBtn = document.getElementById('openDownloadsSettings');
  const settingsStatus = document.getElementById('settingsStatus');
  openSettingsBtn.addEventListener('click', () => {
    // Try to open Chrome downloads settings. This will only work in Chrome.
    try {
      chrome.tabs.create({ url: 'chrome://settings/downloads' });
      settingsStatus.textContent = 'Opening Chrome settings...';
    } catch (e) {
      settingsStatus.textContent = 'Unable to open settings from extension. Open chrome://settings/downloads manually.';
    }
  });
};
  