class AIAssistant {
    constructor() {
        this.aiPanel = document.getElementById('aiAssistant');
        this.messagesContainer = document.getElementById('aiMessages');
        this.input = document.getElementById('aiInput');
        this.sendButton = document.getElementById('aiSendBtn');
        this.toggleButton = document.getElementById('aiAssistantBtn');
        this.closeButton = document.getElementById('aiCloseBtn');
        
        // Create typing indicator
        this.typingIndicator = document.createElement('div');
        this.typingIndicator.className = 'typing-indicator';
        this.typingIndicator.textContent = 'AI is typing...';
        this.messagesContainer.appendChild(this.typingIndicator);
        
        this.setupEventListeners();
        this.isTyping = false;
        
        // Add welcome message
        this.addMessage('assistant', 'Hello! I\'m your JcScript assistant. Ask me anything about JcScript programming and I\'ll help you out!');
    }

    setupEventListeners() {
        this.toggleButton.addEventListener('click', () => this.togglePanel());
        this.closeButton.addEventListener('click', () => this.hidePanel());
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    togglePanel() {
        this.aiPanel.classList.toggle('hidden');
    }

    hidePanel() {
        this.aiPanel.classList.add('hidden');
    }

    async sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // Disable input and show typing indicator
        this.setInputState(false);
        this.showTypingIndicator();

        // Add user message to chat
        this.addMessage('user', message);
        this.input.value = '';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            if (!data.response) {
                throw new Error('Received empty response from server');
            }

            this.addMessage('assistant', data.response);
        } catch (error) {
            console.error('Error:', error);
            let errorMessage = 'Sorry, I encountered an error. ';
            let canRetry = false;
            
            if (error.name === 'AbortError') {
                errorMessage += 'The request timed out. Please check your connection and try again.';
                canRetry = true;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Could not connect to the server. Please make sure the server is running.';
                canRetry = true;
            } else if (error.message.includes('interpreter not loaded')) {
                errorMessage = 'The JcScript interpreter is still loading. Please try again in a moment.';
                canRetry = true;
            } else {
                errorMessage += error.message;
            }

            if (canRetry) {
                errorMessage += '\n\nClick the message to try again.';
                const retryMessage = this.addMessage('error', errorMessage);
                const lastMessage = this.input.value.trim();
                retryMessage.style.cursor = 'pointer';
                retryMessage.addEventListener('click', () => {
                    this.input.value = lastMessage;
                    this.sendMessage();
                });
            } else {
                this.addMessage('error', errorMessage);
            }
            
            this.addMessage('error', errorMessage);
        } finally {
            this.hideTypingIndicator();
            this.setInputState(true);
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;
        
        // Format code blocks
        if (role === 'assistant' && content.includes('```')) {
            content = this.formatCodeBlocks(content);
            messageDiv.innerHTML = content;
        } else {
            messageDiv.textContent = content;
        }
        
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    formatCodeBlocks(content) {
        // Split by code blocks
        const parts = content.split(/```([\s\S]*?)```/);
        return parts.map((part, i) => {
            if (i % 2 === 0) {
                // Regular text
                return part;
            } else {
                // Code block
                return `<pre class="code-block"><code>${this.escapeHtml(part.trim())}</code></pre>`;
            }
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTypingIndicator() {
        this.typingIndicator.classList.add('visible');
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        this.typingIndicator.classList.remove('visible');
    }

    setInputState(enabled) {
        this.input.disabled = !enabled;
        this.sendButton.disabled = !enabled;
        if (enabled) {
            this.sendButton.classList.remove('disabled');
            this.input.focus();
        } else {
            this.sendButton.classList.add('disabled');
        }
    }
}

// Initialize the AI Assistant when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiAssistant = new AIAssistant();
});

