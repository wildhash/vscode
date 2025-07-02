/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OpenAIService, ChatMessage } from './openaiService';
import { FileSystemService } from './fileSystemService';

export interface IntentAction {
	type: 'file_read' | 'file_write' | 'file_create' | 'code_generate' | 'explain' | 'debug' | 'refactor' | 'command';
	parameters?: any;
	description?: string;
}

export interface IntentResponse {
	content: string;
	actions?: IntentAction[];
	confidence?: number;
}

export class IntentRouter {
	private _conversationHistory: ChatMessage[] = [];

	constructor(
		private readonly _fileSystemService: FileSystemService,
		private readonly _openaiService: OpenAIService
	) { }

	public async processMessage(userMessage: string): Promise<IntentResponse> {
		// Add user message to conversation history
		this._conversationHistory.push({
			role: 'user',
			content: userMessage,
			timestamp: Date.now()
		});

		// Keep conversation history manageable (last 20 messages)
		if (this._conversationHistory.length > 20) {
			this._conversationHistory = this._conversationHistory.slice(-20);
		}

		// Analyze intent and generate response
		const intent = await this._analyzeIntent(userMessage);
		const response = await this._generateResponse(userMessage, intent);

		// Add assistant response to conversation history
		this._conversationHistory.push({
			role: 'assistant',
			content: response.content,
			timestamp: Date.now()
		});

		return response;
	}

	private async _analyzeIntent(message: string): Promise<string> {
		const intentPrompt = `Analyze the user's message and determine their intent. Classify it as one of:

1. **file_operation** - Reading, writing, creating, or modifying files
2. **code_generation** - Writing new code or functions
3. **code_explanation** - Explaining existing code
4. **debugging** - Finding and fixing bugs
5. **refactoring** - Improving code structure
6. **project_analysis** - Understanding project structure
7. **general_question** - General programming questions
8. **command_execution** - VS Code commands or actions

User message: "${message}"

Respond with just the intent category.`;

		try {
			const response = await this._openaiService.generateResponse(
				[{ role: 'user', content: intentPrompt }],
				'You are an intent classifier for a software development assistant.'
			);
			return response.content.toLowerCase().trim();
		} catch (error) {
			console.warn('Intent analysis failed, defaulting to general_question:', error);
			return 'general_question';
		}
	}

	private async _generateResponse(userMessage: string, intent: string): Promise<IntentResponse> {
		let systemPrompt = this._openaiService.getSystemPrompt();
		let contextualInfo = '';

		// Add contextual information based on intent
		try {
			switch (intent) {
				case 'file_operation':
				case 'project_analysis':
					const workspaceInfo = await this._fileSystemService.getWorkspaceInfo();
					contextualInfo += `\n\nCurrent workspace: ${workspaceInfo.name}`;
					contextualInfo += `\nOpen files: ${workspaceInfo.openFiles.join(', ')}`;
					if (workspaceInfo.activeFile) {
						contextualInfo += `\nActive file: ${workspaceInfo.activeFile}`;
					}
					break;

				case 'code_explanation':
				case 'debugging':
				case 'refactoring':
					const activeFile = await this._fileSystemService.getActiveFilePath();
					if (activeFile) {
						const content = await this._fileSystemService.getActiveFileContent();
						contextualInfo += `\n\nActive file: ${activeFile}`;
						if (content && content.length < 5000) {
							contextualInfo += `\nFile content:\n\`\`\`\n${content}\n\`\`\``;
						} else if (content) {
							contextualInfo += `\nFile content (truncated):\n\`\`\`\n${content.substring(0, 2000)}...\n\`\`\``;
						}
					}
					break;
			}
		} catch (error) {
			console.warn('Failed to gather contextual information:', error);
		}

		if (contextualInfo) {
			systemPrompt += contextualInfo;
		}

		// Generate response using conversation history
		const response = await this._openaiService.generateResponse(
			this._conversationHistory,
			systemPrompt
		);

		// Parse potential actions from the response
		const actions = this._extractActions(response.content, intent);

		return {
			content: response.content,
			actions,
			confidence: 0.8 // Could be improved with more sophisticated scoring
		};
	}

	private _extractActions(responseContent: string, intent: string): IntentAction[] {
		const actions: IntentAction[] = [];

		// Look for file operations in the response
		const fileWriteRegex = /(?:create|write|save)\s+(?:file|to)\s+[`"]([^`"]+)[`"]/gi;
		const fileReadRegex = /(?:read|open|show)\s+(?:file|from)\s+[`"]([^`"]+)[`"]/gi;

		let match;
		while ((match = fileWriteRegex.exec(responseContent)) !== null) {
			actions.push({
				type: 'file_write',
				parameters: { filePath: match[1] },
				description: `Write to file: ${match[1]}`
			});
		}

		while ((match = fileReadRegex.exec(responseContent)) !== null) {
			actions.push({
				type: 'file_read',
				parameters: { filePath: match[1] },
				description: `Read file: ${match[1]}`
			});
		}

		// Look for code blocks that might be new files
		const codeBlockRegex = /```(?:typescript|javascript|python|java|cpp|c|go|rust|html|css|json|yaml|xml)\s*\n([\s\S]*?)```/gi;
		const codeBlocks: string[] = [];
		while ((match = codeBlockRegex.exec(responseContent)) !== null) {
			codeBlocks.push(match[1]);
		}

		if (codeBlocks.length > 0 && (intent === 'code_generation' || intent === 'file_operation')) {
			actions.push({
				type: 'code_generate',
				parameters: { codeBlocks },
				description: 'Generated code blocks available for file creation'
			});
		}

		return actions;
	}

	public getConversationHistory(): ChatMessage[] {
		return [...this._conversationHistory];
	}

	public clearConversationHistory(): void {
		this._conversationHistory = [];
	}

	public async executeAction(action: IntentAction): Promise<boolean> {
		try {
			switch (action.type) {
				case 'file_read':
					if (action.parameters?.filePath) {
						await this._fileSystemService.readFile(action.parameters.filePath);
						return true;
					}
					break;

				case 'file_write':
					if (action.parameters?.filePath && action.parameters?.content) {
						await this._fileSystemService.writeFile(
							action.parameters.filePath,
							action.parameters.content
						);
						return true;
					}
					break;

				case 'file_create':
					if (action.parameters?.filePath && action.parameters?.content) {
						await this._fileSystemService.createFile(
							action.parameters.filePath,
							action.parameters.content
						);
						return true;
					}
					break;

				default:
					console.warn(`Unknown action type: ${action.type}`);
					return false;
			}
		} catch (error) {
			console.error(`Failed to execute action ${action.type}:`, error);
			return false;
		}

		return false;
	}
}
