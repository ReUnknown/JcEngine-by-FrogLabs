import 'ace'; // Assuming ace is imported via import map

let editorInstance;
const DARK_THEME = 'ace/theme/monokai';
const LIGHT_THEME = 'ace/theme/chrome';

const SCRIPT_STORAGE_KEY = 'mainScript';
const SCRIPT_DEFAULT = `// Welcome to JcScript! Start coding here:

make background white

// Try these commands:
// draw circle at (100,100) radius 30
// make it blue
// let box = spawn 50 50 40 40
`;

let scriptState = localStorage.getItem(SCRIPT_STORAGE_KEY) || SCRIPT_DEFAULT;

async function fixCode() {
  try {
    const code = editorInstance.getValue();

    // Create fix preview panel if it doesn't exist
    let fixPreview = document.getElementById('fixPreview');
    if (!fixPreview) {
      fixPreview = document.createElement('div');
      fixPreview.id = 'fixPreview';
      fixPreview.className = 'fix-preview hidden';
      
      const header = document.createElement('div');
      header.className = 'fix-preview-header';
      header.innerHTML = `
        <h3>Fix Preview</h3>
        <div class="fix-preview-buttons">
          <button id="applyFix" class="btn btn-secondary">Apply Fix</button>
          <button id="cancelFix" class="btn">Cancel</button>
        </div>
      `;
      
      const content = document.createElement('div');
      content.className = 'fix-preview-content';
      content.innerHTML = `
        <div class="fix-status">Analyzing code...</div>
        <div class="fix-changes"></div>
      `;
      
      fixPreview.appendChild(header);
      fixPreview.appendChild(content);
      document.body.appendChild(fixPreview);
    }

    const status = fixPreview.querySelector('.fix-status');
    const changes = fixPreview.querySelector('.fix-changes');
    const applyBtn = document.getElementById('applyFix');
    const cancelBtn = document.getElementById('cancelFix');

    // Show preview panel
    fixPreview.classList.remove('hidden');
    status.textContent = 'Analyzing code...';
    changes.innerHTML = '';
    
    // Show analyzing indicator in editor
    const marker = editorInstance.session.addMarker({
      start: { row: 0, column: 0 },
      end: { row: editorInstance.session.getLength(), column: 0 },
      type: 'fullLine',
      className: 'ace_analyzing'
    }, 'analyzing', true);
    
    const response = await fetch('http://localhost:3000/api/fix-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      throw new Error('Failed to get AI suggestions');
    }

    const { fixedCode, error } = await response.json();
    if (error) throw new Error(error);

    if (fixedCode) {
      // Remove analyzing indicator
      editorInstance.session.removeMarker(marker);

      if (fixedCode === code) {
        status.textContent = 'No issues found in your code!';
        changes.innerHTML = '<div class="fix-no-changes">Your code looks good and follows JcScript syntax.</div>';
      } else {
        status.textContent = 'Suggested fixes ready:';
        
        // Create diff view
        const diff = createDiffView(code, fixedCode);
        changes.innerHTML = '';
        changes.appendChild(diff);

        // Setup apply/cancel handlers
        applyBtn.onclick = () => {
          editorInstance.setValue(fixedCode, -1);
          editorInstance.moveCursorTo(currentPos.row, currentPos.column);
          fixPreview.classList.add('hidden');
          
          // Flash success indicator
          const successMarker = editorInstance.session.addMarker({
            start: { row: 0, column: 0 },
            end: { row: editorInstance.session.getLength(), column: 0 },
            type: 'fullLine',
            className: 'ace_fixed'
          }, 'fixed', true);
          
          setTimeout(() => {
            editorInstance.session.removeMarker(successMarker);
          }, 1000);

          if (window.addOutput) {
            window.addOutput('✓ Code fixes applied successfully', 'log');
          }
        };

        cancelBtn.onclick = () => {
          fixPreview.classList.add('hidden');
        };
      }
    }
  } catch (error) {
    console.error('Fix error:', error);
    editorInstance.session.removeMarker(marker);
    
    if (fixPreview) {
      status.textContent = 'Error analyzing code:';
      changes.innerHTML = `<div class="fix-error">${error.message}</div>`;
    }
    
    if (window.addOutput) {
      window.addOutput('Failed to fix code: ' + error.message, 'error');
    }
  }
}

// Helper function to create a diff view between original and fixed code
function createDiffView(originalCode, fixedCode) {
  const container = document.createElement('div');
  container.className = 'fix-diff';

  const originalLines = originalCode.split('\n');
  const fixedLines = fixedCode.split('\n');
  
  let changes = 0;
  for (let i = 0; i < Math.max(originalLines.length, fixedLines.length); i++) {
    const originalLine = originalLines[i] || '';
    const fixedLine = fixedLines[i] || '';
    
    if (originalLine !== fixedLine) {
      changes++;
      const lineDiv = document.createElement('div');
      lineDiv.className = 'fix-diff-change';
      lineDiv.innerHTML = `
        <div class="fix-diff-old">${escapeHtml(originalLine)}</div>
        <div class="fix-diff-arrow">→</div>
        <div class="fix-diff-new">${escapeHtml(fixedLine)}</div>
      `;
      container.appendChild(lineDiv);
    }
  }

  const summary = document.createElement('div');
  summary.className = 'fix-diff-summary';
  summary.textContent = `Found ${changes} line${changes !== 1 ? 's' : ''} to fix`;
  container.insertBefore(summary, container.firstChild);

  return container;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function initEditor() {
  return new Promise(async (resolve) => {
    const ace = await import('ace');

    // Load both themes upfront
    await Promise.all([
      ace.default.config.loadModule('ace/theme/monokai'),
      ace.default.config.loadModule('ace/theme/chrome')
    ]);

    const editor = ace.default.edit('editor');

    editor.setTheme(LIGHT_THEME);
    editor.session.setMode('ace/mode/javascript');
    editor.setFontSize(14);
    editor.session.setUseSoftTabs(true);
    editor.session.setTabSize(2);

    editor.setValue(scriptState, 1);
    editor.selection.clearSelection();

    // Add fix button handler
    const fixButton = document.getElementById('fixCodeBtn');
    if (fixButton) {
      fixButton.addEventListener('click', () => {
        if (window.addOutput) {
          window.addOutput('Analyzing code...', 'log');
        }
        fixCode();
      });
    }

    editorInstance = editor;
    editor.session.on('change', persistScript);

    resolve(editor);
  });
}

function persistScript() {
  if (!editorInstance) return;
  scriptState = editorInstance.getValue();
  localStorage.setItem(SCRIPT_STORAGE_KEY, scriptState);
}

export function getEditor() {
  return editorInstance;
}

export function setEditorTheme(isDark) {
  if (editorInstance) {
    editorInstance.setTheme(isDark ? DARK_THEME : LIGHT_THEME);
  }
}

export function getScriptContent() {
  if (editorInstance) {
    persistScript();
  }
  return scriptState;
}

export function saveScript() {
  if (editorInstance) {
    persistScript();
  }
  return scriptState;
}

export function resetToDefaultScript() {
  scriptState = SCRIPT_DEFAULT;
  localStorage.setItem(SCRIPT_STORAGE_KEY, scriptState);
  if (editorInstance) {
    editorInstance.setValue(scriptState, 1);
    editorInstance.clearSelection();
    editorInstance.focus();
  }
}

// Added: safe compile/validation helpers.
// Attempt to compile the current script and return either the exported API or a concise error.
export function compileScriptSafe() {
  if (editorInstance) persistScript();
  const script = scriptState;

  // Wrap the user's script so top-level functions/vars are captured and returned.
  const wrapper = `"use strict";\n${script}\nreturn { draw: typeof draw==='function'?draw:undefined, update: typeof update==='function'?update:undefined, drawPreview: typeof drawPreview==='function'?drawPreview:undefined };`;

  try {
    const fn = new Function(wrapper);
    const api = fn(); // running here is fine for parsing; if runtime errors occur they'll surface
    return { ok: true, api };
  } catch (err) {
    const error = extractSimpleError(err);
    return { ok: false, error };
  }
}

// Convenience: check only syntax/compile validity and get a clean error message.
export function isScriptSyntaxValid() {
  const res = compileScriptSafe();
  return { valid: res.ok, error: res.ok ? null : res.error };
}

// Internal: return just the error type and message, nothing else.
function extractSimpleError(err) {
  if (!err) return 'Unknown error';
  let msg = err.message || String(err);
  
  // For syntax errors, just get the basic message
  if (msg.includes('SyntaxError:')) {
    return msg.split('\n')[0].split('at ')[0].trim();
  }
  
  // For other errors, clean up and return just the message
  msg = msg.split('\n')[0].trim();
  msg = msg.split('at ')[0].trim();
  return msg || 'Error occurred';
}

