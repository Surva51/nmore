// UI Manager for NMore Chat
class ChatUI {
    constructor() {
        // DOM elements
        this.chatMessages = document.getElementById('chat-messages');
        this.userInput = document.getElementById('user-input');
        this.sendBtn = document.getElementById('send-btn');
        this.newChatBtn = document.getElementById('new-chat-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.exportBtn = document.getElementById('export-btn');
        this.modelSelect = document.getElementById('model-select');
        this.thinkingToggle = document.getElementById('thinking-toggle');
        this.websearchToggle = document.getElementById('websearch-toggle');
        
        // Auto-resize textarea
        this.userInput.addEventListener('input', () => {
            this.userInput.style.height = 'auto';
            this.userInput.style.height = (this.userInput.scrollHeight) + 'px';
        });
    }

    // Add a message to the chat
    addMessage(role, content) {
        const message = document.createElement('div');
        
        if (role === 'system') {
            message.className = 'message message-system';
            message.innerHTML = content;
        } else {
            message.className = `message message-${role}`;
            
            const header = document.createElement('div');
            header.className = `message-header message-header-${role}`;
            header.textContent = role === 'user' ? 'You' : 'AI Assistant';
            
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = this.formatMessage(content);
            
            message.appendChild(header);
            message.appendChild(messageContent);
        }
        
        this.chatMessages.appendChild(message);
        this.scrollToBottom();
        
        return message;
    }

    // Add thinking indicator message
    addThinkingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message message-ai';
        indicator.innerHTML = `
            <div class="message-header message-header-ai">AI Assistant</div>
            <div class="typing-indicator">
                AI is thinking<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
            </div>
        `;
        this.chatMessages.appendChild(indicator);
        this.scrollToBottom();
        return indicator;
    }

    // Add thinking process box
   // Update the addThinkingBox method to better handle the content
// Update the addThinkingBox method to better handle the content
addThinkingBox(thinkingContent, thinkingCost) {
    const thinkingBox = document.createElement('div');
    thinkingBox.className = 'message message-ai has-thinking-box'; // Added has-thinking-box class
    thinkingBox.innerHTML = `
        <div class="message-header message-header-ai">AI Assistant</div>
        <div class="thinking-box">
            <div class="thinking-header">
                <span>AI Thinking Process</span>
                <span>Cost: ${thinkingCost}</span>
            </div>
            <pre style="white-space: pre-wrap; word-break: break-word;">${thinkingContent}</pre>
        </div>
        <div class="typing-indicator">
            AI is responding<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div>
    `;
    this.chatMessages.appendChild(thinkingBox);
    this.scrollToBottom();
    return thinkingBox;
}

    // Format message content (convert markdown-like syntax to HTML)
    formatMessage(text) {
        if (!text) return '';
        
        // Configure marked options
        marked.setOptions({
            breaks: true,        // Convert line breaks to <br>
            gfm: true,           // Use GitHub Flavored Markdown
            headerIds: false,    // Don't add ids to headers
            mangle: false,       // Don't mangle email addresses
            sanitize: false      // Don't sanitize (we're using DOMPurify)
        });
        
        // Optional: Add DOMPurify for security (recommended)
        // You'll need to also add: <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.3/purify.min.js"></script>
        if (typeof DOMPurify !== 'undefined') {
            return DOMPurify.sanitize(marked.parse(text));
        }
        
        return marked.parse(text);
    }

    // Clear the chat history
    clearChat() {
        while (this.chatMessages.firstChild) {
            this.chatMessages.removeChild(this.chatMessages.firstChild);
        }
        
        // Add welcome message
        this.addMessage('ai', '👋 Hello! I\'m an AI assistant. How can I help you today?');
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // Set loading state (enable/disable inputs)
    setLoading(isLoading) {
        this.userInput.disabled = isLoading;
        this.sendBtn.disabled = isLoading;
        
        if (!isLoading) {
            this.userInput.focus();
        }
    }

    // Export chat history
    exportChat(history, threadId) {
        if (history.length === 0) {
            alert("No conversation to export.");
            return;
        }
        
        // Format the chat for export
        let exportText = "# NMore AI Chat Export\n\n";
        exportText += `Date: ${new Date().toLocaleString()}\n`;
        exportText += `Thread ID: ${threadId}\n\n`;
        
        history.forEach(message => {
            exportText += `## ${message.role === 'user' ? 'You' : 'AI'}\n\n`;
            exportText += `${message.content}\n\n`;
        });
        
        // Create a download link
        const blob = new Blob([exportText], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nmore-chat-export-${Date.now()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Export UI manager
const chatUI = new ChatUI();