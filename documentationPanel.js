import { jcScriptDocs } from './documentation.js';

class Documentation {
    constructor() {
        this.createDocPanel();
        this.setupEventListeners();
    }

    createDocPanel() {
        // Create the documentation panel
        const docPanel = document.createElement('div');
        docPanel.id = 'documentationPanel';
        docPanel.className = 'documentation-panel hidden';

        // Add header
        const header = document.createElement('div');
        header.className = 'documentation-header';
        header.innerHTML = `
            <h2>JcScript Documentation</h2>
            <button id="closeDocBtn" class="btn-close">×</button>
        `;

        // Add search
        const search = document.createElement('div');
        search.className = 'documentation-search';
        search.innerHTML = `
            <input type="text" id="docSearch" placeholder="Search commands...">
        `;

        // Add content
        const content = document.createElement('div');
        content.className = 'documentation-content';
        
        // Generate sections
        content.innerHTML = this.generateContent();

        // Add all elements to panel
        docPanel.appendChild(header);
        docPanel.appendChild(search);
        docPanel.appendChild(content);
        document.body.appendChild(docPanel);

        // Store references
        this.panel = docPanel;
        this.searchInput = docPanel.querySelector('#docSearch');
    }

    generateContent() {
        return jcScriptDocs.sections.map(section => `
            <div class="doc-section">
                <h3>${section.title}</h3>
                ${section.commands.map(cmd => `
                    <div class="doc-command" data-name="${cmd.name.toLowerCase()}">
                        <h4>${cmd.name}</h4>
                        <div class="doc-syntax">
                            <pre><code>${cmd.syntax}</code></pre>
                        </div>
                        <p class="doc-description">${cmd.description}</p>
                        <div class="doc-example">
                            <h5>Example:</h5>
                            <pre><code>${cmd.example}</code></pre>
                            <p class="doc-output">${cmd.output}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('closeDocBtn');
        closeBtn.addEventListener('click', () => this.hidePanel());

        // Search functionality
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Close on click outside
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.hidePanel();
            }
        });

        // Add menu item to settings
        const settingsMenu = document.getElementById('settingsMenu');
        const docMenuItem = document.createElement('div');
        docMenuItem.className = 'menu-item';
        docMenuItem.innerHTML = '📖 Documentation';
        docMenuItem.addEventListener('click', () => {
            this.showPanel();
            // Hide settings menu
            settingsMenu.classList.add('hidden');
        });

        // Add after dark mode toggle
        settingsMenu.appendChild(docMenuItem);
    }

    handleSearch(query) {
        query = query.toLowerCase();
        const commands = this.panel.querySelectorAll('.doc-command');
        
        commands.forEach(cmd => {
            const name = cmd.dataset.name;
            const content = cmd.textContent.toLowerCase();
            const visible = !query || name.includes(query) || content.includes(query);
            cmd.style.display = visible ? 'block' : 'none';
        });
    }

    showPanel() {
        this.panel.classList.remove('hidden');
        this.searchInput.focus();
    }

    hidePanel() {
        this.panel.classList.add('hidden');
    }
}

// Initialize documentation when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.documentation = new Documentation();
});