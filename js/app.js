// Main Application Logic
document.addEventListener('DOMContentLoaded', function () {
    // State
    let rootQuestionId = null;
    let conversationHistory = [];
    let currentThreadId = 1;
    let showThinking = true;
    let aiMessageContent = null;
    let webSearchEnabled = true;

    // Set your API credentials here
    // IMPORTANT: For production, use a backend proxy instead
    apiClient.init('eyJ4NXQjUzI1NiI6IkZ6T0FaM281NnVmeVhpQ0I5UGFUdURoN2JsOXQ0djlCTkFQUno2YXlPOWM9IiwieDV0IjoiN2xSeXIyYkJFQ2ltaXJQM3VuVC1aUmoxRjhBIiwia2lkIjoiRUU1NDcyQUY2NkMxMTAyOEE2OEFCM0Y3QkE3NEZFNjUxOEY1MTdDMCIsInR5cCI6ImF0K2p3dCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxOTAyOTQ1NzA1NTA3MjE3NDA5IiwiYXVkIjoibnF1ZXMiLCJuYmYiOjE3NDI1MzQ1NDksInNjb3BlIjoiYWRkcmVzcyBucXVlcyBwcm9maWxlIG9mZmxpbmVfYWNjZXNzIiwiaXNzIjoiaHR0cHM6Ly9ubW9yZS5zb2xhYi5haS8iLCJleHAiOjE3NDUxMjY1NDksImdpdmVuX25hbWUiOiJQb2UiLCJpYXQiOjE3NDI1MzQ1NDksImZhbWlseV9uYW1lIjoiQWxsZW4iLCJqdGkiOiI0OTU0MmI1ZC00OTc0LTRmNzEtOGUzOC0yMjU0OWZlYjY5MDYiLCJjbGllbnRfaWQiOiJBbmRyb2lkX0FwcCJ9.eqR7Eik8HUvLKxziDrTeiGp3IJO8Yc8fW0lpx9JciBf0GGN7lNIeellFaaVfQv94ki-NWcLxVl2WggTWdYeJBFwtWo87-dph9lxjaf3gr0rW9z22CXKaTVmVFFKR0ljPqsuf3BQBS5D-9El0Y83WlPqS5yuG4RSCGLTOI0hF8CYzultC7Tpc8ezeqsdDV1dq7UdJWnqapb6mI08jzGPK1cQC8xW8ySYizoj_DSOI4jmFJbCz1R1RQCtr0Zdvi2klfZkRw2RNnkq-Ht8TtMUpFJ_q0cPFVU2tbL8O5c61mEfTB7jyVDPP4_HJPUSRCo4TCDx3bD_ybe2AMBBBa40rew', '8092951178a43c62');

    // Event Listeners
    chatUI.sendBtn.addEventListener('click', sendMessage);
    chatUI.newChatBtn.addEventListener('click', startNewChat);
    chatUI.clearBtn.addEventListener('click', confirmClearChat);
    chatUI.exportBtn.addEventListener('click', () => chatUI.exportChat(conversationHistory, currentThreadId));

    chatUI.userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatUI.modelSelect.addEventListener('change', function () {
        apiClient.setModel(this.value);
        savePreferences();
    });

    chatUI.thinkingToggle.addEventListener('change', function () {
        showThinking = this.checked;
        savePreferences();
    });

    chatUI.websearchToggle.addEventListener('change', function () {
        webSearchEnabled = this.checked;
        apiClient.setWebSearch(webSearchEnabled);
        savePreferences();
    });

    // Initialize from saved preferences
    loadPreferences();

    // Main function to send a message
    async function sendMessage() {
        const message = chatUI.userInput.value.trim();
        if (!message) return;

        // Check if it's a command
        if (handleCommands(message)) {
            chatUI.userInput.value = '';
            chatUI.userInput.style.height = 'auto';
            return;
        }

        // Add user message to the chat
        chatUI.addMessage('user', message);
        conversationHistory.push({ role: 'user', content: message });

        // Clear input
        chatUI.userInput.value = '';
        chatUI.userInput.style.height = 'auto';

        // Disable input during processing
        chatUI.setLoading(true);

        try {
            let response;

            // Send message to API
            if (rootQuestionId === null) {
                // New question
                response = await apiClient.askNewQuestion(message);
                rootQuestionId = response.rootQuestionId;
            } else {
                // Follow-up question
                response = await apiClient.askFollowUp(rootQuestionId, message);
            }

            // Get the response ID
            const responseId = response.id;
            if (!responseId) {
                throw new Error('No response ID received');
            }

            // Get and process the answer
            await processAnswer(responseId);

        } catch (error) {
            console.error('Error in message flow:', error);
            chatUI.addMessage('system', `Error: ${error.message || 'Something went wrong. Please try again.'}`);
            chatUI.setLoading(false);
        }
    }

    // Process streaming answer response
    // Process streaming answer response
// Process streaming answer response
async function processAnswer(responseId) {
    try {
        // Variables for response processing
        let fullAnswer = '';
        let thinkingContent = '';
        let searchResults = []; // Array to store search results
        let answerStarted = false;
        
        // Create a new message for the AI response right away
        const aiMessage = chatUI.addMessage('ai', '');
        const messageContent = aiMessage.querySelector('.message-content');
        
        // Get streaming response
        const response = await apiClient.getAnswerStream(responseId);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process buffered data line by line
            let lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep the last incomplete line
            
            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data:')) continue;
                
                const data = line.substring(5).trim();
                if (data === '[DONE]') break;
                
                try {
                    const jsonData = JSON.parse(data);
                    
                    // Handle different message types
                    if (jsonData.type === "news") {
                        // Store search result
                        searchResults.push({
                            content: jsonData.content,
                            source: jsonData.source
                        });
                        console.log('Search result:', jsonData.content, jsonData.source);
                    } else if (jsonData.type === 'reason') {
                        // Collect thinking content
                        if (jsonData.content) {
                            thinkingContent += jsonData.content;
                            
                            // Update the message with thinking content if showing is enabled
                            if (showThinking) {
                                updateMessageContent();
                            }
                        }
                    } else if (jsonData.type === 'thinking_cost') {
                        // Just record thinking cost, no display needed
                        console.log('Thinking cost:', jsonData.content);
                    } else if (jsonData.content !== undefined && jsonData.content !== null) {
                        // Mark that answer has started
                        answerStarted = true;
                        
                        // Append content to the answer
                        const contentChunk = jsonData.content;
                        fullAnswer += contentChunk;
                        
                        // Update the message with both thinking and answer content
                        updateMessageContent();
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e);
                }
            }
        }
        
        // Add to conversation history (just the full answer, not thinking)
        conversationHistory.push({ role: 'ai', content: fullAnswer });
        
        // Re-enable input
        chatUI.setLoading(false);
        
        // Helper function to update the message content
        function updateMessageContent() {
            let content = '';
            
            // Add search results if available
            if (webSearchEnabled && searchResults.length > 0) {
                content += '<div class="search-results-container">';
                content += '<div class="search-results-header">Web Search Results:</div>';
                content += '<div class="search-results">';
                searchResults.forEach(result => {
                    content += `<div class="search-result">
                        <a href="${result.content}" target="_blank">${result.source}</a>
                    </div>`;
                });
                content += '</div></div>';
            }
            
            // Add thinking content if available and showing is enabled
            if (showThinking && thinkingContent) {
                content += `<div class="thinking-text">${thinkingContent}</div>`;
            }
            
            // Add answer content if available
            if (fullAnswer) {
                content += chatUI.formatMessage(fullAnswer);
            }
            
            // Update the message content
            messageContent.innerHTML = content;
            chatUI.scrollToBottom();
        }
        
    } catch (error) {
        console.error('Error getting answer:', error);
        chatUI.addMessage('system', `Error: ${error.message || 'Something went wrong with the response.'}`);
        chatUI.setLoading(false);
    }
}

    // Handle commands entered in the chat input
    function handleCommands(input) {
        const command = input.toLowerCase().trim();

        if (command === '/clear') {
            confirmClearChat();
            return true;
        } else if (command === '/new') {
            startNewChat();
            return true;
        } else if (command === '/websearch') {
            webSearchEnabled = !webSearchEnabled;
            chatUI.websearchToggle.checked = webSearchEnabled;
            apiClient.setWebSearch(webSearchEnabled);
            chatUI.addMessage('system', `Web search: ${webSearchEnabled ? 'ON' : 'OFF'}`);
            savePreferences();
            return true;
        }
        else if (command === '/thinking') {
            showThinking = !showThinking;
            chatUI.thinkingToggle.checked = showThinking;
            chatUI.addMessage('system', `Thinking process display: ${showThinking ? 'ON' : 'OFF'}`);
            savePreferences();
            return true;
        } else if (command.startsWith('/model ')) {
            const modelId = command.split(' ')[1];
            if (modelId) {
                apiClient.setModel(modelId);
                chatUI.modelSelect.value = modelId;
                chatUI.addMessage('system', `Model changed to ID: ${modelId}`);
                savePreferences();
            } else {
                chatUI.addMessage('system', 'Please specify a model ID, e.g., /model 7');
            }
            return true;
        } else if (command === '/help') {
            const helpMessage = `
<strong>Available Commands:</strong><br>
/clear - Clear the chat history<br>
/new - Start a new conversation<br>
/thinking - Toggle AI thinking process display<br>
/websearch - Toggle web search<br>
/model &lt;id&gt; - Change the model (e.g., /model 7)<br>
/help - Show this help message
`;
            chatUI.addMessage('system', helpMessage);
            return true;
        }

        return false;
    }

    // Start a new chat
    function startNewChat() {
        rootQuestionId = null;
        currentThreadId++;

        // Add a system message
        chatUI.addMessage('system', `--- New Conversation (Thread #${currentThreadId}) ---`);

        savePreferences();
    }

    // Confirm before clearing chat
    function confirmClearChat() {
        if (confirm("Are you sure you want to clear the chat history?")) {
            chatUI.clearChat();
            rootQuestionId = null;
            conversationHistory = [];
            currentThreadId = 1;

            savePreferences();
        }
    }

    // Save preferences to localStorage
    function savePreferences() {
        try {
            localStorage.setItem('nmore_showThinking', showThinking);
            localStorage.setItem('nmore_modelId', apiClient.config.modelId);
            localStorage.setItem('nmore_threadId', currentThreadId);
            localStorage.setItem('nmore_webSearch', webSearchEnabled);
        } catch (e) {
            console.warn('Unable to save preferences to localStorage:', e);
        }
    }

    // Load preferences from localStorage
    function loadPreferences() {
        try {
            // Load thinking toggle preference
            if (localStorage.getItem('nmore_showThinking') !== null) {
                showThinking = localStorage.getItem('nmore_showThinking') === 'true';
                chatUI.thinkingToggle.checked = showThinking;
            }
            // Load model preference
            if (localStorage.getItem('nmore_modelId')) {
                const savedModel = localStorage.getItem('nmore_modelId');
                apiClient.setModel(savedModel);
                chatUI.modelSelect.value = savedModel;
            }
            // Load thread ID
            if (localStorage.getItem('nmore_threadId')) {
                currentThreadId = parseInt(localStorage.getItem('nmore_threadId'), 10) || 1;
            }
            // Load web search preference
            if (localStorage.getItem('nmore_webSearch') !== null) {
                webSearchEnabled = localStorage.getItem('nmore_webSearch') === 'true';
                chatUI.websearchToggle.checked = webSearchEnabled;
                apiClient.setWebSearch(webSearchEnabled);
            }
        } catch (e) {
            console.warn('Unable to load preferences from localStorage:', e);
        }
    }

    // Display welcome message on first run
    function showWelcomeMessage() {
        if (!localStorage.getItem('nmore_firstRun')) {
            const welcomeMessage = `
            <strong>Welcome to NMore AI Chat!</strong><br><br>
            This interface allows you to interact with the NMore AI using your API credentials.
            <br><br>
            <strong>Getting Started:</strong><br>
            1. Edit the <code>app.js</code> file to add your API credentials<br>
            2. Type your message in the input field and press Enter or click Send<br>
            3. Use commands like /help, /new, or /clear for additional functionality
            <br><br>
            Type <code>/help</code> anytime to see available commands.
            `;

            chatUI.addMessage('system', welcomeMessage);

            try {
                localStorage.setItem('nmore_firstRun', 'true');
            } catch (e) {
                console.warn('Unable to save first run state to localStorage:', e);
            }
        }
    }

    // Initialize the application
    showWelcomeMessage();
});