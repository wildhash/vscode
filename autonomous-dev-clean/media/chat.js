/*---------------------------------------------------------------------------------------------
 *  Voice-to-Voice Chat Interface for VS Code Extension
 *  Handles speech recognition, synthesis, and chat interactions
 *--------------------------------------------------------------------------------------------*/

class VoiceChatInterface {
	constructor() {
		this.vscode = acquireVsCodeApi();
		this.isListening = false;
		this.isSpeaking = false;
		this.recognition = null;
		this.synthesis = window.speechSynthesis;
		this.currentUtterance = null;
		this.messageHistory = [];

		// Configuration from VS Code settings
		this.config = window.chatConfig || {
			voiceEnabled: true,
			autoSpeak: true,
			voiceSpeed: 1.0,
			voicePitch: 1.0
		};

		this.initializeElements();
		this.initializeSpeechRecognition();
		this.setupEventListeners();
		this.setupMessageHandler();
	}

	initializeElements() {
		this.messagesContainer = document.getElementById('messages');
		this.userInput = document.getElementById('user-input');
		this.voiceButton = document.getElementById('voice-button');
		this.sendButton = document.getElementById('send-button');
		this.voiceStatus = document.getElementById('voice-status');

		// Auto-resize textarea
		this.userInput.addEventListener('input', () => {
			this.userInput.style.height = 'auto';
			this.userInput.style.height = this.userInput.scrollHeight + 'px';
		});
	}

	initializeSpeechRecognition() {
		if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
			console.warn('Speech recognition not supported');
			this.voiceButton.disabled = true;
			this.voiceButton.title = 'Speech recognition not supported in this browser';
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		this.recognition = new SpeechRecognition();

		this.recognition.continuous = true;
		this.recognition.interimResults = true;
		this.recognition.lang = 'en-US';

		this.recognition.onstart = () => {
			this.isListening = true;
			this.updateVoiceUI();
		};

		this.recognition.onresult = (event) => {
			let finalTranscript = '';
			let interimTranscript = '';

			for (let i = event.resultIndex; i < event.results.length; i++) {
				const transcript = event.results[i][0].transcript;
				if (event.results[i].isFinal) {
					finalTranscript += transcript;
				} else {
					interimTranscript += transcript;
				}
			}

			// Update input with interim results
			if (interimTranscript) {
				this.userInput.value = finalTranscript + interimTranscript;
			}

			// Send final transcript
			if (finalTranscript.trim()) {
				this.userInput.value = finalTranscript.trim();
				this.sendMessage(true); // isVoice = true
			}
		};

		this.recognition.onerror = (event) => {
			console.error('Speech recognition error:', event.error);
			this.stopListening();
			this.vscode.postMessage({
				type: 'voiceError',
				error: event.error
			});
		};

		this.recognition.onend = () => {
			this.stopListening();
		};
	}

	setupEventListeners() {
		// Voice button
		this.voiceButton.addEventListener('click', () => {
			if (this.isListening) {
				this.stopListening();
			} else {
				this.startListening();
			}
		});

		// Send button
		this.sendButton.addEventListener('click', () => {
			this.sendMessage();
		});

		// Enter key to send (Shift+Enter for new line)
		this.userInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		});

		// Stop speaking when user starts typing
		this.userInput.addEventListener('input', () => {
			if (this.isSpeaking) {
				this.stopSpeaking();
			}
		});

		// Global keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			// Ctrl/Cmd + M to toggle voice
			if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
				e.preventDefault();
				this.voiceButton.click();
			}

			// Escape to stop speaking or listening
			if (e.key === 'Escape') {
				if (this.isListening) {
					this.stopListening();
				}
				if (this.isSpeaking) {
					this.stopSpeaking();
				}
			}
		});
	}

	setupMessageHandler() {
		window.addEventListener('message', (event) => {
			const message = event.data;

			switch (message.type) {
				case 'assistantMessage':
					this.addMessage('assistant', message.content, message.thinking);
					if (this.config.autoSpeak && !message.thinking && !message.error) {
						this.speakText(message.content);
					}
					break;

				case 'assistantThinking':
					if (message.thinking) {
						this.showThinking();
					} else {
						this.hideThinking();
					}
					break;

				case 'loadSession':
					this.loadSession(message.session);
					break;

				case 'clearChat':
					this.clearChat();
					break;

				case 'toggleVoice':
					this.config.voiceEnabled = message.enabled;
					this.updateVoiceUI();
					break;
			}
		});
	}

	startListening() {
		if (!this.recognition || !this.config.voiceEnabled) {
			return;
		}

		try {
			this.stopSpeaking(); // Stop any current speech
			this.recognition.start();
			this.userInput.value = '';
			this.userInput.placeholder = 'Listening...';
		} catch (error) {
			console.error('Failed to start listening:', error);
		}
	}

	stopListening() {
		if (this.recognition && this.isListening) {
			this.recognition.stop();
		}
		this.isListening = false;
		this.userInput.placeholder = 'Ask me anything about your code...';
		this.updateVoiceUI();
	}

	speakText(text) {
		if (!this.synthesis || !this.config.autoSpeak) {
			return;
		}

		// Stop any current speech
		this.stopSpeaking();

		// Clean text for speech (remove markdown, code blocks, etc.)
		const cleanText = this.cleanTextForSpeech(text);

		if (!cleanText.trim()) {
			return;
		}

		this.currentUtterance = new SpeechSynthesisUtterance(cleanText);
		this.currentUtterance.rate = this.config.voiceSpeed;
		this.currentUtterance.pitch = this.config.voicePitch;

		this.currentUtterance.onstart = () => {
			this.isSpeaking = true;
			this.updateVoiceUI();
		};

		this.currentUtterance.onend = () => {
			this.isSpeaking = false;
			this.updateVoiceUI();
		};

		this.currentUtterance.onerror = (event) => {
			console.error('Speech synthesis error:', event);
			this.isSpeaking = false;
			this.updateVoiceUI();
		};

		this.synthesis.speak(this.currentUtterance);
	}

	stopSpeaking() {
		if (this.synthesis && this.isSpeaking) {
			this.synthesis.cancel();
			this.isSpeaking = false;
			this.updateVoiceUI();
		}
	}

	cleanTextForSpeech(text) {
		return text
			// Remove code blocks
			.replace(/```[\s\S]*?```/g, '[code block]')
			// Remove inline code
			.replace(/`[^`]+`/g, '[code]')
			// Remove markdown formatting
			.replace(/\*\*(.*?)\*\*/g, '$1')
			.replace(/\*(.*?)\*/g, '$1')
			.replace(/\[(.*?)\]\(.*?\)/g, '$1')
			// Remove excessive whitespace
			.replace(/\s+/g, ' ')
			.trim();
	}

	updateVoiceUI() {
		if (this.isListening) {
			this.voiceButton.classList.add('listening');
			this.voiceStatus.classList.remove('hidden');
			this.voiceStatus.querySelector('.status-text').textContent = 'Listening...';
		} else if (this.isSpeaking) {
			this.voiceButton.classList.remove('listening');
			this.voiceButton.classList.add('speaking');
			this.voiceStatus.classList.remove('hidden');
			this.voiceStatus.querySelector('.status-text').textContent = 'Speaking...';
		} else {
			this.voiceButton.classList.remove('listening', 'speaking');
			this.voiceStatus.classList.add('hidden');
		}

		this.voiceButton.classList.toggle('enabled', this.config.voiceEnabled);
		this.voiceButton.classList.toggle('disabled', !this.config.voiceEnabled);
	}

	sendMessage(isVoice = false) {
		const content = this.userInput.value.trim();
		if (!content) return;

		// Add user message to UI
		this.addMessage('user', content);

		// Send to extension
		this.vscode.postMessage({
			type: 'userMessage',
			content,
			isVoice
		});

		// Clear input
		this.userInput.value = '';
		this.userInput.style.height = 'auto';
		this.userInput.focus();
	}

	addMessage(role, content, thinking = false) {
		const messageDiv = document.createElement('div');
		messageDiv.className = `message ${role}-message`;

		if (thinking) {
			messageDiv.innerHTML = `
				<div class="message-content thinking">
					<div class="thinking-dots">
						<span></span><span></span><span></span>
					</div>
					<span>Thinking...</span>
				</div>
			`;
		} else {
			messageDiv.innerHTML = `
				<div class="message-content">
					${this.formatMessage(content)}
				</div>
				<div class="message-time">
					${new Date().toLocaleTimeString()}
				</div>
			`;
		}

		this.messagesContainer.appendChild(messageDiv);
		this.scrollToBottom();

		// Store in history
		if (!thinking) {
			this.messageHistory.push({ role, content, timestamp: Date.now() });
			this.saveSession();
		}
	}

	formatMessage(content) {
		// Basic markdown rendering
		return content
			// Code blocks
			.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
			// Inline code
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			// Bold
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			// Italic
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			// Links
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
			// Line breaks
			.replace(/\n/g, '<br>');
	}

	showThinking() {
		const existingThinking = this.messagesContainer.querySelector('.thinking');
		if (!existingThinking) {
			this.addMessage('assistant', '', true);
		}
	}

	hideThinking() {
		const thinkingMessage = this.messagesContainer.querySelector('.thinking');
		if (thinkingMessage) {
			thinkingMessage.closest('.message').remove();
		}
	}

	loadSession(session) {
		this.clearChat();
		this.messageHistory = session.messages || [];

		session.messages?.forEach(message => {
			this.addMessage(message.role, message.content);
		});
	}

	clearChat() {
		this.messagesContainer.innerHTML = '';
		this.messageHistory = [];
	}

	saveSession() {
		this.vscode.postMessage({
			type: 'saveSession',
			session: {
				messages: this.messageHistory
			}
		});
	}

	scrollToBottom() {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	new VoiceChatInterface();
});

// Handle hot reload during development
if (module && module.hot) {
	module.hot.accept();
}
