export const demoGames = {
    "Apple Catcher": `// Apple Catcher Game
make background #87CEEB

// Score display
let score = 0
let scoreText = text "Score: " + score at (20,40) size 24 colour black font "Arial"

// Game over flag
let gameOver = 0

// Function to spawn a new apple
every 2 seconds {
    // Random x position
    let x = 20 + random * 360
    let apple = image "#file:Apple.webp" at (x,0) size 40 40
    set velocity of apple to x:0 y:100
}

// Update all apples
every 0.016 seconds then {
    // Only run if not game over
    if gameOver = 0 then {
        // Move apples down
        for each apple in game {
            apply velocity to apple
            
            // Check if apple hit bottom
            if apple.y > 400 then {
                destroy apple
                add score -1
                scoreText.text = "Score: " + score
            }
        }
    }
}

// Handle clicks
on click {
    for each apple in game {
        if mouseX > apple.x and mouseX < apple.x + 40 and
           mouseY > apple.y and mouseY < apple.y + 40 then {
            destroy apple
            add score 1
            scoreText.text = "Score: " + score
            play sound "pop.sound"
        }
    }
}`,

    "UFO Controller": `// UFO Flight Game
make background #000000

// Create UFO
let ufo = image "#file:Ufo.webp" at (200,200) size 60 60
set velocity of ufo to x:0 y:0

// UFO controls
on key "ArrowUp" {
    accelerate ufo by x:0 y:-300
}
on key "ArrowDown" {
    accelerate ufo by x:0 y:300
}
on key "ArrowLeft" {
    accelerate ufo by x:-300 y:0
}
on key "ArrowRight" {
    accelerate ufo by x:300 y:0
}

// Apply friction
every 0.016 seconds then {
    set velocity of ufo to x:(ufo.velocityX * 0.98) y:(ufo.velocityY * 0.98)
    apply velocity to ufo
    
    // Keep UFO in bounds
    if ufo.x < 0 then ufo.x = 0
    if ufo.x > 340 then ufo.x = 340
    if ufo.y < 0 then ufo.y = 0
    if ufo.y > 340 then ufo.y = 340
}

// Rotate UFO based on movement
every 0.016 seconds then {
    if ufo.velocityX > 0 then rotate ufo by 2 degrees
    if ufo.velocityX < 0 then rotate ufo by -2 degrees
}`,

    "Snake Game": `// Snake Game
make background #222222

// Initialize score
let score = 0
let scoreText = text "Score: " + score at (20,40) size 24 colour white font "Arial"

// Create snake head
make it green
let head = circle at (200,200) size 20 20
set velocity of head to x:200 y:0

// Snake body segments
let segments = []

// Create initial apple
make it red
let apple = image "#file:Apple.webp" at (100,100) size 20 20

// Control snake direction
if key "ArrowUp" down then {
    if head.velocityY = 0 then set velocity of head to x:0 y:-200
}
if key "ArrowDown" down then {
    if head.velocityY = 0 then set velocity of head to x:0 y:200
}
if key "ArrowLeft" down then {
    if head.velocityX = 0 then set velocity of head to x:-200 y:0
}
if key "ArrowRight" down then {
    if head.velocityX = 0 then set velocity of head to x:200 y:0
}

// Move snake
every 0.016 seconds then {
    // Move head
    apply velocity to head
    
    // Keep in bounds
    if head.x < 0 then head.x = 380
    if head.x > 380 then head.x = 0
    if head.y < 0 then head.y = 380
    if head.y > 380 then head.y = 0
    
    // Check apple collision
    check collision between head and apple then {
            // Move apple
        apple.x = 20 + random * 360
        apple.y = 20 + random * 360
        
        // Add score
        add score 1
        scoreText.text = "Score: " + score
        
        // Add segment
        let newSegment = circle at (head.x,head.y) size 20 20
        make it green
        segments.push(newSegment)
    }
}

// Move segments
every 0.016 seconds then {
    // Update each segment to follow the one in front
    for each segment in game where segment != head and segment != apple {
        segment.x = segment.x + (head.x - segment.x) * 0.1
        segment.y = segment.y + (head.y - segment.y) * 0.1
    }
}`
};

import { loadDemoAssets } from './demoAssets.js';

export function createDemoMenu() {
    const settingsMenu = document.getElementById('settingsMenu');
    
    // Create submenu for demos
    const demoMenuItem = document.createElement('div');
    demoMenuItem.className = 'menu-item has-submenu';
    demoMenuItem.innerHTML = '🎮 Try Demo Games';
    
    const demoSubmenu = document.createElement('div');
    demoSubmenu.className = 'submenu hidden';
    
    // Add each demo game
    Object.keys(demoGames).forEach(gameName => {
        const gameItem = document.createElement('div');
        gameItem.className = 'submenu-item';
        gameItem.textContent = gameName;
        gameItem.addEventListener('click', () => {
            // Load assets first
            loadDemoAssets(window.assetManager);
            
            // Set the demo code after a short delay to ensure assets are loaded
            setTimeout(() => {
                // Get the editor instance
                const editor = ace.edit('editor');
                // Set the demo code
                editor.setValue(demoGames[gameName], -1);
                // Hide all menus
                settingsMenu.classList.add('hidden');
                demoSubmenu.classList.add('hidden');
            }, 100);
        });
        demoSubmenu.appendChild(gameItem);
    });
    
    // Show submenu on hover
    demoMenuItem.addEventListener('mouseenter', () => {
        const rect = demoMenuItem.getBoundingClientRect();
        demoSubmenu.style.top = `${rect.top}px`;
        demoSubmenu.style.left = `${rect.right}px`;
        demoSubmenu.classList.remove('hidden');
    });
    
    demoMenuItem.addEventListener('mouseleave', (e) => {
        // Check if moving to submenu
        const submenuRect = demoSubmenu.getBoundingClientRect();
        if (e.clientX < submenuRect.left || e.clientX > submenuRect.right ||
            e.clientY < submenuRect.top || e.clientY > submenuRect.bottom) {
            demoSubmenu.classList.add('hidden');
        }
    });
    
    demoSubmenu.addEventListener('mouseleave', () => {
        demoSubmenu.classList.add('hidden');
    });
    
    // Add to DOM
    document.body.appendChild(demoSubmenu);
    settingsMenu.appendChild(demoMenuItem);
}