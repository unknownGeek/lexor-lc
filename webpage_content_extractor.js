// Clean deterministic content extractor for LeetCode-like pages

(function(){
  'use strict';

  // --- Utilities ----------------------------------------------------------
  function safeCall(fn, fallback) {
    try { return fn(); } catch (e) { console.warn('safeCall error', e); return fallback; }
  }

  function decodeHtmlEntities(text) { if (!text) return text; const d = document.createElement('div'); d.innerHTML = text; return d.textContent || d.innerText || text; }

  function normalizeCode(text) {
    if (!text) return text;
    let t = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
    t = decodeHtmlEntities(t);
    let lines = t.split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length-1].trim() === '') lines.pop();
    let minIndent = null;
    lines.forEach(l => {
      const m = l.match(/^[ \t]*/);
      if (m) {
        const len = m[0].replace(/\t/g,'    ').length;
        if (l.trim() !== '') { if (minIndent === null || len < minIndent) minIndent = len; }
      }
    });
    if (minIndent === null) minIndent = 0;
    if (minIndent > 0) {
      const re = new RegExp('^[ \t]{0,' + minIndent + '}');
      lines = lines.map(l => l.replace(re, ''));
    }
    return lines.join('\n').trim();
  }

  function sanitizeFilename(text) {
    if (!text) return 'problem';
    text = text.replace(/[\u200b-\u200f\u202a-\u202e\ufeff\u2060\u00ad]/g, '');
    try { text = text.normalize('NFKD'); } catch(e){}
    text = text.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
    return (text || 'problem').slice(0,80);
  }

  // --- Problem extraction -----------------------------------------------
  function extractProblemStatementFromContainer(container) {
    if (window.sanitizerCore && typeof window.sanitizerCore.extractProblemStatementFromContainer === 'function') {
      return safeCall(() => window.sanitizerCore.extractProblemStatementFromContainer(container), null);
    }
    return container ? (container.innerText || '').trim() : null;
  }

  function findProblemName(container) {
    const h1 = document.querySelector('h1') || document.querySelector('.css-1v3d1xg');
    if (h1 && h1.textContent) return sanitizeFilename(h1.textContent);
    if (document.title) return sanitizeFilename(document.title);
    return 'problem';
  }

  function getProblemSlugFromUrl() {
    try {
      const path = location.pathname || '';
      // Clean deterministic content extractor for LeetCode-like pages

      (function(){
        'use strict';

        function decodeHtmlEntities(text) { if (!text) return text; const d = document.createElement('div'); d.innerHTML = text; return d.textContent || d.innerText || text; }

        function normalizeCode(text) {
          if (!text) return text;
          let t = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n');
          t = decodeHtmlEntities(t);
          let lines = t.split('\n');
          while (lines.length && lines[0].trim() === '') lines.shift();
          while (lines.length && lines[lines.length-1].trim() === '') lines.pop();
          let minIndent = null;
          lines.forEach(l => {
            const m = l.match(/^[ \t]*/);
            if (m) {
              const len = m[0].replace(/\t/g,'    ').length;
              if (l.trim() !== '') { if (minIndent === null || len < minIndent) minIndent = len; }
            }
          });
          if (minIndent === null) minIndent = 0;
          if (minIndent > 0) {
            const re = new RegExp('^[ \t]{0,' + minIndent + '}');
            lines = lines.map(l => l.replace(re, ''));
          }
          return lines.join('\n').trim();
        }

        function sanitizeFilename(text) {
          if (!text) return 'problem';
          text = text.replace(/[\u200b-\u200f\u202a-\u202e\ufeff\u2060\u00ad]/g, '');
          try { text = text.normalize('NFKD'); } catch(e){}
          text = text.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
          return (text || 'problem').slice(0,80);
        }

        function extractProblemStatementFromContainer(container) {
          if (window.sanitizerCore && typeof window.sanitizerCore.extractProblemStatementFromContainer === 'function') {
            try { return window.sanitizerCore.extractProblemStatementFromContainer(container); } catch (e) { console.warn('sanitizerCore failed', e); }
          }
          return container ? (container.innerText || '').trim() : null;
        }

        function findProblemName() {
          const h1 = document.querySelector('h1') || document.querySelector('.css-1v3d1xg');
          if (h1 && h1.textContent) return sanitizeFilename(h1.textContent);
          if (document.title) return sanitizeFilename(document.title);
          return 'problem';
        }

        function getProblemSlugFromUrl() {
          try {
            const path = location.pathname || '';
            const m = path.match(/\/problems\/([^\/]+)\/?/i);
            if (m && m[1]) return sanitizeFilename(decodeURIComponent(m[1]));
          } catch (e) {}
          return null;
        }

        function findExplicitJavaCode(container) {
          try {
            const roots = [];
            if (container) { container.querySelectorAll('div[class*="example"], .example').forEach(el => roots.push(el)); roots.push(container); }
            const selectors = ['pre code','pre','code','[data-language="java"]','[data-lang="java"]','.language-java','.lang-java'];
            for (const root of roots) {
              for (const sel of selectors) {
                const els = root.querySelectorAll(sel);
                for (const el of els) {
                  const txt = (el.textContent||'').trim(); if (!txt) continue;
                  const lower = txt.toLowerCase();
                  if (lower.includes('class solution') || lower.includes('public class') || lower.includes('public static') || lower.includes('system.out') || /import\s+java\./.test(lower)) return txt;
                }
              }
            }
            const editorSelectors = ['.react-monaco-editor-container','.monaco-editor','.submission__code','.editor','[data-language]'];
            for (const sel of editorSelectors) {
              const els = document.querySelectorAll(sel);
              for (const el of els) {
                const t = (el.textContent||'').trim(); if (t && (t.toLowerCase().includes('class solution') || t.toLowerCase().includes('public class'))) return t;
              }
            }
          } catch (e) { console.warn('findExplicitJavaCode error', e); }
          return null;
        }

        function javaTemplate(problemName) {
          const comment = problemName ? `// Java solution template for ${problemName}` : `// Java solution template`;
          return `${comment}\nclass Solution {\n    public int solve() {\n        // TODO implement\n        return 0;\n    }\n}\n`;
        }

        function makeFilename(base) {
          return new Promise((resolve) => {
            if (!chrome || !chrome.storage) { resolve(base + '.txt'); return; }
            chrome.storage.local.get({ includeTimestamp: false }, (items) => {
              const ts = items.includeTimestamp ? '_' + new Date().toISOString().replace(/[:.]/g,'-') : '';
              resolve(base + ts + '.txt');
            });
          });
        }

        function sendSave(filename, content) {
          chrome.runtime.sendMessage({ type: 'SAVE_PROBLEM_DESCRIPTION', filename, content }, (resp) => {
            if (chrome.runtime.lastError) console.error('Save failed:', chrome.runtime.lastError);
            else console.log('Saved:', resp);
          });
        }

        function buildContentWithJava(container, includeCode) {
          const sanitized = extractProblemStatementFromContainer(container) || '';
          let content = sanitized;
          if (includeCode) {
            const explicit = findExplicitJavaCode(container);
            if (explicit) content += '\n\nJava code snippet:\n```java\n' + normalizeCode(explicit) + '\n```';
            else { const name = getProblemSlugFromUrl() || findProblemName(); content += '\n\n' + javaTemplate(name); }
          } else {
            const name = getProblemSlugFromUrl() || findProblemName(); content += '\n\n' + javaTemplate(name);
          }
          return content;
        }

        function prepareAndSend() {
          const container = document.querySelector('div.HTMLContent_html__0OZLp[data-track-load="description_content"]') || document.querySelector('div[data-track-load="description_content"]');
          if (!container) { console.warn('Problem description container not found'); return; }
          chrome.storage.local.get({ includeCode: true }, (items) => {
            const includeCode = Boolean(items.includeCode);
            const content = buildContentWithJava(container, includeCode);
            const slug = getProblemSlugFromUrl(); const problemName = slug || findProblemName();
            makeFilename('lexor-lc/problem_description_' + problemName).then(fn => sendSave(fn, content));
          });
        }

        chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
          if (req && req.type === 'PREVIEW_PROBLEM_DESCRIPTION') {
            const container = document.querySelector('div.HTMLContent_html__0OZLp[data-track-load="description_content"]') || document.querySelector('div[data-track-load="description_content"]');
            if (!container) { sendResponse({ content: null }); return true; }
            const sanitized = extractProblemStatementFromContainer(container) || '';
            const explicit = findExplicitJavaCode(container);
            const debug = { foundExplicitJava: Boolean(explicit), explicitSnippet: explicit ? explicit.slice(0,500) : null };
            const name = getProblemSlugFromUrl() || findProblemName();
            const content = sanitized + '\n\n' + (explicit ? ('Java code snippet:\n```java\n' + normalizeCode(explicit) + '\n```') : javaTemplate(name));
            sendResponse({ content, debug });
            return true;
          }
          if (req && req.type === 'EXTRACT_PROBLEM_DESCRIPTION') { prepareAndSend(); sendResponse({ ok: true }); return; }
        });

        window.addEventListener('load', () => setTimeout(() => {
          try { chrome && chrome.storage ? chrome.storage.local.get({ autoExtract: true }, (items) => { if (items.autoExtract) prepareAndSend(); }) : prepareAndSend(); }
          catch (e) { prepareAndSend(); }
        }, 1500));

        const pageObserver = new MutationObserver((mutations, obs) => {
          const container = document.querySelector('div.HTMLContent_html__0OZLp[data-track-load="description_content"]') || document.querySelector('div[data-track-load="description_content"]');
          if (container) { try { chrome && chrome.storage ? chrome.storage.local.get({ autoExtract: true }, (items) => { if (items.autoExtract) prepareAndSend(); }) : prepareAndSend(); } catch(e) { prepareAndSend(); } obs.disconnect(); }
        });
        pageObserver.observe(document.documentElement || document.body, { childList: true, subtree: true });

      })();
  div.innerHTML = text;
  return div.textContent || div.innerText || text;
}

function normalizeCode(text) {
  if (!text) return text;
  // Replace Windows line endings
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Decode common HTML entities if present
  t = decodeHtmlEntities(t);
  // Split lines and trim leading/trailing blank lines
  let lines = t.split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines[lines.length-1].trim() === '') lines.pop();
  // Compute minimum indent (spaces or tabs) across non-empty lines
  let minIndent = null;
  lines.forEach(l => {
    const m = l.match(/^[ \t]*/);
    if (m) {
      const len = m[0].replace(/\t/g, '    ').length; // treat tab as 4 spaces
      if (l.trim() !== '') {
        if (minIndent === null || len < minIndent) minIndent = len;
      }
    }
  });
  if (minIndent === null) minIndent = 0;
  // Remove that indent
  if (minIndent > 0) {
    const re = new RegExp('^[ \t]{0,' + minIndent + '}');
    lines = lines.map(l => l.replace(re, ''));
          if (bestScore >= 4) return best;
        } catch (e) {
          console.warn('Error extracting Java snippet', e);
        }
        return null;
      }
      function findExplicitJavaCode(container) {
        try {
          const roots = [];
          if (container) {
            container.querySelectorAll('div[class*="example"], .example').forEach(el => roots.push(el));
            roots.push(container);
          }
          // selectors likely to contain code
          const selectors = ['pre code', 'pre', 'code', '[data-language="java"]', '[data-lang="java"]', '.language-java', '.lang-java'];
          for (const root of roots) {
            for (const sel of selectors) {
              const els = root.querySelectorAll(sel);
              for (const el of els) {
                const txt = (el.textContent || '').trim();
                if (!txt) continue;
                const lower = txt.toLowerCase();
                if (lower.includes('class solution') || lower.includes('public class') || lower.includes('public static') || lower.includes('system.out') || lower.match(/import\s+java\./)) {
                  return txt;
                }
              }
            }
          }

          // also check common editor containers in doc body (explicit detection)
          const editorSelectors = ['.react-monaco-editor-container', '.monaco-editor', '.submission__code', '.editor', '[data-language]'];
          for (const sel of editorSelectors) {
            document.querySelectorAll(sel).forEach(el => {
              const t = (el.textContent || '').trim();
              if (t && (t.toLowerCase().includes('class solution') || t.toLowerCase().includes('public class'))) {
                roots.push(el);
              }
            });
          }

          // check appended roots for explicit java
          for (const root of roots) {
            const t = (root.textContent || '').trim();
            if (t && (t.toLowerCase().includes('class solution') || t.toLowerCase().includes('public class'))) return t;
          }
        } catch (e) {
          console.warn('findExplicitJavaCode error', e);
        }
        return null;
      }

      function javaTemplate(problemName) {
        const comment = problemName ? `// Java solution template for ${problemName}` : '// Java solution template';
        return `${comment}\nclass Solution {\n    // TODO: implement solution method\n}\n`;
      }
  return lines.join('\n').trim();
}
