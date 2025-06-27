const messagesDiv = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const voiceButton = document.getElementById('voice-button');

let recognition;
let sessionMemory = [];

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
	const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
	recognition = new SpeechRecognition();
	recognition.continuous = false;
	recognition.lang = 'en-US';

	recognition.onresult = (event) => {
		const transcript = event.results[0][0].transcript;
		userInput.value = transcript;
		sendMessage(transcript);
	};
}

voiceButton.addEventListener('click', () => {
	if (recognition) {
		recognition.start();
	} else {
		alert('Speech recognition not supported in this browser.');
	}
});

sendButton.addEventListener('click', () => {
	const message = userInput.value.trim();
	if (message) {
		sendMessage(message);
		userInput.value = '';
	}
});

function sendMessage(message) {
	appendMessage('User', message);
	sessionMemory.push({ role: 'user', content: message });

	fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': ` YOUR_API_KEY`
		},
		body: JSON.stringify({
			model: 'gpt-4o',
			messages: sessionMemory
		})
	})
		.then(response => response.json())
		.then(data => {
			const reply = data.choices[0].message.content;
			appendMessage('Omni', reply);
			sessionMemory.push({ role: 'assistant', content: reply });
			speak(reply);
		})
		.catch(error => console.error('Error:', error));
}

function appendMessage(sender, message) {
	const messageDiv = document.createElement('div');
	messageDiv.className = sender.toLowerCase();
	messageDiv.textContent = `${sender}: ${message}`;
	messagesDiv.appendChild(messageDiv);
}

function speak(text) {
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.lang = 'en-US';
	window.speechSynthesis.speak(utterance);
}
