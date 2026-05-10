// Shared sanitizer core (ported from content_extractor.py)
const sanitizerCore = (function() {
  function cleanInlineText(text) {
    if (!text) return "";
    text = text.replace(/[\u200b-\u200f\u202a-\u202e\ufeff\u2060\u00ad]/g, "");
    text = text.replace(/\u00a0/g, " ");
    text = text.replace(/\s+/g, " ");
    return text.trim();
  }

  function nodeText(node) {
    if (!node) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const name = node.tagName.toLowerCase();
    if (name === 'sup') return '^' + cleanInlineText(node.textContent);
    if (name === 'sub') return '_' + cleanInlineText(node.textContent);

    let parts = [];
    node.childNodes.forEach(child => parts.push(nodeText(child)));
    return parts.join('');
  }

  function blockText(el) {
    return cleanInlineText(nodeText(el));
  }

  function rawBlockText(el) {
    if (!el) return '';
    let t = el.textContent || '';
    t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // trim leading/trailing blank lines but preserve internal whitespace
    let lines = t.split('\n');
    while (lines.length && lines[0].trim() === '') lines.shift();
    while (lines.length && lines[lines.length-1].trim() === '') lines.pop();
    return lines.join('\n');
  }

  function extractProblemStatementFromContainer(container) {
    if (!container) return null;

    // Remove hidden elements (opacity:0 or offscreen) and elements containing
    // the common boilerplate 'Create the variable named' which LeetCode sometimes injects
    container.querySelectorAll('*').forEach(el => {
      const style = el.getAttribute('style') || '';
      const text = (el.textContent || '').trim();
      if (style.includes('opacity: 0') || style.includes('left: -9999px') || text.includes('Create the variable named')) {
        el.remove();
      }
    });

    container.querySelectorAll('img').forEach(img => img.remove());

    const lines = [];

    container.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) return;
      if (child.nodeType !== Node.ELEMENT_NODE) return;

      const tag = child.tagName.toLowerCase();
      if (tag === 'p' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'strong') {
        const text = blockText(child);
        if (text) lines.push(text);
      } else if (tag === 'ul') {
        child.querySelectorAll(':scope > li').forEach(li => {
          const text = blockText(li);
          if (text) lines.push('- ' + text);
        });
      } else if (tag === 'pre' || tag === 'code') {
        const text = rawBlockText(child);
        if (text) lines.push(text);
      } else if (tag === 'div' && (child.classList && Array.from(child.classList).some(c => c.toLowerCase().includes('example')))) {
        child.childNodes.forEach(part => {
          if (part.nodeType === Node.TEXT_NODE) return;
          const ptag = part.tagName && part.tagName.toLowerCase();
          if (ptag === 'p' || ptag === 'h2' || ptag === 'h3' || ptag === 'h4' || ptag === 'strong') {
            const text = blockText(part);
            if (text) lines.push(text);
          } else if (ptag === 'ul') {
            part.querySelectorAll(':scope > li').forEach(li => {
              const text = blockText(li);
              if (text) lines.push('- ' + text);
            });
          } else if (ptag === 'pre' || ptag === 'code') {
            const text = rawBlockText(part);
            if (text) lines.push(text);
          }
        });
      }
    });

    let result = lines.join('\n\n');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/ +([.,:;])/g, '$1');
    return result.trim();
  }

  function sanitizeHtmlString(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.querySelector('div[data-track-load="description_content"]') || doc.body;
    return extractProblemStatementFromContainer(container);
  }

  return {
    cleanInlineText,
    nodeText,
    blockText,
    extractProblemStatementFromContainer,
    sanitizeHtmlString
  };
})();

// Expose globally so content scripts can access in manifest-ordered injection
window.sanitizerCore = sanitizerCore;
