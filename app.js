import { initGameEngine } from './gameEngine.js';
import { initAssetManager } from './assetManager.js';
import { 
    initEditor, 
    setEditorTheme, 
    getScriptContent, 
    saveScript 
} from './editor.js';
import { createDemoMenu } from './demoGames.js';
import { assetManager } from './assetManager.js';

// Initialize modules
let gameEngine;
let editor;
let isGameRunning = false; // Track state locally

// Make assetManager globally available for the interpreter
window.assetManager = assetManager;

// Min widths to match CSS
const MIN_LEFT = 250;
const MIN_CENTER = 320;
const MIN_RIGHT = 240;
const MIN_OUTPUT_HEIGHT = 120;
const MIN_GAME_HEIGHT = 200;

// Panels and layout references
const leftPanel = document.querySelector('.left-panel');
const centerPanel = document.querySelector('.center-panel');
const rightPanel = document.querySelector('.right-panel');
const mainLayout = document.querySelector('.main-layout');
const bodyEl = document.body;
const resizerLC = document.getElementById('resizer-left-center');
const resizerCR = document.getElementById('resizer-center-right');
const resizerGO = document.getElementById('resizer-game-output');
const outputPanel = document.getElementById('outputPanel');
const outputContent = document.getElementById('outputContent');
const gameContainer = document.querySelector('.game-container');

const OUTPUT_TYPE_CLASS = {
    log: 'output-line-log',
    warn: 'output-line-warn',
    error: 'output-line-error'
};

// Panel state initialization
const panelState = {
    'left': { element: leftPanel, name: 'Script', isVisible: true, minWidth: MIN_LEFT, storedBasis: 300, statusSpan: null, dimension: 'width' },
    'center': { element: centerPanel, name: 'Game Window', isVisible: true, minWidth: MIN_CENTER, storedBasis: null, statusSpan: null, dimension: 'width' },
    'output': { element: outputPanel, name: 'Output', isVisible: true, minSize: MIN_OUTPUT_HEIGHT, storedBasis: 200, statusSpan: null, dimension: 'height', resizer: resizerGO },
    'right': { element: rightPanel, name: 'Assets', isVisible: true, minWidth: MIN_RIGHT, storedBasis: 280, statusSpan: null, dimension: 'width' }
};

if (!outputPanel || !resizerGO) {
    delete panelState.output;
}

function clearOutput() {
    if (!outputContent) return;
    outputContent.innerHTML = '';
}

function appendOutput(type, ...args) {
    if (!outputContent) return;
    const line = document.createElement('div');
    const className = OUTPUT_TYPE_CLASS[type] || OUTPUT_TYPE_CLASS.log;
    line.className = `output-line ${className}`;
    line.textContent = formatOutputArgs(args);
    outputContent.appendChild(line);
    outputContent.scrollTop = outputContent.scrollHeight;
}

function formatOutputArgs(args) {
    return args.map(formatOutputValue).join(' ');
}

function formatOutputValue(value) {
    if (value instanceof Error) {
        return value.stack || `${value.name}: ${value.message}`;
    }
    if (typeof value === 'object' && value !== null) {
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return '[Unserializable Object]';
        }
    }
    return String(value);
}

// Dark Mode Handling
const DARK_MODE_STORAGE_KEY = 'frogLabsDarkMode';
let isDarkMode = false; // Initial state

async function initializeApp() {
    // 1. Check for stored theme preference immediately
    isDarkMode = localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }

    // Setup clear output button
    const clearOutputBtn = document.getElementById('clearOutputBtn');
    if (clearOutputBtn) {
        clearOutputBtn.addEventListener('click', clearOutput);
    }

    // Initialize demo games menu
    createDemoMenu();

    // Initialize editor
    editor = await initEditor();
    setEditorTheme(isDarkMode); // Set initial theme based on stored preference
    
    // Initialize game engine
    const canvas = document.getElementById('gameCanvas');
    gameEngine = initGameEngine(canvas);
    gameEngine.setOutputHandlers({
        log: (...args) => appendOutput('log', ...args),
        warn: (...args) => appendOutput('warn', ...args),
        error: (...args) => appendOutput('error', ...args)
    });

    // Initial render of the script preview
    const scriptCode = getScriptContent();
    gameEngine.renderInitialState(scriptCode);
    
    // Initialize asset manager
    initAssetManager();
    
    // Apply initial panel sizes and visibility setup
    applyPanelVisibility();
    
    // Setup event listeners
    setupEventListeners();
    setupPanelToggleMenu();
    setupSettingsMenu();
}

function applyPanelVisibility() {
    Object.keys(panelState).forEach(key => {
        const state = panelState[key];
        if (!state || !state.element) return;

        let shouldShow = state.isVisible;

        if (key === 'left') {
            state.element.style.flexBasis = `${shouldShow ? state.storedBasis : 0}px`;
            state.element.style.minWidth = shouldShow ? `${MIN_LEFT}px` : '0';
        } else if (key === 'right') {
            state.element.style.flexBasis = `${shouldShow ? state.storedBasis : 0}px`;
            state.element.style.minWidth = shouldShow ? `${MIN_RIGHT}px` : '0';
        } else if (key === 'center') {
            if (shouldShow) {
                state.element.style.flexGrow = '1';
                state.element.style.flexShrink = '1';
                state.element.style.flexBasis = 'auto';
                state.element.style.minWidth = `${MIN_CENTER}px`;
            } else {
                state.element.style.flexGrow = '0';
                state.element.style.flexShrink = '0';
                state.element.style.flexBasis = '0';
                state.element.style.minWidth = '0';
            }
        } else if (key === 'output') {
            shouldShow = shouldShow && panelState.center && panelState.center.isVisible;
            const minSize = state.minSize ?? MIN_OUTPUT_HEIGHT;
            const basis = Math.max(minSize, state.storedBasis ?? minSize);
            if (shouldShow) {
                state.element.style.flexBasis = `${basis}px`;
                state.element.style.flexGrow = '0';
                state.element.style.flexShrink = '0';
            } else {
                state.element.style.flexBasis = '0';
            }

            if (state.resizer) {
                state.resizer.classList.toggle('hidden', !shouldShow);
            }
        }

        state.element.classList.toggle('hidden', !shouldShow);
    });
    
    if (resizerLC) {
        resizerLC.classList.toggle('hidden', !(panelState.left?.isVisible && panelState.center?.isVisible));
    }
    if (resizerCR) {
        resizerCR.classList.toggle('hidden', !(panelState.center?.isVisible && panelState.right?.isVisible));
    }

    if (editor && panelState.left.isVisible) editor.resize();
    if (gameEngine && gameEngine.manualResize) gameEngine.manualResize();
}

function togglePanelVisibility(panelKey) {
    // Game Window (center) cannot be hidden
    if (panelKey === 'center') return; 
    
    const state = panelState[panelKey];
    if (!state || !state.element) return;
    
    // Prevent hiding the last panel
    let visibleCount = Object.values(panelState).filter(p => p.isVisible).length;
    if (state.isVisible && visibleCount <= 1) return;

    // If we are hiding, store the current visible size first (only for L/R)
    if (state.isVisible && panelKey !== 'center') {
        const rect = state.element.getBoundingClientRect();
        const size = state.dimension === 'height' ? rect.height : rect.width;
        state.storedBasis = Math.round(size);
    }
    
    state.isVisible = !state.isVisible;
    
    applyPanelVisibility();
    updatePanelMenuUI();
}

function setupPanelToggleMenu() {
    const toggleBtn = document.getElementById('togglePanelsBtn');
    const menu = document.getElementById('panelMenu');

    // Create menu items and initial status
    Object.keys(panelState).forEach(key => {
        const state = panelState[key];
        if (!state || !state.element) return;

        const item = document.createElement('div');
        item.className = 'menu-item';
        item.textContent = state.name;
        
        // Center panel cannot be toggled, apply visual state
        if (key === 'center') {
            item.classList.add('menu-item-disabled');
        } else {
            item.addEventListener('click', () => togglePanelVisibility(key));
        }
        
        const statusSpan = document.createElement('span');
        statusSpan.className = 'menu-item-status';
        item.appendChild(statusSpan);
        
        menu.appendChild(item);
        
        state.statusSpan = statusSpan; // Store reference to update status text
    });

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        if (!menu.classList.contains('hidden')) {
            updatePanelMenuUI();
        }
        // Close settings menu if open
        document.getElementById('settingsMenu').classList.add('hidden');
    });
    
    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== toggleBtn) {
            menu.classList.add('hidden');
        }
    });

    updatePanelMenuUI(); // Initial status update
}

function setupSettingsMenu() {
    const settingsBtn = document.getElementById('settingsBtn');
    const menu = document.getElementById('settingsMenu');

    // Create Dark Mode Toggle item
    const darkModeItem = document.createElement('label');
    darkModeItem.className = 'menu-item dark-mode-toggle-item';
    
    const label = document.createElement('span');
    label.textContent = 'Dark Mode';
    
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = isDarkMode;
    
    toggle.addEventListener('change', () => {
        toggleDarkMode(toggle.checked);
    });
    
    darkModeItem.appendChild(label);
    darkModeItem.appendChild(toggle);
    menu.appendChild(darkModeItem);

    // Toggle menu visibility
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        
        // Close panel menu if open
        document.getElementById('panelMenu').classList.add('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== settingsBtn) {
            menu.classList.add('hidden');
        }
    });
}

function toggleDarkMode(enable) {
    isDarkMode = enable;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem(DARK_MODE_STORAGE_KEY, isDarkMode);
    setEditorTheme(isDarkMode);
}

function updatePanelMenuUI() {
    Object.keys(panelState).forEach(key => {
        const state = panelState[key];
        if (!state || !state.statusSpan) return;

        // Center panel is always visible
        if (key === 'center') {
            state.statusSpan.textContent = '✓';
        } else {
            state.statusSpan.textContent = state.isVisible ? '✓' : '—';
        }
    });
}

function setupEventListeners() {
    const runStopBtn = document.getElementById('runBtn');
    const saveBtn = document.getElementById('saveBtn');

    function updateRunButtons(running) {
        if (running) {
            runStopBtn.innerHTML = '⏹ Stop';
            runStopBtn.classList.remove('btn-primary');
            runStopBtn.classList.add('btn-stop-active');
        } else {
            runStopBtn.innerHTML = '▶ Run';
            runStopBtn.classList.remove('btn-stop-active');
            runStopBtn.classList.add('btn-primary');
        }

        const fsContainer = document.getElementById('fullscreenContainer');
        if (fsContainer && !fsContainer.classList.contains('hidden')) {
            const fsRunStopBtn = document.getElementById('fullscreenRunStopBtn');
            updateFullscreenRunStopButton(fsRunStopBtn, running);
        }
    }

    function updateFullscreenRunStopButton(fsRunStopBtn, running) {
        if (!fsRunStopBtn) return;

        if (running) {
            fsRunStopBtn.innerHTML = '⏹ Stop';
            fsRunStopBtn.classList.remove('btn-primary');
            fsRunStopBtn.classList.add('btn-stop-active');
        } else {
            fsRunStopBtn.innerHTML = '▶ Run';
            fsRunStopBtn.classList.remove('btn-stop-active');
            fsRunStopBtn.classList.add('btn-primary');
        }

        const newBtn = fsRunStopBtn.cloneNode(true);
        fsRunStopBtn.parentNode.replaceChild(newBtn, fsRunStopBtn);
        newBtn.addEventListener('click', toggleRunStop);
    }

    function toggleRunStop() {
        if (isGameRunning) {
            gameEngine.stop();
            return;
        }

        clearOutput();
        appendOutput('log', 'Running script...');

        const scriptCode = getScriptContent();
        gameEngine.run(scriptCode);

        isGameRunning = true;
        updateRunButtons(true);
    }

    function handleEngineStop() {
        if (!isGameRunning) return;
        isGameRunning = false;
        updateRunButtons(false);
    }

    gameEngine.setLifecycleHandlers({ onStop: handleEngineStop });

    function handleSaveScript() {
        if (isGameRunning) {
            appendOutput('warn', 'Cannot save while the game is running.');
            return;
        }

        const script = saveScript();
        gameEngine.renderInitialState(script);
        appendOutput('log', 'Script saved and preview updated.');
    }

    runStopBtn.addEventListener('click', toggleRunStop);
    saveBtn.addEventListener('click', handleSaveScript);
    
    // Fullscreen button
    document.getElementById('fullscreenBtn').addEventListener('click', () => {
        const container = document.getElementById('fullscreenContainer');
        const fullscreenCanvas = document.getElementById('fullscreenCanvas');
        const originalCanvas = document.getElementById('gameCanvas');
        
        if (container.classList.contains('hidden')) {
            // Enter fullscreen mode
            container.classList.remove('hidden');
            
            // Copy canvas state to fullscreen canvas
            fullscreenCanvas.width = originalCanvas.width;
            fullscreenCanvas.height = originalCanvas.height;
            const fsCtx = fullscreenCanvas.getContext('2d');
            fsCtx.drawImage(originalCanvas, 0, 0);
            
            // Setup fullscreen run/stop button
            const fsRunStopBtn = document.getElementById('fullscreenRunStopBtn');
            updateFullscreenRunStopButton(fsRunStopBtn, isGameRunning);
        }
    });
    
    document.getElementById('exitFullscreenBtn').addEventListener('click', () => {
        const container = document.getElementById('fullscreenContainer');
        container.classList.add('hidden');
    });
    
    // Utility: Trigger resize when the window geometry changes
    window.addEventListener('resize', () => {
        if (gameEngine && gameEngine.manualResize) gameEngine.manualResize();
        if (editor && panelState.left.isVisible) editor.resize();
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Utility clamp
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// Only start drag on mousedown over the resizer
if (resizerLC) {
  resizerLC.addEventListener('mousedown', (e) => startDrag(e, 'LC'));
}
if (resizerCR) {
  resizerCR.addEventListener('mousedown', (e) => startDrag(e, 'CR'));
}
if (resizerGO) {
  resizerGO.addEventListener('mousedown', startVerticalDrag);
}

function startDrag(e, which) {
  e.preventDefault();

  // Check visibility before starting drag
  if (which === 'LC' && (!panelState.left.isVisible || !panelState.center.isVisible)) return;
  if (which === 'CR' && (!panelState.center.isVisible || !panelState.right.isVisible)) return;

  // Initial measurements
  const startX = e.clientX;
  const layoutRect = mainLayout.getBoundingClientRect();
  const totalLayoutWidth = layoutRect.width;

  // Calculate current widths of visible panels based on DOM
  const currentLeftWidth = panelState.left.element.getBoundingClientRect().width;
  const currentRightWidth = panelState.right.element.getBoundingClientRect().width;

  // Use stored/current values for calculations
  let initialLeft = currentLeftWidth;
  let initialRight = currentRightWidth;

  // Determine minimum widths for currently VISIBLE adjacent panels
  const minCenterIfVisible = panelState.center.isVisible ? MIN_CENTER : 0;
  const minLeftIfVisible = panelState.left.isVisible ? MIN_LEFT : 0;
  const minRightIfVisible = panelState.right.isVisible ? MIN_RIGHT : 0;

  // Add visual/UX classes
  mainLayout.classList.add('resizing-horizontal');
  bodyEl.classList.add('noselect');

  // Mouse move handler
  function onMove(ev) {
    const deltaX = ev.clientX - startX;
    
    if (which === 'LC') {
      // Adjust Left size, Center compensates. Right remains fixed if visible.
      // Max size for Left is Total Layout Width - Min Center - Current Right fixed size
      let fixedRightWidth = panelState.right.isVisible ? initialRight : 0;
      let maxLeft = totalLayoutWidth - minCenterIfVisible - fixedRightWidth;
      
      let newLeft = clamp(initialLeft + deltaX, minLeftIfVisible, maxLeft);
      
      panelState.left.element.style.flexBasis = `${Math.round(newLeft)}px`;
      
      // Store the new basis for persistence
      panelState.left.storedBasis = Math.round(newLeft);

    } else if (which === 'CR') {
      // Adjust Right size, Center compensates. Left remains fixed if visible.
      // Max size for Right is Total Layout Width - Min Center - Current Left fixed size
      let fixedLeftWidth = panelState.left.isVisible ? initialLeft : 0;
      let maxRight = totalLayoutWidth - minCenterIfVisible - fixedLeftWidth;

      let newRight = clamp(initialRight - deltaX, minRightIfVisible, maxRight);
      
      panelState.right.element.style.flexBasis = `${Math.round(newRight)}px`;
      
      // Store the new basis for persistence
      panelState.right.storedBasis = Math.round(newRight);
    }
    
    // Since layout has changed, update editor and game canvas size
    if (editor && panelState.left.isVisible) editor.resize();
    if (gameEngine && gameEngine.manualResize) gameEngine.manualResize();
  }

  // End drag
  function onUp() {
    mainLayout.classList.remove('resizing-horizontal');
    bodyEl.classList.remove('noselect');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
}

function startVerticalDrag(e) {
  const state = panelState.output;
  const centerState = panelState.center;

  if (!state || !state.element || !state.isVisible || !centerState || !centerState.isVisible) return;

  e.preventDefault();

  const startY = e.clientY;
  const outputRect = state.element.getBoundingClientRect();
  const startOutputHeight = outputRect.height;
  const gameRect = gameContainer ? gameContainer.getBoundingClientRect() : { height: 0 };
  const startGameHeight = gameRect.height;
  const totalHeight = startOutputHeight + startGameHeight;
  const minOutput = state.minSize ?? MIN_OUTPUT_HEIGHT;
  const minGame = MIN_GAME_HEIGHT;
  const maxOutput = Math.max(minOutput, totalHeight - minGame);

  mainLayout.classList.add('resizing-vertical');
  bodyEl.classList.add('noselect');

  function onMove(ev) {
    const deltaY = ev.clientY - startY;
    let desiredHeight = startOutputHeight + deltaY;
    desiredHeight = clamp(desiredHeight, minOutput, maxOutput);
    const rounded = Math.round(desiredHeight);
    state.element.style.flexBasis = `${rounded}px`;
    state.storedBasis = rounded;

    if (gameEngine && gameEngine.manualResize) {
      gameEngine.manualResize();
    }
  }

  function onUp() {
    mainLayout.classList.remove('resizing-vertical');
    bodyEl.classList.remove('noselect');
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseup', onUp);
}
