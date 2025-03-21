// API Client for NMore Chat
class NMoreAPI {
    constructor() {
        this.config = {
            baseUrl: 'https://nmore.solab.ai',
            auth: 'Bearer eyJ4NXQjUzI1NiI6IkZ6T0FaM281NnVmeVhpQ0I5UGFUdURoN2JsOXQ0djlCTkFQUno2YXlPOWM9IiwieDV0IjoiN2xSeXIyYkJFQ2ltaXJQM3VuVC1aUmoxRjhBIiwia2lkIjoiRUU1NDcyQUY2NkMxMTAyOEE2OEFCM0Y3QkE3NEZFNjUxOEY1MTdDMCIsInR5cCI6ImF0K2p3dCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxOTAyOTQ1NzA1NTA3MjE3NDA5IiwiYXVkIjoibnF1ZXMiLCJuYmYiOjE3NDI1MzQ1NDksInNjb3BlIjoiYWRkcmVzcyBucXVlcyBwcm9maWxlIG9mZmxpbmVfYWNjZXNzIiwiaXNzIjoiaHR0cHM6Ly9ubW9yZS5zb2xhYi5haS8iLCJleHAiOjE3NDUxMjY1NDksImdpdmVuX25hbWUiOiJQb2UiLCJpYXQiOjE3NDI1MzQ1NDksImZhbWlseV9uYW1lIjoiQWxsZW4iLCJqdGkiOiI0OTU0MmI1ZC00OTc0LTRmNzEtOGUzOC0yMjU0OWZlYjY5MDYiLCJjbGllbnRfaWQiOiJBbmRyb2lkX0FwcCJ9.eqR7Eik8HUvLKxziDrTeiGp3IJO8Yc8fW0lpx9JciBf0GGN7lNIeellFaaVfQv94ki-NWcLxVl2WggTWdYeJBFwtWo87-dph9lxjaf3gr0rW9z22CXKaTVmVFFKR0ljPqsuf3BQBS5D-9El0Y83WlPqS5yuG4RSCGLTOI0hF8CYzultC7Tpc8ezeqsdDV1dq7UdJWnqapb6mI08jzGPK1cQC8xW8ySYizoj_DSOI4jmFJbCz1R1RQCtr0Zdvi2klfZkRw2RNnkq-Ht8TtMUpFJ_q0cPFVU2tbL8O5c61mEfTB7jyVDPP4_HJPUSRCo4TCDx3bD_ybe2AMBBBa40rew', // Replace with actual token
            shandaIdentity: '8092951178a43c62', // Replace with actual ID
            modelId: '6',
            webSearch: 'true'
        };
    }

    // Initialize with actual credentials
    init(authToken, shandaIdentity) {
        this.config.auth = `Bearer ${authToken}`;
        this.config.shandaIdentity = shandaIdentity;
        console.log('API client initialized');
    }

    // Set model ID
    setModel(modelId) {
        this.config.modelId = modelId;
    }

    // Set web search option
    setWebSearch(enabled) {
        this.config.webSearch = enabled ? 'true' : 'false';
    }

    // Get common headers for all requests
    getHeaders(isStream = false) {
        const headers = {
            'User-Agent': 'Dart/3.5 (dart:io)',
            'shanda_identity': this.config.shandaIdentity,
            'shanda_platform': 'Web_App',
            'shanda_version': '2',
            'Accept-Language': 'en',
            'Accept-Encoding': 'gzip',
            'shanda_timezone': 'Asia/Shanghai',
            'Authorization': this.config.auth,
            'Host': 'nmore.solab.ai',
            'Content-Type': 'application/json'
        };

        if (isStream) {
            headers['Accept'] = '*/*, text/event-stream';
            headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8,es;q=0.7';
            delete headers['Content-Type'];
        }

        return headers;
    }

    // Ask a new question to start a conversation
    async askNewQuestion(question) {
        try {
            const url = `${this.config.baseUrl}/api/dis/qa/newAsk`;
            
            const payload = {
                newsId: "",
                relatedQuestionId: "",
                question: question,
                modelId: this.config.modelId,
                webSearch: this.config.webSearch
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error asking new question:', error);
            throw error;
        }
    }

    // Ask a follow-up question in the current conversation
    async askFollowUp(rootQuestionId, question) {
        try {
            const url = `${this.config.baseUrl}/api/dis/qa/followUp`;
            
            const payload = {
                rootQuestionId: rootQuestionId,
                question: question,
                modelId: this.config.modelId,
                webSearch: this.config.webSearch
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error asking follow-up question:', error);
            throw error;
        }
    }

    // Get the answer stream for a response ID
    // Debugging: Add a console log to see what's coming in the stream
getAnswerStream(responseId) {
    const url = `${this.config.baseUrl}/api/dis/qa/readAnswer/${responseId}`;
    
    return fetch(url, {
        method: 'GET',
        headers: this.getHeaders(true)
    }).then(response => {
        console.log('Stream response status:', response.status);
        return response;
    });
}
}

// Export the API client
const apiClient = new NMoreAPI();