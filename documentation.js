export const jcScriptDocs = {
    sections: [
        {
            title: "Basic Commands",
            commands: [
                {
                    name: "say",
                    syntax: 'say "your message"',
                    description: "Outputs a message to the console.",
                    example: 'say "Hello, World!"',
                    output: "Prints 'Hello, World!' to the console"
                },
                {
                    name: "draw circle",
                    syntax: "draw circle at (x,y) radius size",
                    description: "Draws a filled circle at the specified position with given radius. Uses current color.",
                    example: "make it blue\ndraw circle at (100,100) radius 30",
                    output: "Draws a blue circle centered at (100,100) with radius 30"
                },
                {
                    name: "draw line",
                    syntax: "draw line from (x1,y1) to (x2,y2) width size",
                    description: "Draws a line between two points with specified width. Uses current color.",
                    example: "make it red\ndraw line from (50,50) to (150,150) width 5",
                    output: "Draws a red line from (50,50) to (150,150) with width 5"
                },
                {
                    name: "make it",
                    syntax: "make it color",
                    description: "Sets the current color for new shapes. Accepts color names or hex codes.",
                    example: "make it blue\nmake it #FF0000",
                    output: "Sets drawing color to blue or red"
                },
                {
                    name: "make background",
                    syntax: "make background color",
                    description: "Sets the background color of the game canvas.",
                    example: "make background #87ceeb",
                    output: "Sets the background to sky blue"
                }
            ]
        },
        {
            title: "Variables and Objects",
            commands: [
                {
                    name: "let (number)",
                    syntax: "let variableName = number",
                    description: "Creates a variable with a numeric value.",
                    example: "let score = 0\nlet lives = 3",
                    output: "Creates variables 'score' and 'lives'"
                },
                {
                    name: "let spawn (box)",
                    syntax: "let name = spawn x y width height",
                    description: "Creates a box shape at the specified position and size. Uses current color.",
                    example: "make it blue\nlet player = spawn 50 50 40 40",
                    output: "Creates a blue 40x40 box at position (50,50)"
                },
                {
                    name: "let text",
                    syntax: 'let name = text "content" at (x,y) size fontSize colour color font "fontName"',
                    description: "Creates text on the screen with specified properties.",
                    example: 'let scoreText = text "Score: 0" at (20,40) size 20 colour black font "Arial"',
                    output: "Creates black Arial text at position (20,40)"
                },
                {
                    name: "let image",
                    syntax: 'let name = image "filename.image" at (x,y) size width height',
                    description: "Places an image on the screen. Image must be uploaded in Assets panel first.",
                    example: 'let sprite = image "player.image" at (100,100) size 64 64',
                    output: "Places player.image at (100,100) with size 64x64"
                }
            ]
        },
        {
            title: "Input and Movement",
            commands: [
                {
                    name: "if key",
                    syntax: 'if key "keyName" down then action',
                    description: "Performs an action when a specific key is pressed. Key names are case-sensitive.",
                    example: 'if key "ArrowRight" down then player.x = player.x + 5',
                    output: "Moves player right when right arrow is pressed"
                },
                {
                    name: "property change",
                    syntax: "objectName.property = value",
                    description: "Changes a property of an object. Valid properties: x, y, w, h, colour, text",
                    example: "player.x = player.x + 5\nscoreText.text = \"Score: \" + score",
                    output: "Updates object properties"
                }
            ]
        },
        {
            title: "Time and Updates",
            commands: [
                {
                    name: "every",
                    syntax: "every N seconds then action",
                    description: "Performs an action repeatedly at the specified interval.",
                    example: "every 1 seconds then add score 1",
                    output: "Increases score by 1 every second"
                },
                {
                    name: "add",
                    syntax: "add variableName amount",
                    description: "Adds a number to a variable. Can be negative for subtraction.",
                    example: "add score 1\nadd lives -1",
                    output: "Adds 1 to score or subtracts 1 from lives"
                }
            ]
        },
        {
            title: "Audio and Events",
            commands: [
                {
                    name: "play sound",
                    syntax: 'play sound "filename.sound"',
                    description: "Plays an audio file. The sound must be uploaded in the Assets panel first.",
                    example: 'play sound "jump.sound"',
                    output: "Plays the jump sound effect"
                },
                {
                    name: "on click",
                    syntax: "on click action",
                    description: "Executes an action when the game canvas is clicked. Sets mouseX and mouseY variables.",
                    example: 'on click say "Clicked!"',
                    output: "Shows 'Clicked!' in console when canvas is clicked"
                }
            ]
        },
        {
            title: "Math and Random",
            commands: [
                {
                    name: "random",
                    syntax: "random from min to max",
                    description: "Generates a random whole number between min and max (inclusive).",
                    example: "let roll = random from 1 to 6",
                    output: "Sets roll to a random number between 1 and 6"
                },
                {
                    name: "direct math",
                    syntax: "variable = expression",
                    description: "Performs math operations directly. Can use +, -, *, /, and existing variables.",
                    example: "score = score * 2\nhealth = health - 10",
                    output: "Doubles score or reduces health by 10"
                }
            ]
        },
        {
            title: "Advanced Graphics",
            commands: [
                {
                    name: "rotate",
                    syntax: "rotate objectName by degrees degrees",
                    description: "Rotates an object by the specified number of degrees.",
                    example: "rotate player by 90 degrees",
                    output: "Rotates the player object 90 degrees clockwise"
                }
            ]
        },
        {
            title: "Physics and Movement",
            commands: [
                {
                    name: "set velocity",
                    syntax: "set velocity of object to x:value y:value",
                    description: "Sets the velocity of an object. Values can be expressions.",
                    example: "set velocity of player to x:100 y:0",
                    output: "Sets player's horizontal velocity to 100 pixels per second"
                },
                {
                    name: "accelerate",
                    syntax: "accelerate object by x:value y:value",
                    description: "Applies acceleration to an object's velocity over time.",
                    example: "accelerate ufo by x:200 y:0",
                    output: "Increases UFO's horizontal velocity by 200 pixels per second squared"
                },
                {
                    name: "apply velocity",
                    syntax: "apply velocity to object",
                    description: "Updates object position based on its current velocity.",
                    example: "apply velocity to player",
                    output: "Moves player according to its velocity"
                }
            ]
        },
        {
            title: "Game Mechanics",
            commands: [
                {
                    name: "check collision",
                    syntax: "check collision between object1 and object2 then action",
                    description: "Executes an action when two objects collide.",
                    example: "check collision between player and apple then add score 1",
                    output: "Adds 1 to score when player touches apple"
                },
                {
                    name: "destroy",
                    syntax: "destroy objectName",
                    description: "Removes an object from the game.",
                    example: "destroy apple",
                    output: "Removes the apple object from the game"
                }
            ]
        }
    ]
};