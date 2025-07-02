import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { config, isDevelopment } from './config/environment';
import { OpenAIProxy, StreamChunk } from './services/openaiProxy';
import { MemoryStore } from './services/memoryStore';
import { Message, createMessage, Platform } from './models/conversation';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new SocketServer(server, {
	cors: {
		origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000", "vscode://"],
		credentials: true
	}
});

// OpenAI setup
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder'
});

// Initialize services
const openaiProxy = new OpenAIProxy();
const memoryStore = new MemoryStore();

// Middleware
app.use(helmet({
	crossOriginEmbedderPolicy: false,
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			connectSrc: ["'self'", "ws:", "wss:"]
		}
	}
}));

app.use(cors({
	origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:3000", "vscode://"],
	credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
	next();
});

// ================== REST API ROUTES ==================

// Health check endpoint
app.get('/health', (req, res) => {
	const isOpenAIConfigured = process.env.OPENAI_API_KEY &&
		process.env.OPENAI_API_KEY !== 'sk-placeholder' &&
		!process.env.OPENAI_API_KEY.includes('placeholder');

	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		services: {
			openai: isOpenAIConfigured ? 'healthy' : 'not_configured',
			mongodb: 'memory_mode', // Will be 'healthy' when MongoDB is connected
			memory: 'active'
		},
		version: '1.0.0',
		environment: process.env.NODE_ENV || 'development'
	});
});

// Get active session
app.get('/api/sessions/:userId/:platform', (req, res) => {
	const { userId, platform } = req.params;
	const sessionKey = `${userId}_${platform}`;
	const session = sessions.get(sessionKey);

	if (session) {
		res.json(session);
	} else {
		res.status(404).json({ error: 'No active session found' });
	}
});

// Create new session
app.post('/api/sessions', (req, res) => {
	const { userId, platform, workspaceInfo } = req.body;
	const sessionId = uuidv4();
	const sessionKey = `${userId}_${platform}`;

	const session = {
		sessionId,
		userId,
		platform,
		workspaceInfo,
		messages: [],
		createdAt: new Date(),
		lastActivityAt: new Date(),
		isActive: true,
		emotionalState: 'neutral',
		metrics: {
			totalTokensUsed: 0,
			averageResponseTime: 0,
			actionsExecuted: 0
		}
	};

	sessions.set(sessionKey, session);
	console.log(`✨ Created session ${sessionId} for user ${userId} on ${platform}`);

	res.json(session);
});

// Update session
app.put('/api/sessions/:sessionId', (req, res) => {
	const { sessionId } = req.params;
	const updates = req.body;

	// Find session by ID
	let foundSession = null;
	let sessionKey = '';

	for (const [key, session] of sessions.entries()) {
		if (session.sessionId === sessionId) {
			foundSession = session;
			sessionKey = key;
			break;
		}
	}

	if (foundSession) {
		Object.assign(foundSession, updates, { lastActivityAt: new Date() });
		sessions.set(sessionKey, foundSession);
		res.json(foundSession);
	} else {
		res.status(404).json({ error: 'Session not found' });
	}
});

// Non-streaming chat endpoint
app.post('/api/chat', async (req, res) => {
	try {
		const { sessionId, message, isVoice } = req.body;

		// Find session
		let foundSession = null;
		let sessionKey = '';

		for (const [key, session] of sessions.entries()) {
			if (session.sessionId === sessionId) {
				foundSession = session;
				sessionKey = key;
				break;
			}
		}

		if (!foundSession) {
			return res.status(404).json({ error: 'Session not found' });
		}

		// Get user memories
		const memories = userMemories.get(foundSession.userId) || [];

		// Build context for OpenAI
		let contextPrompt = `You are Omni, a Digital Intelligence Entity - an autonomous software engineering assistant with persistent memory and cross-platform awareness.

CURRENT SESSION CONTEXT:
- Platform: ${foundSession.platform}
- User ID: ${foundSession.userId}
- Session: ${foundSession.sessionId}
`;

		if (foundSession.workspaceInfo) {
			contextPrompt += `
WORKSPACE CONTEXT:
- Project: ${foundSession.workspaceInfo.name}
- Type: ${foundSession.workspaceInfo.projectType}
- Languages: ${foundSession.workspaceInfo.languages?.join(', ')}
- Active Files: ${foundSession.workspaceInfo.activeFiles?.slice(0, 5).join(', ')}
`;
		}

		if (memories.length > 0) {
			contextPrompt += `
REMEMBERED CONTEXT:
${memories.slice(-5).map(m => `- ${m.content}`).join('\n')}
`;
		}

		contextPrompt += `
CAPABILITIES:
- Voice interaction (current input: ${isVoice ? 'voice' : 'text'})
- File operations and code generation
- Cross-platform session continuity
- Persistent learning and memory

Respond naturally and helpfully. Use code blocks for code examples. If you need to perform actions, describe them clearly.`;

		// Add user message to session
		const userMessage = {
			id: uuidv4(),
			role: 'user' as const,
			content: message,
			timestamp: new Date(),
			metadata: { isVoice, platform: foundSession.platform }
		};

		foundSession.messages.push(userMessage);

		// Call OpenAI (if properly configured)
		let aiResponse = '';
		let usage = null;

		if (process.env.OPENAI_API_KEY &&
			!process.env.OPENAI_API_KEY.includes('placeholder')) {
			try {
				const completion = await openai.chat.completions.create({
					model: 'gpt-4o',
					messages: [
						{ role: 'system', content: contextPrompt },
						...foundSession.messages.slice(-10).map(msg => ({
							role: msg.role,
							content: msg.content
						})),
						userMessage
					],
					temperature: 0.7,
					max_tokens: 2000
				});

				aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I encountered an issue generating a response.';
				usage = completion.usage;

			} catch (error) {
				console.error('OpenAI API error:', error);
				aiResponse = 'I apologize, but I encountered an issue with the AI service. Please check the OpenAI API configuration.';
			}
		} else {
			aiResponse = `Hello! I'm Omni, your Digital Intelligence Entity. I'm currently running in demo mode because the OpenAI API key needs to be configured.

To activate full AI capabilities:
1. Get an API key from https://platform.openai.com/api-keys
2. Set OPENAI_API_KEY in your .env file
3. Restart the backend server

Current session: ${foundSession.sessionId}
Platform: ${foundSession.platform}
${foundSession.workspaceInfo ? `Workspace: ${foundSession.workspaceInfo.name}` : 'No workspace detected'}

How can I help you today?`;
		}

		// Add assistant response to session
		const assistantMessage = {
			id: uuidv4(),
			role: 'assistant' as const,
			content: aiResponse,
			timestamp: new Date(),
			metadata: {
				tokens: usage?.total_tokens || 0,
				model: 'gpt-4o',
				platform: foundSession.platform
			}
		};

		foundSession.messages.push(assistantMessage);
		foundSession.lastActivityAt = new Date();

		if (usage) {
			foundSession.metrics.totalTokensUsed += usage.total_tokens;
		}

		// Store memorable information
		if (message.length > 20 && !message.toLowerCase().includes('hello')) {
			const userMemoryEntries = userMemories.get(foundSession.userId) || [];
			userMemoryEntries.push({
				type: 'conversation',
				content: `User asked: ${message.substring(0, 100)}...`,
				importance: 5,
				timestamp: new Date(),
				sessionId: foundSession.sessionId
			});

			// Keep only last 50 memories
			if (userMemoryEntries.length > 50) {
				userMemoryEntries.splice(0, userMemoryEntries.length - 50);
			}

			userMemories.set(foundSession.userId, userMemoryEntries);
		}

		// Update session
		sessions.set(sessionKey, foundSession);

		res.json({
			message: assistantMessage,
			usage,
			sessionId: foundSession.sessionId
		});

	} catch (error) {
		console.error('Chat endpoint error:', error);
		res.status(500).json({
			error: 'Internal server error',
			message: 'Failed to process chat message'
		});
	}
});

// Get storage statistics
app.get('/api/stats', (req, res) => {
	res.json({
		sessions: sessions.size,
		totalMemories: Array.from(userMemories.values()).reduce((sum, memories) => sum + memories.length, 0),
		users: userMemories.size,
		uptime: process.uptime()
	});
});

// ================== WEBSOCKET HANDLERS ==================

io.on('connection', (socket) => {
	console.log(`🔌 Client connected: ${socket.id}`);

	socket.on('join_session', ({ sessionId, userId }) => {
		socket.join(sessionId);
		console.log(`👤 User ${userId} joined session ${sessionId}`);
	});

	socket.on('chat_stream', async (data) => {
		const { sessionId, message, isVoice } = data;

		// Emit to all clients in the session
		io.to(sessionId).emit('user_message', {
			content: message,
			timestamp: new Date(),
			isVoice
		});

		// Process message and stream response
		try {
			// Here you would implement streaming response
			// For now, just emit a simple response
			io.to(sessionId).emit('assistant_chunk', {
				content: 'Processing your request...',
				isComplete: false
			});

			setTimeout(() => {
				io.to(sessionId).emit('assistant_chunk', {
					content: 'Response completed!',
					isComplete: true
				});
			}, 1000);

		} catch (error) {
			console.error('Stream processing error:', error);
			io.to(sessionId).emit('assistant_chunk', {
				content: 'Error processing request',
				isComplete: true,
				error: true
			});
		}
	});

	socket.on('disconnect', () => {
		console.log(`❌ Client disconnected: ${socket.id}`);
	});
});

// ================== SERVER STARTUP ==================

async function startServer() {
	try {
		// Connect to MongoDB
		await memoryStore.connect();

		// Test OpenAI connection
		const openaiConnected = await openaiProxy.testConnection();
		if (!openaiConnected) {
			console.warn('⚠️  OpenAI connection test failed - check API key');
		} else {
			console.log('✅ OpenAI connection verified');
		}

		// Start server
		server.listen(config.port, config.host, () => {
			console.log(`
🚀 Digital Intelligence Backend running!
🌐 Server: http://${config.host}:${config.port}
🔗 Health: http://${config.host}:${config.port}/health
📊 Stats: http://${config.host}:${config.port}/api/stats
🎯 Environment: ${config.nodeEnv}
🤖 AI Model: ${config.openaiModel}
      `);
		});

		// Graceful shutdown
		process.on('SIGTERM', async () => {
			console.log('🔄 Shutting down gracefully...');

			server.close(() => {
				console.log('📴 HTTP server closed');
			});

			await memoryStore.disconnect();
			process.exit(0);
		});

		process.on('SIGINT', async () => {
			console.log('🔄 Shutting down gracefully...');

			server.close(() => {
				console.log('📴 HTTP server closed');
			});

			await memoryStore.disconnect();
			process.exit(0);
		});

	} catch (error) {
		console.error('❌ Failed to start server:', error);
		process.exit(1);
	}
}

// Start the server
startServer();

export default app;
