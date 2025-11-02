import { createInterpreter } from './jcScriptInterpreter.js';

export function initGameEngine(canvas) {
  const ctx = canvas.getContext('2d');
  const fullscreenCanvas = document.getElementById('fullscreenCanvas');
  const fullscreenCtx = fullscreenCanvas ? fullscreenCanvas.getContext('2d') : null;
  const originalConsole = window.console;
  let interpreter = null;

  let animationId;
  let isRunning = false;
  let activeScript = '';
  let outputHandlers = createOutputHandlers();
  let lifecycleHandlers = { onStop: null };

  const engineApi = {
    stop: () => stop()
  };

  function createOutputHandlers(handlers = {}) {
    return {
      log: handlers.log || null,
      warn: handlers.warn || null,
      error: handlers.error || null
    };
  }

  function forwardOutput(type, args) {
    const targetType = type === 'info' ? 'log' : type;
    const handler = outputHandlers[targetType];
    if (handler) {
      try {
        handler(...args);
      } catch (err) {
        originalConsole.error('Output handler error:', err);
      }
    }

    if (originalConsole[type]) {
      originalConsole[type](...args);
    } else {
      originalConsole.log(...args);
    }
  }

  function createConsoleProxy() {
    return {
      log: (...args) => forwardOutput('log', args),
      info: (...args) => forwardOutput('info', args),
      warn: (...args) => forwardOutput('warn', args),
      error: (...args) => forwardOutput('error', args),
      clear: () => {
        if (originalConsole.clear) {
          originalConsole.clear();
        }
      }
    };
  }

  // Prevent unwanted print dialogs in Firefox
  window.addEventListener('keydown', (e) => {
    // Prevent Ctrl+P or Command+P
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
    }
  }, { capture: true });

  function resizeCanvas() {
    const maxWidth = canvas.parentElement.clientWidth - 32;
    const maxHeight = canvas.parentElement.clientHeight - 32;

    let width = maxWidth;
    let height = (width * 3) / 4;

    if (height > maxHeight) {
      height = maxHeight;
      width = (height * 4) / 3;
    }

    canvas.width = width;
    canvas.height = height;

    const scale = Math.min(width / 800, height / 600);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function clearCanvas() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function executeRuntime(code) {
    const consoleProxy = createConsoleProxy();
    try {
      if (!interpreter) {
        interpreter = createInterpreter(ctx, canvas, consoleProxy, window.assetManager);
      }
      const runtime = interpreter.parseScript(code);
      runtime.setup();
      return runtime;
    } catch (error) {
      forwardOutput('error', [error]);
      throw error;
    }
  }

  function runPreview() {
    clearCanvas();
    if (!activeScript) return;

    const previewWrapper = `
      ${activeScript}
      if (typeof drawPreview === "function") {
        drawPreview(ctx);
      } else if (typeof drawIndex === "function") {
        drawIndex(ctx);
      } else if (typeof draw === "function") {
        draw(ctx, canvas);
      }
    `;

    try {
      executeRuntime(previewWrapper);
    } catch (error) {
      // Preview errors are already logged, keep canvas clear
    }
  }

  let currentRuntime = null;

  function gameLoop() {
    clearCanvas();

    const fsContainer = document.getElementById('fullscreenContainer');
    const fullscreenActive = fsContainer && !fsContainer.classList.contains('hidden');

    if (activeScript && currentRuntime) {
      try {
        currentRuntime.update();
        currentRuntime.draw();
      } catch (error) {
        forwardOutput('error', [error]);
        stop();
        runPreview();
        return;
      }
    }

    if (fullscreenActive && fullscreenCtx) {
      fullscreenCtx.clearRect(0, 0, fullscreenCanvas.width, fullscreenCanvas.height);
      fullscreenCtx.fillStyle = 'white';
      fullscreenCtx.fillRect(0, 0, fullscreenCanvas.width, fullscreenCanvas.height);
      fullscreenCtx.drawImage(canvas, 0, 0);
    }

    if (isRunning) {
      animationId = requestAnimationFrame(gameLoop);
    }
  }

  function stop() {
    isRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    runPreview();
    if (lifecycleHandlers.onStop) {
      try {
        lifecycleHandlers.onStop();
      } catch (err) {
        originalConsole.error('Lifecycle handler error:', err);
      }
    }
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  return {
    run(script) {
      activeScript = script || '';

      // Make sure we're in a clean state
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      isRunning = true;
      
      try {
        // Try initial execution to catch immediate errors
        currentRuntime = executeRuntime(activeScript);
        gameLoop();
      } catch (error) {
        // If there's an immediate error, stop properly
        stop();
        throw error; // Re-throw to trigger error handling
      }
    },
    stop,
    renderInitialState(script) {
      activeScript = script || '';
      if (!isRunning) {
        runPreview();
      }
    },
    manualResize() {
      resizeCanvas();
      if (!isRunning) {
        runPreview();
      }
    },
    setOutputHandlers(handlers) {
      outputHandlers = createOutputHandlers(handlers);
    },
    setLifecycleHandlers(handlers = {}) {
      lifecycleHandlers = {
        onStop: handlers.onStop || null
      };
    },
    getContext() {
      return ctx;
    },
    getCanvas() {
      return canvas;
    }
  };
}
