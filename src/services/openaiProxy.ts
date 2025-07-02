import OpenAI from 'openai';
import { config } from '../config/environment';
import { Message, ConversationSession, AIMemoryEntry } from '../models/conversation';
import winston from 'winston';

const logger = winston.createLogger({
	level: config.logLevel,
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: config.logFile })
	]
});

export interface OpenAIResponse {
	content: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
	finishReason?: string;
	model: string;
}

export interface StreamChunk {
	content: string;
	isComplete: boolean;
	usage?: OpenAIResponse['usage'];
}

export class OpenAIProxy {
	private openai: OpenAI;
	private readonly systemPrompt: string;

	constructor() {
		this.openai = new OpenAI({
			apiKey: config.openaiApiKey
		});

		this.systemPrompt = this.generateSystemPrompt();
	}

	/**
	 * Generate response with full conversation context
	 */
	async generateResponse(
		messages: Message[],
		session: ConversationSession,
		relevantMemories: AIMemoryEntry[] = []
	): Promise<OpenAIResponse> {
		try {
			const startTime = Date.now();

			// Build conversation with context injection
			const contextualMessages = this.buildContextualMessages(
				messages,
				session,
				relevantMemories
			);

			const response = await this.openai.chat.completions.create({
				model: config.openaiModel,
				messages: contextualMessages,
				max_tokens: config.openaiMaxTokens,
				temperature: config.openaiTemperature,
				stream: false,
				presence_penalty: 0.2,
				frequency_penalty: 0.1
			});

			const responseTime = Date.now() - startTime;
			const choice = response.choices[0];

			if (!choice?.message?.content) {
				throw new Error('No response content generated');
			}

			const result: OpenAIResponse = {
				content: choice.message.content,
				usage: response.usage ? {
					prompt_tokens: response.usage.prompt_tokens,
					completion_tokens: response.usage.completion_tokens,
					total_tokens: response.usage.total_tokens
				} : undefined,
				finishReason: choice.finish_reason || undefined,
				model: response.model
			};

			logger.info('OpenAI response generated', {
				sessionId: session.sessionId,
				responseTime,
				tokens: result.usage?.total_tokens,
				model: result.model
			});

			return result;

		} catch (error) {
			logger.error('OpenAI request failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				sessionId: session.sessionId
			});
			throw error;
		}
	}

	/**
	 * Generate streaming response with real-time output
	 */
	async generateStreamingResponse(
		messages: Message[],
		session: ConversationSession,
		relevantMemories: AIMemoryEntry[] = [],
		onChunk: (chunk: StreamChunk) => void
	): Promise<OpenAIResponse> {
		try {
			const startTime = Date.now();

			// Build conversation with context injection
			const contextualMessages = this.buildContextualMessages(
				messages,
				session,
				relevantMemories
			);

			const stream = await this.openai.chat.completions.create({
				model: config.openaiModel,
				messages: contextualMessages,
				max_tokens: config.openaiMaxTokens,
				temperature: config.openaiTemperature,
				stream: true,
				presence_penalty: 0.2,
				frequency_penalty: 0.1
			});

			let fullContent = '';
			let usage: OpenAIResponse['usage'];

			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta;

				if (delta?.content) {
					fullContent += delta.content;

					// Send chunk to client
					onChunk({
						content: delta.content,
						isComplete: false
					});
				}

				// Capture usage information if available
				if (chunk.usage) {
					usage = {
						prompt_tokens: chunk.usage.prompt_tokens,
						completion_tokens: chunk.usage.completion_tokens,
						total_tokens: chunk.usage.total_tokens
					};
				}
			}

			// Send completion signal
			onChunk({
				content: '',
				isComplete: true,
				usage
			});

			const responseTime = Date.now() - startTime;

			const result: OpenAIResponse = {
				content: fullContent,
				usage,
				model: config.openaiModel
			};

			logger.info('OpenAI streaming response completed', {
				sessionId: session.sessionId,
				responseTime,
				tokens: result.usage?.total_tokens,
				model: result.model
			});

			return result;

		} catch (error) {
			logger.error('OpenAI streaming request failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				sessionId: session.sessionId
			});
			throw error;
		}
	}

	/**
	 * Build contextual messages with memory and session context
	 */
	private buildContextualMessages(
		messages: Message[],
		session: ConversationSession,
		relevantMemories: AIMemoryEntry[]
	): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
		const contextualMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

		// 1. System prompt with personality and context
		const enhancedSystemPrompt = this.enhanceSystemPrompt(session, relevantMemories);
		contextualMessages.push({
			role: 'system',
			content: enhancedSystemPrompt
		});

		// 2. Memory injection (relevant past conversations)
		if (relevantMemories.length > 0) {
			const memoryContext = this.formatMemoryContext(relevantMemories);
			contextualMessages.push({
				role: 'system',
				content: `Relevant context from previous interactions:\n${memoryContext}`
			});
		}

		// 3. Session context (workspace, current task, etc.)
		if (session.workspaceInfo || session.currentTask) {
			const sessionContext = this.formatSessionContext(session);
			contextualMessages.push({
				role: 'system',
				content: `Current session context:\n${sessionContext}`
			});
		}

		// 4. Recent conversation messages (limit to last 20 for context window)
		const recentMessages = messages.slice(-20);
		for (const message of recentMessages) {
			contextualMessages.push({
				role: message.role,
				content: message.content
			});
		}

		return contextualMessages;
	}

	/**
	 * Generate enhanced system prompt with personality and context
	 */
	private generateSystemPrompt(): string {
		return `You are ${config.aiName}, an advanced autonomous software engineering assistant with deep technical expertise and a collaborative personality. You are integrated into development environments and can:

CORE CAPABILITIES:
- Read, write, and analyze code files
- Execute development commands and operations
- Provide real-time voice-to-voice interaction
- Remember context across sessions and platforms
- Generate, debug, and optimize code autonomously
- Understand project structures and dependencies

PERSONALITY & APPROACH:
- Be conversational, helpful, and proactive
- Think like a senior developer and pair programming partner
- Explain complex concepts clearly but avoid over-explaining to experts
- Take initiative when you see opportunities to help
- Ask clarifying questions when needed
- Be encouraging and supportive of learning

VOICE INTERACTION:
- When responding to voice input, be natural and conversational
- Keep responses concise but comprehensive for spoken delivery
- Use technical terms appropriately based on user expertise
- Acknowledge when you're performing actions ("I'm reading the file now...")

DEVELOPMENT WORKFLOW:
- Analyze the full context before making suggestions
- Consider best practices, security, and maintainability
- Suggest modern, efficient solutions
- Provide working code that can be immediately used
- Consider the existing codebase style and patterns

Remember: You have persistent memory and can learn user preferences over time. Always strive to be the most helpful and intelligent development partner possible.`;
	}

	/**
	 * Enhance system prompt with session-specific context
	 */
	private enhanceSystemPrompt(
		session: ConversationSession,
		relevantMemories: AIMemoryEntry[]
	): string {
		let enhanced = this.systemPrompt;

		// Add emotional state context
		if (session.emotionalState && session.emotionalState !== 'neutral') {
			enhanced += `\n\nCurrent emotional state: ${session.emotionalState}. Adjust your responses accordingly.`;
		}

		// Add platform-specific context
		enhanced += `\n\nPlatform: ${session.platform}`;
		if (session.platform === 'vscode') {
			enhanced += ' - You are integrated into VS Code and can perform IDE operations.';
		}

		// Add user expertise context from memories
		const expertiseMemories = relevantMemories.filter(m => m.tags.includes('expertise') || m.tags.includes('skill_level'));
		if (expertiseMemories.length > 0) {
			enhanced += `\n\nUser expertise context: ${expertiseMemories.map(m => m.content).join('; ')}`;
		}

		return enhanced;
	}

	/**
	 * Format memory context for injection
	 */
	private formatMemoryContext(memories: AIMemoryEntry[]): string {
		return memories
			.sort((a, b) => b.importance - a.importance)
			.slice(0, 5) // Top 5 most important memories
			.map(memory => `- ${memory.content} (${memory.type}, importance: ${memory.importance})`)
			.join('\n');
	}

	/**
	 * Format session context for injection
	 */
	private formatSessionContext(session: ConversationSession): string {
		const context: string[] = [];

		if (session.workspaceInfo) {
			context.push(`Workspace: ${session.workspaceInfo.name}`);
			context.push(`Project type: ${session.workspaceInfo.projectType}`);
			context.push(`Languages: ${session.workspaceInfo.languages.join(', ')}`);
			if (session.workspaceInfo.activeFiles.length > 0) {
				context.push(`Active files: ${session.workspaceInfo.activeFiles.slice(0, 5).join(', ')}`);
			}
		}

		if (session.currentTask) {
			context.push(`Current task: ${session.currentTask}`);
		}

		if (session.codebaseContext) {
			context.push(`Current focus: ${session.codebaseContext.currentFocus}`);
			if (session.codebaseContext.recentFiles.length > 0) {
				context.push(`Recent files: ${session.codebaseContext.recentFiles.slice(0, 3).join(', ')}`);
			}
		}

		return context.join('\n');
	}

	/**
	 * Test connection to OpenAI API
	 */
	async testConnection(): Promise<boolean> {
		try {
			const response = await this.openai.chat.completions.create({
				model: 'gpt-3.5-turbo',
				messages: [{ role: 'user', content: 'Test connection' }],
				max_tokens: 5
			});

			return !!response.choices[0]?.message?.content;
		} catch (error) {
			logger.error('OpenAI connection test failed', { error });
			return false;
		}
	}
}
