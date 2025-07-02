/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import OpenAI from 'openai';

export interface ChatMessage {
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp?: number;
}

export interface ChatResponse {
	content: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export class OpenAIService {
	private _openai: OpenAI | null = null;
	private _isInitialized = false;

	constructor() {
		this._initializeOpenAI();
	}

	private _initializeOpenAI() {
		const config = vscode.workspace.getConfiguration('autonomousdev');
		const apiKey = config.get<string>('openaiApiKey');

		if (apiKey && apiKey.trim()) {
			this._openai = new OpenAI({
				apiKey: apiKey.trim()
			});
			this._isInitialized = true;
		} else {
			this._isInitialized = false;
			console.warn('OpenAI API key not configured');
		}
	}

	public async generateResponse(
		messages: ChatMessage[],
		systemPrompt?: string
	): Promise<ChatResponse> {
		if (!this._isInitialized || !this._openai) {
			throw new Error('OpenAI service not initialized. Please configure your API key in settings.');
		}

		const config = vscode.workspace.getConfiguration('autonomousdev');
		const model = config.get<string>('model', 'gpt-4o');
		const maxTokens = config.get<number>('maxTokens', 4096);
		const temperature = config.get<number>('temperature', 0.7);

		const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

		// Add system prompt if provided
		if (systemPrompt) {
			openaiMessages.push({
				role: 'system',
				content: systemPrompt
			});
		}

		// Add conversation messages
		messages.forEach(msg => {
			openaiMessages.push({
				role: msg.role,
				content: msg.content
			});
		});

		try {
			const completion = await this._openai.chat.completions.create({
				model,
				messages: openaiMessages,
				max_tokens: maxTokens,
				temperature,
				stream: false
			});

			const choice = completion.choices[0];
			if (!choice?.message?.content) {
				throw new Error('No response generated');
			}

			return {
				content: choice.message.content,
				usage: completion.usage ? {
					prompt_tokens: completion.usage.prompt_tokens,
					completion_tokens: completion.usage.completion_tokens,
					total_tokens: completion.usage.total_tokens
				} : undefined
			};

		} catch (error) {
			console.error('OpenAI API error:', error);
			throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public async generateStreamResponse(
		messages: ChatMessage[],
		systemPrompt?: string,
		onChunk?: (chunk: string) => void
	): Promise<ChatResponse> {
		if (!this._isInitialized || !this._openai) {
			throw new Error('OpenAI service not initialized. Please configure your API key in settings.');
		}

		const config = vscode.workspace.getConfiguration('autonomousdev');
		const model = config.get<string>('model', 'gpt-4o');
		const maxTokens = config.get<number>('maxTokens', 4096);
		const temperature = config.get<number>('temperature', 0.7);

		const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

		if (systemPrompt) {
			openaiMessages.push({
				role: 'system',
				content: systemPrompt
			});
		}

		messages.forEach(msg => {
			openaiMessages.push({
				role: msg.role,
				content: msg.content
			});
		});

		try {
			const stream = await this._openai.chat.completions.create({
				model,
				messages: openaiMessages,
				max_tokens: maxTokens,
				temperature,
				stream: true
			});

			let fullContent = '';
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || '';
				if (content) {
					fullContent += content;
					onChunk?.(content);
				}
			}

			return {
				content: fullContent
			};

		} catch (error) {
			console.error('OpenAI streaming error:', error);
			throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	public refreshConfiguration() {
		this._initializeOpenAI();
	}

	public isConfigured(): boolean {
		return this._isInitialized;
	}

	public getSystemPrompt(): string {
		return `You are an autonomous software engineering assistant integrated into VS Code. You have the ability to:

1. **Read and analyze code files** in the current workspace
2. **Write and modify files** to implement solutions
3. **Execute VS Code commands** to perform IDE operations
4. **Understand project structure** and dependencies
5. **Provide voice-to-voice interaction** with natural conversation

Your capabilities include:
- Code generation, debugging, and optimization
- File system operations (read, write, create, delete)
- Project analysis and refactoring
- Documentation generation
- Testing assistance
- Architectural guidance

Always be helpful, precise, and autonomous. When asked to implement something, provide working code and actually create/modify the files. Be conversational and engaging in your responses, as if you're a pair programming partner.

Current context: VS Code workspace with active development session.`;
	}
}
