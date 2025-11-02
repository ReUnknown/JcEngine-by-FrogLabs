class AdManager {
    constructor() {
        this.timeRemaining = 120; // 5 minutes in seconds
        this.adContainer = this.createAdContainer();
        this.timeDisplay = this.createTimeDisplay();
        this.adVideo = null;
        this.timer = null;
        this.currentQuizLevel = 0;
        this.correctAnswersInARow = 0;
        this.startTimer();
    }

    generateMathQuestion() {
        switch(this.currentQuizLevel) {
            case 0: // Easy: Simple addition or subtraction
                const isAddition = Math.random() < 0.5;
                const num1 = Math.floor(Math.random() * 20) + 1;
                const num2 = Math.floor(Math.random() * 20) + 1;
                return {
                    question: `${num1} ${isAddition ? '+' : '-'} ${num2} = ?`,
                    answer: isAddition ? num1 + num2 : num1 - num2,
                    levelText: "Level 1/3: Basic Arithmetic"
                };

            case 1: // Medium: Division or multiplication
                const isMultiplication = Math.random() < 0.5;
                if (isMultiplication) {
                    const a = Math.floor(Math.random() * 12) + 1;
                    const b = Math.floor(Math.random() * 12) + 1;
                    return {
                        question: `${a} × ${b} = ?`,
                        answer: a * b,
                        levelText: "Level 2/3: Multiplication"
                    };
                } else {
                    const divisor = Math.floor(Math.random() * 11) + 2; // 2-12
                    const result = Math.floor(Math.random() * 10) + 1; // 1-10
                    const dividend = divisor * result;
                    return {
                        question: `${dividend} ÷ ${divisor} = ?`,
                        answer: result,
                        levelText: "Level 2/3: Division"
                    };
                }

            case 2: // Hard: Calculus-style question
                const problems = [
                    {
                        question: "If f(x) = x², what is f'(x) when x = 3?",
                        answer: 6,
                        levelText: "Level 3/3: 1st grader skillz - Derivatives"
                    },
                    {
                        question: "What is the derivative of 2x³ at x = 2?",
                        answer: 24,
                        levelText: "Level 3/3: 1st grader skillz - Power Rule"
                    },
                    {
                        question: "Find ∫₀¹ x dx",
                        answer: 0.5,
                        levelText: "Level 3/3: 1st grader skillz - Basic Integration"
                    },
                    {
                        question: "If velocity = 3t², what's acceleration at t = 2?",
                        answer: 6,
                        levelText: "Level 3/3: 1st grader skillz - Physics Application"
                    }
                ];
                return problems[Math.floor(Math.random() * problems.length)];

            default:
                return {
                    question: "2 + 2 = ?",
                    answer: 4,
                    levelText: "Bonus Question"
                };
        }
    }

    createAdContainer() {
        const container = document.createElement('div');
        container.id = 'adContainer';
        container.className = 'ad-container hidden';
        
        const mathProblem = this.generateMathQuestion();
        
        container.innerHTML = `
            <div class="ad-content">
                <div class="ad-header">You must watch this sponsor to gain more minutes!</div>
                <video id="adVideo" controls="false" playbackRate="1">
                    <source src="assets/Ad.mp4" type="video/mp4">
                </video>
                <div class="ad-controls">
                    <div class="skip-section">
                        <button id="skipQuizBtn" class="btn btn-secondary">Skip with Math Quiz Challenge</button>
                        <div id="quizSection" class="quiz-section hidden">
                            <div class="quiz-progress">Solve 3 questions in a row to skip!</div>
                            <div class="quiz-level">${mathProblem.levelText}</div>
                            <div class="math-question">${mathProblem.question}</div>
                            <input type="number" step="0.1" id="mathAnswer" placeholder="Enter answer" class="math-input">
                            <button id="submitAnswer" class="btn btn-primary">Submit</button>
                            <div class="quiz-status">Questions Correct: 0/3</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        this.setupQuizHandlers(mathProblem.answer);
        return container;
    }

    setupQuizHandlers(correctAnswer) {
        const skipBtn = document.getElementById('skipQuizBtn');
        const quizSection = document.getElementById('quizSection');
        const submitBtn = document.getElementById('submitAnswer');
        const answerInput = document.getElementById('mathAnswer');
        const quizStatus = document.querySelector('.quiz-status');
        const quizLevel = document.querySelector('.quiz-level');

        skipBtn.addEventListener('click', () => {
            skipBtn.classList.add('hidden');
            quizSection.classList.remove('hidden');
            // Pause the video while solving
            const video = document.getElementById('adVideo');
            video.pause();
        });

        submitBtn.addEventListener('click', () => {
            const userAnswer = parseFloat(answerInput.value);
            if (Math.abs(userAnswer - correctAnswer) < 0.1) { // Allow small rounding errors
                this.correctAnswersInARow++;
                quizStatus.textContent = `Questions Correct: ${this.correctAnswersInARow}/3`;
                
                if (this.correctAnswersInARow >= 3) {
                    // User completed all levels
                    this.hideAd();
                    this.timeRemaining = 300; // Reset to 5 minutes
                    this.startTimer();
                    this.correctAnswersInARow = 0;
                    this.currentQuizLevel = 0;
                } else {
                    // Move to next level
                    this.currentQuizLevel++;
                    const newProblem = this.generateMathQuestion();
                    document.querySelector('.math-question').textContent = newProblem.question;
                    quizLevel.textContent = newProblem.levelText;
                    correctAnswer = newProblem.answer;
                    answerInput.value = '';
                    answerInput.placeholder = 'Enter answer';
                }
            } else {
                // Wrong answer resets progress
                this.correctAnswersInARow = 0;
                this.currentQuizLevel = 0;
                answerInput.value = '';
                answerInput.placeholder = 'Try again!';
                quizStatus.textContent = 'Questions Correct: 0/3';
                // Generate new question from level 1
                const newProblem = this.generateMathQuestion();
                document.querySelector('.math-question').textContent = newProblem.question;
                quizLevel.textContent = newProblem.levelText;
                correctAnswer = newProblem.answer;
            }
        });
    }

    createTimeDisplay() {
        const display = document.createElement('div');
        display.id = 'timeDisplay';
        display.className = 'time-display';
        document.querySelector('.header').appendChild(display);
        return display;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    updateTimeDisplay() {
        this.timeDisplay.textContent = `Time Remaining: ${this.formatTime(this.timeRemaining)}`;
    }

    startTimer() {
        this.updateTimeDisplay();
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimeDisplay();
            
            if (this.timeRemaining <= 0) {
                clearInterval(this.timer);
                this.showAd();
            }
        }, 1000);
    }

    showAd() {
        this.adContainer.classList.remove('hidden');
        const video = document.getElementById('adVideo');
        
        // Reset quiz progress
        this.correctAnswersInARow = 0;
        this.currentQuizLevel = 0;
        
        // Ensure video starts from beginning and plays automatically
        video.currentTime = 0;
        video.muted = false;
        video.playbackRate = 1.0; // Force normal speed
        
        // Prevent speed changes
        video.addEventListener('ratechange', () => {
            if (video.playbackRate !== 1.0) {
                video.playbackRate = 1.0;
            }
        });
        
        // Start playing
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Auto-play was prevented:", error);
                // Show a play button or message if autoplay is blocked
            });
        }

        // Handle ad completion
        video.onended = () => {
            this.hideAd();
            this.timeRemaining = 300; // Reset to 5 minutes
            this.startTimer();
        };

        // Prevent seeking through video
        video.onseeking = () => {
            if (video.currentTime > 0) {
                video.currentTime = 0;
            }
        };
    }

    hideAd() {
        this.adContainer.classList.add('hidden');
        // Reset quiz state
        const skipBtn = document.getElementById('skipQuizBtn');
        const quizSection = document.getElementById('quizSection');
        if (skipBtn && quizSection) {
            skipBtn.classList.remove('hidden');
            quizSection.classList.add('hidden');
            // Reset quiz progress displays
            document.querySelector('.quiz-status').textContent = 'Questions Correct: 0/3';
            const newProblem = this.generateMathQuestion();
            document.querySelector('.math-question').textContent = newProblem.question;
            document.querySelector('.quiz-level').textContent = newProblem.levelText;
            document.getElementById('mathAnswer').value = '';
            document.getElementById('mathAnswer').placeholder = 'Enter answer';
        }
    }
}

// Export singleton instance
export const adManager = new AdManager();
