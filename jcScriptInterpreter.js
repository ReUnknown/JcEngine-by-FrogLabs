// JcScript Interpreter (fixed ordering + property assignment + small QoL)
class JcScriptInterpreter {
  constructor(ctx, canvas, console, assetManager) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.console = console;
    this.assetManager = assetManager;
    this.variables = new Map();
    this.entities = new Map();
    this.intervals = new Set();
    this.currentColor = '#000000';
    this.pressedKeys = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    // Ignore typing in the editor
    if (!e.target.closest('#editor')) {
      const key = e.key.toLowerCase();
      this.pressedKeys.add(key);
      if (e.target.closest('.game-container') &&
          ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
        e.preventDefault();
      }
    }
  }
  handleKeyUp(e) { this.pressedKeys.delete(e.key.toLowerCase()); }

  clearState() {
    this.variables.clear();
    this.entities.clear();
    this.intervals.forEach(clearInterval);
    this.intervals.clear();
    this.pressedKeys.clear();
    this.currentColor = '#000000';

    if (this.clickHandlers) {
      this.clickHandlers.forEach(h => this.canvas.removeEventListener('click', h));
      this.clickHandlers.clear();
    }
  }

  parseCommand(line) {
    line = line.trim();
    if (!line || line.startsWith('//')) return null;

    // === 1) KEY COMMANDS FIRST ===
    // if key "w" down then name.y = name.y - 5
    if (line.startsWith('if key ')) {
      const m = line.match(/^if key "(.*?)" down then (.+)$/);
      if (m) {
        const [, key, actionPart] = m;
        const lowerKey = key.toLowerCase();

        // Property assignment inside key
        if (/^\w+\.(x|y|w|h|colour|color|text)\s*=/.test(actionPart)) {
          const [lhs, rhs] = actionPart.split('=').map(s => s.trim());
          const [entityName, prop] = lhs.split('.');
          const fn = () => {
            if (!this.pressedKeys.has(lowerKey)) return;
            const target = this.entities.get(entityName);
            if (!target) { this.console.error(`Entity "${entityName}" not found`); return; }

            if (prop === 'text') {
              const str = rhs.replace(/^"(.*)"$/, '$1');
              target.text = str;
              return;
            }
            if (prop === 'colour' || prop === 'color') {
              target.colour = this.parseColor(rhs);
              return;
            }

            const val = this.evaluateExpression(rhs);
            if (typeof val === 'number') target[prop] = val;
            else this.console.error(`Invalid value for ${entityName}.${prop}: ${rhs}`);
          };
          fn.isKeyCommand = true;
          return fn;
        }

        // Otherwise, treat the RHS as a subcommand
        const sub = this.parseCommand(actionPart);
        const fn = () => {
          if (this.pressedKeys.has(lowerKey)) {
            try { sub && sub(); } catch(err){ this.console.error(`Error in key command for ${key}:`, err); }
          }
        };
        fn.isKeyCommand = true;
        return fn;
      }
    }

    // === 2) ENTITY PROPERTY ASSIGNMENT (non-key) ===
    // name.x = name.x + 5
    if (/^\w+\.(x|y|w|h|colour|color|text)\s*=/.test(line)) {
      const [lhs, rhs] = line.split('=').map(s => s.trim());
      const [entityName, prop] = lhs.split('.');
      return () => {
        const target = this.entities.get(entityName);
        if (!target) { this.console.error(`Entity "${entityName}" not found`); return; }

        if (prop === 'text') {
          const str = rhs.replace(/^"(.*)"$/, '$1');
          target.text = str;
          return;
        }
        if (prop === 'colour' || prop === 'color') {
          target.colour = this.parseColor(rhs);
          return;
        }

        const val = this.evaluateExpression(rhs);
        if (typeof val === 'number') target[prop] = val;
        else this.console.error(`Invalid value for ${entityName}.${prop}: ${rhs}`);
      };
    }

    // === 3) DECLARATIONS & COMMANDS ===

    // say "hello"
    if (line.startsWith('say ')) {
      const text = line.slice(4).trim().replace(/^"(.*)"$/, '$1');
      return () => this.console.log(text);
    }

    // make it red
    if (line.startsWith('make it ')) {
      const color = line.slice(8).trim();
      return () => { this.currentColor = this.parseColor(color); };
    }

    // make background skyblue
    if (line.startsWith('make background ')) {
      const color = line.slice(15).trim();
      return () => {
        const bg = this.parseColor(color);
        this.ctx.save();
        this.ctx.setTransform(1,0,0,1,0,0);
        this.ctx.fillStyle = bg;
        this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
        this.ctx.restore();
      };
    }

    // draw circle at (x,y) radius r
    if (line.startsWith('draw circle ')) {
      const m = line.match(/draw circle at \((\d+),(\d+)\) radius (\d+)/);
      if (m) {
        const [, x,y,r] = m;
        return () => {
          this.ctx.beginPath();
          this.ctx.arc(+x,+y,+r,0,Math.PI*2);
          this.ctx.fillStyle = this.currentColor;
          this.ctx.fill();
        };
      }
    }

    // draw line from (x1,y1) to (x2,y2) width w
    if (line.startsWith('draw line ')) {
      const m = line.match(/draw line from \((\d+),(\d+)\) to \((\d+),(\d+)\) width (\d+)/);
      if (m) {
        const [, x1,y1,x2,y2,w] = m;
        return () => {
          this.ctx.beginPath();
          this.ctx.moveTo(+x1,+y1);
          this.ctx.lineTo(+x2,+y2);
          this.ctx.strokeStyle = this.currentColor;
          this.ctx.lineWidth = +w;
          this.ctx.stroke();
        };
      }
    }

    // play sound "name.sound"
    if (line.startsWith('play sound ')) {
      const m = line.match(/play sound "(.*?)"/);
      if (m) {
        const [, soundName] = m;
        return () => {
          const base = soundName.replace(/\.sound$/, '').replace(/^assets\//,'');
          const asset = Array.from(this.assetManager.getAllAssets()).find(([_,a]) => a.name === base)?.[1];
          if (!soundName.endsWith('.sound')) { this.console.error(`Sound must end with .sound (use "${base}.sound")`); return; }
          if (!asset || !asset.type.startsWith('audio/')) { this.console.error(`Sound "${base}.sound" not found in asset panel`); return; }
          new Audio(asset.data).play().catch(err=>this.console.error('Failed to play sound:', err));
        };
      }
    }

    // let name = spawn x y w h
    // let name = image "frog.image" at (x,y) size w h
    // let name = text "msg" at (x,y) size N colour red font "Arial"
    if (line.startsWith('let ')) {
      const [varName, rhsRaw] = line.slice(4).split('=').map(s => s.trim());
      const rhs = rhsRaw || '';

      if (rhs.startsWith('spawn ')) {
        const [x, y, w, h] = rhs.slice(6).split(' ').map(Number);
        return () => {
          const entity = { type:'box', x, y, w, h, colour: this.currentColor };
          this.entities.set(varName, entity);
        };
      }

      if (rhs.startsWith('image ')) {
        const m = rhs.match(/image "(.*?)" at \((\d+),(\d+)\) size (\d+) (\d+)/);
        if (m) {
          const [, imgPath, x, y, w, h] = m;
          return () => {
            const base = imgPath.replace(/\.image$/, '').replace(/^assets\//,'');
            const asset = Array.from(this.assetManager.getAllAssets()).find(([_,a]) => a.name === base)?.[1];
            if (!imgPath.endsWith('.image')) { this.console.error(`Image must end with .image (use "${base}.image")`); return; }
            if (!asset || !asset.type.startsWith('image/')) { this.console.error(`Image "${base}.image" not found in asset panel`); return; }
            const img = new Image(); img.src = asset.data;
            const entity = { type:'image', x:+x, y:+y, w:+w, h:+h, image: img, assetName: base+'.image' };
            this.entities.set(varName, entity);
          };
        }
      }

      if (rhs.startsWith('text ')) {
        const m = rhs.match(/text "(.*?)" at \((\d+),(\d+)\) size (\d+) colour (\S+) font "(.*?)"/);
        if (m) {
          const [, text, x, y, size, color, font] = m;
          return () => {
            const entity = {
              type:'text',
              x:+x, y:+y,
              text,
              size:+size,
              colour: this.parseColor(color),
              font
            };
            this.entities.set(varName, entity);
          };
        }
      }

      // let score = 0
      if (!Number.isNaN(Number(rhs))) {
        return () => this.variables.set(varName, Number(rhs));
      }
    }

    // add score 1
    if (line.startsWith('add ')) {
      const m = line.match(/add (\w+) (-?\d+)/);
      if (m) {
        const [, varName, amount] = m;
        return () => {
          const cur = this.variables.get(varName) || 0;
          this.variables.set(varName, cur + Number(amount));
        };
      }
    }

    // random from A to B  (returns a function; best used inside future expressions)
    if (line.startsWith('random ')) {
      const m = line.match(/random from (\d+) to (\d+)/);
      if (m) {
        const [, min, max] = m;
        return () => Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
      }
    }

    // rotate entity by N degrees
    if (line.startsWith('rotate ')) {
      const m = line.match(/rotate (\w+) by (\d+) degrees/);
      if (m) {
        const [, entityName, deg] = m;
        return () => {
          const e = this.entities.get(entityName);
          if (!e) { this.console.error(`Entity "${entityName}" not found`); return; }
          e.rotation = (e.rotation || 0) + Number(deg);
        };
      }
    }

    // on click <command>
    if (line.startsWith('on click ')) {
      const action = line.slice(9);
      const sub = this.parseCommand(action);
      return () => {
        const handler = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          this.variables.set('mouseX', x);
          this.variables.set('mouseY', y);
          try { sub && sub(); } catch(err){ this.console.error('Error in click handler:', err); }
        };
        this.canvas.addEventListener('click', handler);
        if (!this.clickHandlers) this.clickHandlers = new Set();
        this.clickHandlers.add(handler);
      };
    }

    // every N seconds then <command>
    if (line.startsWith('every ')) {
      const m = line.match(/every (\d+) seconds then (.*)/);
      if (m) {
        const [, seconds, cmd] = m;
        const sub = this.parseCommand(cmd);
        return () => {
          const id = setInterval(() => { sub && sub(); }, Number(seconds) * 1000);
          this.intervals.add(id);
        };
      }
    }

    return null;
  }

  parseColor(color) {
    if (color.startsWith('#')) return color;
    return color.toLowerCase();
  }

  evaluateExpression(expr) {
    // Replace entity prop references: name.x, name.y, etc.
    let s = expr.trim();
    for (const [name, entity] of this.entities) {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(`${safe}\\.(x|y|w|h)`, 'g');
      s = s.replace(rx, (_, prop) => {
        const v = entity[prop];
        if (typeof v !== 'number') { this.console.error(`Invalid property value for ${name}.${prop}`); return 0; }
        return v;
      });
    }
    // Replace scalar variables
    for (const [name, val] of this.variables) {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      s = s.replace(new RegExp(`\\b${safe}\\b`, 'g'), val);
    }

    try {
      const result = eval(s);
      if (typeof result !== 'number') {
        this.console.error(`Expression "${expr}" did not evaluate to a number`);
        return 0;
      }
      return result;
    } catch (e) {
      this.console.error(`Error evaluating "${expr}": ${e.message}`);
      return 0;
    }
  }

  parseScript(script) {
    const commands = script.split('\n')
      .map(line => this.parseCommand(line))
      .filter(Boolean);

    const keyCommands = commands.filter(c => c.isKeyCommand);
    const setupCommands = commands.filter(c => !c.isKeyCommand);

    return {
      setup: () => {
        this.clearState();
        setupCommands.forEach(cmd => { try { cmd(); } catch(e){ this.console.error('Error in setup:', e); } });
      },
      update: () => { keyCommands.forEach(cmd => cmd()); },
      draw: () => {
        for (const e of this.entities.values()) {
          this.ctx.save();
          switch (e.type) {
            case 'box':
              if (e.rotation) {
                this.ctx.translate(e.x + e.w/2, e.y + e.h/2);
                this.ctx.rotate((e.rotation * Math.PI)/180);
                this.ctx.translate(-(e.x + e.w/2), -(e.y + e.h/2));
              }
              this.ctx.fillStyle = e.colour;
              this.ctx.fillRect(e.x, e.y, e.w, e.h);
              break;
            case 'image':
              if (e.image.complete) this.ctx.drawImage(e.image, e.x, e.y, e.w, e.h);
              break;
            case 'text':
              this.ctx.fillStyle = e.colour;
              this.ctx.font = `${e.size}px "${e.font}"`;
              this.ctx.fillText(e.text, e.x, e.y);
              break;
          }
          this.ctx.restore();
        }
      }
    };
  }
}

export function createInterpreter(ctx, canvas, console, assetManager) {
  return new JcScriptInterpreter(ctx, canvas, console, assetManager);
}
