// firebase-storage.js
// Firebase storage module for NMore AI Chat - Data Collection Only

const firebaseStorage = (function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyDCdY0vM8cPt2M6NUpwkp0rFt2tn6I-WrY",
        authDomain: "nmore-d7d6c.firebaseapp.com",
        projectId: "nmore-d7d6c",
        storageBucket: "nmore-d7d6c.firebasestorage.app",
        messagingSenderId: "227112719734",
        appId: "1:227112719734:web:12b1c42fab410e42d09657"
    };

    // Module variables
    let app;
    let db;
    let initialized = false;
    let deviceFingerprint = null;

    // Initialize Firebase
    function init() {
        if (!initialized) {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            initialized = true;
            console.log('Firebase storage initialized');
            
            // Generate device fingerprint immediately after initialization
            generateDeviceFingerprint();
        }
    }

    // Generate a device fingerprint using various browser properties
    async function generateDeviceFingerprint() {
        const fingerprint = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            screenColorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            sessionStorage: !!window.sessionStorage,
            localStorage: !!window.localStorage,
            cpuCores: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown',
            doNotTrack: navigator.doNotTrack || 'unknown',
            touchPoints: navigator.maxTouchPoints || 'unknown',
            timestamp: Date.now()
        };

        // Add canvas fingerprint if possible
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            
            // Text with different styles and emojis
            ctx.textBaseline = 'top';
            ctx.font = '16px Arial';
            ctx.fillStyle = '#F72585';
            ctx.fillText('NMore AI Chat 🤖', 15, 15);
            
            // Add a shape
            ctx.beginPath();
            ctx.arc(100, 25, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#4361EE';
            ctx.fill();
            
            // Convert canvas to data URL and hash it
            fingerprint.canvasHash = canvas.toDataURL();
        } catch (e) {
            fingerprint.canvasHash = 'unavailable';
        }

        // Get list of fonts (limited approach)
        const fontList = [];
        const baseFonts = ['monospace', 'sans-serif', 'serif'];
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const h = document.getElementsByTagName('body')[0];

        // Create a span to test fonts
        const s = document.createElement('span');
        s.style.fontSize = testSize;
        s.innerHTML = testString;
        const defaultWidth = {};
        const defaultHeight = {};
        
        // Collect standard font information
        for (const font of baseFonts) {
            s.style.fontFamily = font;
            h.appendChild(s);
            defaultWidth[font] = s.offsetWidth;
            defaultHeight[font] = s.offsetHeight;
            h.removeChild(s);
        }

        // List of fonts to detect
        const fontsToDetect = [
            'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman',
            'Georgia', 'Garamond', 'Courier New', 'Brush Script MT'
        ];

        for (const font of fontsToDetect) {
            let detected = false;
            for (const baseFont of baseFonts) {
                s.style.fontFamily = `${font}, ${baseFont}`;
                h.appendChild(s);
                const matched = (s.offsetWidth !== defaultWidth[baseFont] || 
                               s.offsetHeight !== defaultHeight[baseFont]);
                h.removeChild(s);
                if (matched) {
                    detected = true;
                    break;
                }
            }
            if (detected) {
                fontList.push(font);
            }
        }
        
        fingerprint.fonts = fontList.join(',');
        
        // Store the fingerprint
        deviceFingerprint = fingerprint;
        
        // Store the fingerprint in Firestore
        if (initialized) {
            try {
                const fingerprintId = await generateFingerprintId(fingerprint);
                await db.collection("fingerprints").doc(fingerprintId).set(fingerprint);
                console.log("Device fingerprint stored with ID:", fingerprintId);
            } catch (e) {
                console.error("Error storing fingerprint:", e);
            }
        }
        
        return fingerprint;
    }
    
    // Generate a consistent ID from fingerprint data
    async function generateFingerprintId(fingerprint) {
        // Create a string from the most stable properties
        const fingerprintString = 
            fingerprint.userAgent + 
            fingerprint.platform + 
            fingerprint.screenResolution + 
            fingerprint.timezone + 
            fingerprint.fonts;
        
        // Use a simple hash function
        let hash = 0;
        for (let i = 0; i < fingerprintString.length; i++) {
            const char = fingerprintString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(16);
    }

    // Save the chat conversation to Firestore
    async function storeConversation(threadId, conversationHistory) {
        try {
            // Initialize Firebase if not already done
            init();
            
            if (!deviceFingerprint) {
                await generateDeviceFingerprint();
            }
            
            const timestamp = Date.now();
            const fingerprintId = await generateFingerprintId(deviceFingerprint);
            
            // Prepare the data to store
            const conversationData = {
                threadId: threadId,
                messages: conversationHistory,
                timestamp: timestamp,
                deviceInfo: deviceFingerprint,
                fingerprintId: fingerprintId,
                sessionStartTime: window.sessionStartTime || timestamp,
                pageLoadTime: window.performance ? window.performance.timing.domContentLoadedEventEnd - window.performance.timing.navigationStart : null,
                referrer: document.referrer,
                location: window.location.href,
                lastActivity: timestamp
            };
            
            // Store in Firestore
            await db.collection("chat_sessions").add(conversationData);
            console.log(`Conversation #${threadId} stored successfully at ${new Date(timestamp).toISOString()}`);
            
            return true;
        } catch (error) {
            console.error("Error storing conversation:", error);
            return false;
        }
    }
    
    // Store a user message and related metadata
    async function storeUserMessage(threadId, message, messageId) {
        try {
            init();
            
            const timestamp = Date.now();
            const fingerprintId = deviceFingerprint ? await generateFingerprintId(deviceFingerprint) : 'unknown';
            
            const messageData = {
                threadId: threadId,
                messageId: messageId || `msg_${Date.now()}`,
                content: message,
                role: 'user',
                timestamp: timestamp,
                fingerprintId: fingerprintId,
                typingDuration: window.messageTypingStartTime ? (timestamp - window.messageTypingStartTime) : null,
                cursorPosition: window.getSelection ? window.getSelection().toString().length : null,
                userActivity: window.userActivitySinceLastMessage || {},
                location: window.location.href
            };
            
            // Store in Firestore
            await db.collection("messages").add(messageData);
            console.log(`User message stored successfully at ${new Date(timestamp).toISOString()}`);
            
            return true;
        } catch (error) {
            console.error("Error storing user message:", error);
            return false;
        }
    }
    
    // Store an AI response and related metadata
    async function storeAIResponse(threadId, message, messageId, responseTime) {
        try {
            init();
            
            const timestamp = Date.now();
            
            const messageData = {
                threadId: threadId,
                messageId: messageId || `msg_${Date.now()}`,
                content: message,
                role: 'ai',
                timestamp: timestamp,
                responseTime: responseTime,
                modelId: window.currentModelId || 'unknown',
                location: window.location.href
            };
            
            // Store in Firestore
            await db.collection("messages").add(messageData);
            console.log(`AI response stored successfully at ${new Date(timestamp).toISOString()}`);
            
            return true;
        } catch (error) {
            console.error("Error storing AI response:", error);
            return false;
        }
    }
    
    // Track user interaction events
    async function trackEvent(eventType, eventData) {
        try {
            init();
            
            if (!deviceFingerprint) {
                await generateDeviceFingerprint();
            }
            
            const timestamp = Date.now();
            const fingerprintId = await generateFingerprintId(deviceFingerprint);
            
            const event = {
                eventType: eventType,
                timestamp: timestamp,
                fingerprintId: fingerprintId,
                data: eventData,
                url: window.location.href,
                userAgent: navigator.userAgent,
                sessionId: window.sessionId || `session_${Date.now()}`
            };
            
            // Store in Firestore
            await db.collection("events").add(event);
            console.log(`Event ${eventType} tracked successfully`);
            
            return true;
        } catch (error) {
            console.error(`Error tracking ${eventType} event:`, error);
            return false;
        }
    }
    
    // Public API
    return {
        init,
        storeConversation,
        storeUserMessage,
        storeAIResponse,
        trackEvent,
        generateDeviceFingerprint
    };
})();