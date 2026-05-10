const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const sanitizerCode = fs.readFileSync(path.join(__dirname, '..', 'webpage_format', 'sanitizer_core.js'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'problem_snippet.html'), 'utf8');

(async () => {
  const dom = new JSDOM(`<!doctype html><html><body>${fixture}</body></html>`, { runScripts: 'dangerously' });
  const { window } = dom;
  // evaluate sanitizer code in the jsdom window
  dom.window.eval(sanitizerCode);

  const container = window.document.querySelector('div[data-track-load="description_content"]');
  const result = window.sanitizerCore.extractProblemStatementFromContainer(container);

  console.log('Sanitized output:\n---');
  console.log(result);
  console.log('---');

  // Basic check: should contain the paragraph text and list items
  if (!result || !result.includes('Given an array')) {
    console.error('Test failed: expected content missing');
    process.exit(2);
  }

  console.log('Test passed');
})();

// Additional tests
function runFixtureTest(fileName, checkFn) {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures', fileName), 'utf8');
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'dangerously' });
  dom.window.eval(sanitizerCode);
  const container = dom.window.document.querySelector('div[data-track-load="description_content"]');
  const out = dom.window.sanitizerCore.extractProblemStatementFromContainer(container);
  if (!checkFn(out)) {
    console.error(`${fileName} failed, output:\n---\n${out}\n---`);
    process.exit(3);
  }
  console.log(`${fileName} passed`);
}

runFixtureTest('problem_sup_sub.html', out => out.includes('m^2') && out.includes('x_i'));
runFixtureTest('problem_hidden_spans.html', out => out.includes('Visible text') && !out.includes('invisible') && !out.includes('Create the variable named'));

// Test Java snippet extraction: load the fixture and eval extractJavaSnippet from content script
(() => {
  const html = fs.readFileSync(path.join(__dirname, 'fixtures', 'problem_with_java.html'), 'utf8');
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, { runScripts: 'dangerously' });
  const { window } = dom;
  // inject a small standalone extractJavaSnippet implementation (copied from content script)
  const extractJavaSnippet = function(doc) {
    try {
      const candidates = [];
      (doc || document).querySelectorAll('textarea, pre, code, [class*="CodeMirror"], [class*="monaco-editor"], [class*="ace_editor"]').forEach(el => {
        let text = '';
        if (!el) return;
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'textarea') text = el.value || el.textContent || '';
        else text = el.textContent || '';
        text = (text || '').trim();
        if (text.length > 20) candidates.push(text);
      });
      (doc || document).querySelectorAll('[data-language], [data-lang], .language-java, .lang-java').forEach(el => {
        const t = (el.textContent || '').trim();
        if (t && t.length > 20) candidates.push(t);
      });
      if (candidates.length === 0) return null;
      function score(text) {
        let s = 0;
        const lower = text.toLowerCase();
        if (lower.includes('public class')) s += 10;
        if (lower.includes('public static void main')) s += 8;
        if (lower.includes('system.out')) s += 6;
        if (lower.match(/import\s+java\./)) s += 6;
        const semis = (text.match(/;/g) || []).length;
        s += Math.min(semis, 10);
        ['interface','implements','extends','package', '@Override'].forEach(k => { if (text.indexOf(k) !== -1) s += 2; });
        return s;
      }
      let best = null; let bestScore = -1;
      candidates.forEach(c => { const sc = score(c); if (sc > bestScore) { bestScore = sc; best = c; } });
      if (bestScore >= 6) return best;
    } catch (e) { return null; }
    return null;
  };

  const snippet = extractJavaSnippet(window.document);
  if (!snippet || !snippet.includes('public class Solution')) {
    console.error('Java snippet extraction failed, got:', snippet);
    process.exit(4);
  }
  console.log('problem_with_java.html passed');
})();
