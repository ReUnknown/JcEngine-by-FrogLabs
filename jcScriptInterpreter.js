// JcScript Interpreter
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
        
        // Bind the key handlers to this instance
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        
        // Setup key listeners
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(e) {
        // Only handle keys when not in editor
        if (!e.target.closest('#editor')) {
            this.pressedKeys.add(e.key.toLowerCase());
            // Only prevent default in game area
            if (e.target.closest('.game-container') && 
                ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }
        }
    }

    handleKeyUp(e) {
        this.pressedKeys.delete(e.key.toLowerCase());
    }

    clearState() {
        this.variables.clear();
        this.entities.clear();
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals.clear();
        this.pressedKeys.clear();
        this.currentColor = '#000000';
        
        // Clear click handlers
        if (this.clickHandlers) {
            this.clickHandlers.forEach(handler => {
                this.canvas.removeEventListener('click', handler);
            });
            this.clickHandlers.clear();
        }
    }

    parseCommand(line) {
        line = line.trim();
        if (!line || line.startsWith('//')) return null;

        // Parse math expressions first
        if (line.includes('=') && !line.startsWith('let ')) {
            const [varName, expression] = line.split('=').map(p => p.trim());
            return () => {
                const result = this.evaluateExpression(expression);
                if (typeof result === 'number') {
                    this.variables.set(varName, result);
                } else {
                    this.console.error(`Invalid expression: ${expression}`);
                }
            };
        }

        // Parse commands
        if (line.startsWith('say ')) {
            const text = line.slice(4).trim().replace(/^"(.*)"$/, '$1');
            return () => this.console.log(text);
        }

        if (line.startsWith('make it ')) {
            const color = line.slice(8).trim();
            return () => this.currentColor = this.parseColor(color);
        }

        if (line.startsWith('make background ')) {
            const color = line.slice(15).trim();
            return () => {
                const bgColor = this.parseColor(color);
                this.ctx.save();
                this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                this.ctx.fillStyle = bgColor;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            };
        }

        if (line.startsWith('draw circle ')) {
            const match = line.match(/draw circle at \((\d+),(\d+)\) radius (\d+)/);
            if (match) {
                const [_, x, y, radius] = match;
                return () => {
                    this.ctx.beginPath();
                    this.ctx.arc(Number(x), Number(y), Number(radius), 0, Math.PI * 2);
                    this.ctx.fillStyle = this.currentColor;
                    this.ctx.fill();
                };
            }
        }

        if (line.startsWith('draw line ')) {
            const match = line.match(/draw line from \((\d+),(\d+)\) to \((\d+),(\d+)\) width (\d+)/);
            if (match) {
                const [_, x1, y1, x2, y2, width] = match;
                return () => {
                    this.ctx.beginPath();
                    this.ctx.moveTo(Number(x1), Number(y1));
                    this.ctx.lineTo(Number(x2), Number(y2));
                    this.ctx.strokeStyle = this.currentColor;
                    this.ctx.lineWidth = Number(width);
                    this.ctx.stroke();
                };
            }
        }

        if (line.startsWith('play sound ')) {
            const match = line.match(/play sound "(.*?)"/);
            if (match) {
                const [_, soundName] = match;
                return () => {
                    const assetName = soundName.replace(/\.sound$/, '').replace(/^assets\//, '');
                    const asset = Array.from(this.assetManager.getAllAssets()).find(([_, a]) => a.name === assetName)?.[1];
                    
                    if (!soundName.endsWith('.sound')) {
                        this.console.error(`Sound path must end with .sound extension. Use "${assetName}.sound" instead of "${soundName}"`);
                        return;
                    }
                    
                    if (!asset || !asset.type.startsWith('audio/')) {
                        this.console.error(`Sound "${assetName}.sound" not found in asset panel. Upload it first.`);
                        return;
                    }

                    const audio = new Audio(asset.data);
                    audio.play().catch(err => this.console.error('Failed to play sound:', err));
                };
            }
        }

        if (line.startsWith('let ')) {
            const parts = line.slice(4).split('=').map(p => p.trim());
            const varName = parts[0];
            const value = parts[1];

            if (value.startsWith('spawn ')) {
                const [x, y, w, h] = value.slice(6).split(' ').map(Number);
                return () => {
                    const entity = {
                        type: 'box',
                        x, y, w, h,
                        colour: this.currentColor
                    };
                    this.entities.set(varName, entity);
                };
            }

            if (value.startsWith('image ')) {
                const match = value.match(/image "(.*?)" at \((\d+),(\d+)\) size (\d+) (\d+)/);
                if (match) {
                    const [_, imgPath, x, y, w, h] = match;
                    return () => {
                        // Remove .image extension and handle assets folder path
                        const assetName = imgPath.replace(/\.image$/, '').replace(/^assets\//, '');
                        const asset = Array.from(this.assetManager.getAllAssets()).find(([_, a]) => a.name === assetName)?.[1];
                        
                        if (!imgPath.endsWith('.image')) {
                            this.console.error(`Image path must end with .image extension. Use "${assetName}.image" instead of "${imgPath}"`);
                            return;
                        }
                        
                        if (!asset || !asset.type.startsWith('image/')) {
                            this.console.error(`Image "${assetName}.image" not found in asset panel. Upload it first.`);
                            return;
                        }

                        const img = new Image();
                        img.src = asset.data;
                        const entity = {
                            type: 'image',
                            x: Number(x),
                            y: Number(y),
                            w: Number(w),
                            h: Number(h),
                            image: img,
                            assetName: assetName + '.image'
                        };
                        this.entities.set(varName, entity);
                    };
                }
            }

            if (value.startsWith('text ')) {
                const match = value.match(/text "(.*?)" at \((\d+),(\d+)\) size (\d+) colour (\w+) font "(.*?)"/);
                if (match) {
                    const [_, text, x, y, size, color, font] = match;
                    return () => {
                        const entity = {
                            type: 'text',
                            x: Number(x),
                            y: Number(y),
                            text,
                            size: Number(size),
                            colour: this.parseColor(color),
                            font
                        };
                        this.entities.set(varName, entity);
                    };
                }
            }

            // Simple number variable
            if (!isNaN(value)) {
                return () => this.variables.set(varName, Number(value));
            }
        }

        if (line.startsWith('if key ')) {
            // First, handle the line as a complete key command
            const match = line.match(/^if key "(.*?)" down then (.+)$/);
            if (match) {
                const [_, key, actionPart] = match;
                const lowerKey = key.toLowerCase();
                
                // Handle property assignment differently than other commands
                if (actionPart.includes('=')) {
                    const [entityPart, valuePart] = actionPart.split('=').map(p => p.trim());
                    const [entityName, property] = entityPart.split('.');
                    
                    const fn = () => {
                        if (this.pressedKeys.has(lowerKey)) {
                            const target = this.entities.get(entityName);
                            if (!target) {
                                this.console.error(`Entity "${entityName}" not found`);
                                return;
                            }
                            
                            if (['x', 'y', 'w', 'h'].includes(property)) {
                                const newValue = this.evaluateExpression(valuePart);
                                if (typeof newValue === 'number') {
                                    target[property] = newValue;
                                } else {
                                    this.console.error(`Invalid value for ${entityName}.${property}: ${valuePart}`);
                                }
                            } else if (property === 'colour' || property === 'color') {
                                target.colour = this.parseColor(valuePart);
                            } else {
                                this.console.error(`Unknown property "${property}" for entity "${entityName}"`);
                            }
                        }
                    };
                    fn.isKeyCommand = true;
                    return fn;
                } else {
                    // Handle other types of commands
                    const subCommand = this.parseCommand(actionPart);
                    const fn = () => {
                        if (this.pressedKeys.has(lowerKey)) {
                            try {
                                subCommand();
                            } catch (error) {
                                this.console.error(`Error in key command for ${key}:`, error);
                            }
                        }
                    };
                    fn.isKeyCommand = true;
                    return fn;
                }
            }
        }

        if (line.includes('.')) {
            // First, handle the line as a complete key command
            const match = line.match(/^if key "(.*?)" down then (.+)$/);
            if (match) {
                const [_, key, actionPart] = match;
                const lowerKey = key.toLowerCase();
                
                // Handle property assignment differently than other commands
                if (actionPart.includes('=')) {
                    const [entityPart, valuePart] = actionPart.split('=').map(p => p.trim());
                    const [entityName, property] = entityPart.split('.');
                    
                    const fn = () => {
                        if (this.pressedKeys.has(lowerKey)) {
                            const target = this.entities.get(entityName);
                            if (!target) {
                                this.console.error(`Entity "${entityName}" not found`);
                                return;
                            }
                            
                            if (['x', 'y', 'w', 'h'].includes(property)) {
                                const newValue = this.evaluateExpression(valuePart);
                                if (typeof newValue === 'number') {
                                    target[property] = newValue;
                                } else {
                                    this.console.error(`Invalid value for ${entityName}.${property}: ${valuePart}`);
                                }
                            } else if (property === 'colour' || property === 'color') {
                                target.colour = this.parseColor(valuePart);
                            } else {
                                this.console.error(`Unknown property "${property}" for entity "${entityName}"`);
                            }
                        }
                    };
                    fn.isKeyCommand = true;
                    return fn;
                } else {
                    // Handle other types of commands
                    const subCommand = this.parseCommand(actionPart);
                    const fn = () => {
                        if (this.pressedKeys.has(lowerKey)) {
                            try {
                                subCommand();
                            } catch (error) {
                                this.console.error(`Error in key command for ${key}:`, error);
                            }
                        }
                    };
                    fn.isKeyCommand = true;
                    return fn;
                }
            }
        }

        if (line.startsWith('add ')) {
            const [_, varName, amount] = line.match(/add (\w+) (-?\d+)/);
            return () => {
                const current = this.variables.get(varName) || 0;
                this.variables.set(varName, current + Number(amount));
            };
        }

        if (line.startsWith('random ')) {
            const match = line.match(/random from (\d+) to (\d+)/);
            if (match) {
                const [_, min, max] = match;
                return () => {
                    const result = Math.floor(Math.random() * (Number(max) - Number(min) + 1)) + Number(min);
                    return result;
                };
            }
        }

        if (line.startsWith('rotate ')) {
            const match = line.match(/rotate (.*?) by (\d+) degrees/);
            if (match) {
                const [_, entityName, degrees] = match;
                return () => {
                    const entity = this.entities.get(entityName);
                    if (!entity) {
                        this.console.error(`Entity "${entityName}" not found`);
                        return;
                    }
                    entity.rotation = (entity.rotation || 0) + Number(degrees);
                };
            }
        }

        if (line.startsWith('on click ')) {
            const actionPart = line.slice(9);
            const subCommand = this.parseCommand(actionPart);
            return () => {
                const handler = (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.variables.set('mouseX', x);
                    this.variables.set('mouseY', y);
                    subCommand();
                };
                this.canvas.addEventListener('click', handler);
                // Store handler reference for cleanup
                if (!this.clickHandlers) this.clickHandlers = new Set();
                this.clickHandlers.add(handler);
            };
        }

        if (line.startsWith('every ')) {
            const match = line.match(/every (\d+) seconds then (.*)/);
            if (match) {
                const [_, seconds, command] = match;
                const subCommand = this.parseCommand(command);
                return () => {
                    const interval = setInterval(subCommand, Number(seconds) * 1000);
                    this.intervals.add(interval);
                };
            }
        }

        return null;
    }

    parseColor(color) {
        if (color.startsWith('#')) return color;
        return color.toLowerCase(); // Using CSS color names
    }

    evaluateExpression(expr) {
        // Handle basic math expressions with variables
        expr = expr.trim();
        
        // First, evaluate any entity properties
        for (const [name, entity] of this.entities) {
            const regex = new RegExp(`${name}\\.(x|y|w|h)`, 'g');
            expr = expr.replace(regex, (match, prop) => {
                const value = entity[prop];
                if (typeof value !== 'number') {
                    this.console.error(`Invalid property value for ${match}`);
                    return 0;
                }
                return value;
            });
        }

        // Then evaluate variables
        for (const [name, value] of this.variables) {
            expr = expr.replace(new RegExp(name, 'g'), value);
        }

        try {
            const result = eval(expr); // Safe here since we control the input
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
        // Parse all commands and filter out empty/null ones
        const commands = script.split('\n')
            .map(line => this.parseCommand(line))
            .filter(cmd => cmd !== null);
        
        // Separate key movement commands from other commands
        const keyCommands = commands.filter(cmd => cmd.isKeyCommand);
        const setupCommands = commands.filter(cmd => !cmd.isKeyCommand);
        
        return {
            setup: () => {
                // Clear all state when starting
                this.clearState();
                // Run initial setup commands
                setupCommands.forEach(cmd => {
                    try {
                        cmd();
                    } catch (error) {
                        this.console.error('Error in setup:', error);
                    }
                });
            },
            update: () => {
                // Run all key commands every frame
                keyCommands.forEach(cmd => cmd());
            },
            draw: () => {
                // Draw all entities
                for (const entity of this.entities.values()) {
                    this.ctx.save();
                    switch (entity.type) {
                        case 'box':
                            if (entity.rotation) {
                                // Rotate around center of the box
                                this.ctx.translate(entity.x + entity.w/2, entity.y + entity.h/2);
                                this.ctx.rotate(entity.rotation * Math.PI / 180);
                                this.ctx.translate(-(entity.x + entity.w/2), -(entity.y + entity.h/2));
                            }
                            this.ctx.fillStyle = entity.colour;
                            this.ctx.fillRect(entity.x, entity.y, entity.w, entity.h);
                            break;
                        case 'image':
                            if (entity.image.complete) {
                                this.ctx.drawImage(entity.image, entity.x, entity.y, entity.w, entity.h);
                            }
                            break;
                        case 'text':
                            this.ctx.fillStyle = entity.colour;
                            this.ctx.font = `${entity.size}px "${entity.font}"`;
                            this.ctx.fillText(entity.text, entity.x, entity.y);
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
