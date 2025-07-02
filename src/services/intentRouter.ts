/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BackendService, BackendResponse } from './backendService';
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
	private _backendService: BackendService;
	private _fileSystemService: FileSystemService;

	constructor(
		fileSystemService: FileSystemService,
		backendService?: BackendService
	) {
		this._fileSystemService = fileSystemService;
		this._backendService = backendService || new BackendService();
	}

	public async processMessage(userMessage: string, isVoice: boolean = false): Promise<IntentResponse> {
		try {
			// Initialize backend session if needed
			await this._backendService.initializeSession();

			// Update context with current workspace state
			await this._backendService.updateContext();

			// Send message to backend with enhanced context
			const response = await this._backendService.sendMessage(userMessage, isVoice);

			// Parse actions from response
			const actions = this._extractActionsFromResponse(response);

			// Execute immediate actions if needed
			await this._executeImmediateActions(actions);

			return {
				content: response.content,
				actions,
				confidence: 0.9 // Higher confidence with backend intelligence
			};

		} catch (error) {
			console.error('Error in intent processing:', error);

			// Fallback to local processing if backend is unavailable
			return await this._fallbackLocalProcessing(userMessage);
		}
	}

	/**
	 * Extract actionable items from backend response
	 */
	private _extractActionsFromResponse(response: BackendResponse): IntentAction[] {
		const actions: IntentAction[] = [];

		// Use actions from backend if available
		if (response.actions && response.actions.length > 0) {
			return response.actions.map(action => ({
				type: action.type as any,
				parameters: action.parameters,
				description: action.description || `Execute ${action.type}`
			}));
		}

		// Parse content for action patterns if no explicit actions
		const content = response.content;

		// Look for file operations
		const fileOperations = this._parseFileOperations(content);
		actions.push(...fileOperations);

		// Look for code blocks that might be new files
		const codeBlocks = this._parseCodeBlocks(content);
		if (codeBlocks.length > 0) {
			actions.push({
				type: 'code_generate',
				parameters: { codeBlocks },
				description: 'Generated code blocks available for file creation'
			});
		}

		// Look for VS Code commands
		const commands = this._parseCommands(content);
		actions.push(...commands);

		return actions;
	}

	/**
	 * Parse file operations from response content
	 */
	private _parseFileOperations(content: string): IntentAction[] {
		const actions: IntentAction[] = [];

		// File write operations
		const fileWriteRegex = /(?:create|write|save)\s+(?:file|to)\s+[`"]([^`"]+)[`"]/gi;
		let match;
		while ((match = fileWriteRegex.exec(content)) !== null) {
			actions.push({
				type: 'file_write',
				parameters: { filePath: match[1] },
				description: `Write to file: ${match[1]}`
			});
		}

		// File read operations
		const fileReadRegex = /(?:read|open|show)\s+(?:file|from)\s+[`"]([^`"]+)[`"]/gi;
		while ((match = fileReadRegex.exec(content)) !== null) {
			actions.push({
				type: 'file_read',
				parameters: { filePath: match[1] },
				description: `Read file: ${match[1]}`
			});
		}

		return actions;
	}

	/**
	 * Parse code blocks from response content
	 */
	private _parseCodeBlocks(content: string): string[] {
		const codeBlockRegex = /```(?:typescript|javascript|python|java|cpp|c|go|rust|html|css|json|yaml|xml|tsx|jsx)\s*\n([\s\S]*?)```/gi;
		const codeBlocks: string[] = [];

		let match;
		while ((match = codeBlockRegex.exec(content)) !== null) {
			codeBlocks.push(match[1]);
		}

		return codeBlocks;
	}

	/**
	 * Parse VS Code commands from response content
	 */
	private _parseCommands(content: string): IntentAction[] {
		const actions: IntentAction[] = [];

		// Common command patterns
		const commandPatterns = [
			{ pattern: /open\s+command\s+palette/i, command: 'workbench.action.showCommands' },
			{ pattern: /format\s+document/i, command: 'editor.action.formatDocument' },
			{ pattern: /toggle\s+sidebar/i, command: 'workbench.action.toggleSidebarVisibility' },
			{ pattern: /open\s+terminal/i, command: 'workbench.action.terminal.new' },
			{ pattern: /split\s+editor/i, command: 'workbench.action.splitEditor' }
		];

		for (const { pattern, command } of commandPatterns) {
			if (pattern.test(content)) {
				actions.push({
					type: 'command',
					parameters: { command },
					description: `Execute VS Code command: ${command}`
				});
			}
		}

		return actions;
	}

	/**
	 * Execute actions that should happen immediately
	 */
	private async _executeImmediateActions(actions: IntentAction[]): Promise<void> {
		for (const action of actions) {
			try {
				switch (action.type) {
					case 'file_read':
						if (action.parameters?.filePath) {
							// This will be handled by the UI layer
							console.log(`📖 Queued file read: ${action.parameters.filePath}`);
						}
						break;

					case 'command':
						if (action.parameters?.command) {
							// Execute VS Code command immediately
							await this._executeVSCodeCommand(action.parameters.command);
						}
						break;

					default:
						// Other actions will be handled by the UI layer
						break;
				}
			} catch (error) {
				console.error(`Failed to execute action ${action.type}:`, error);
			}
		}
	}

	/**
	 * Execute VS Code command
	 */
	private async _executeVSCodeCommand(command: string): Promise<void> {
		try {
			await import('vscode').then(vscode => {
				return vscode.commands.executeCommand(command);
			});
			console.log(`✅ Executed command: ${command}`);
		} catch (error) {
			console.error(`❌ Failed to execute command ${command}:`, error);
		}
	}

	/**
	 * Fallback to local processing if backend is unavailable
	 */
	private async _fallbackLocalProcessing(userMessage: string): Promise<IntentResponse> {
		console.log('🔄 Using fallback local processing...');

		// Simple intent detection
		const intent = this._detectLocalIntent(userMessage);

		let response = "I'm having trouble connecting to the backend service. ";

		switch (intent) {
			case 'file_operation':
				response += "I can still help with basic file operations. Please specify the file path and action.";
				break;
			case 'code_generation':
				response += "For code generation, I recommend checking your backend connection and trying again.";
				break;
			case 'general_question':
				response += "I'm in limited mode. Please ensure the Digital Intelligence backend is running.";
				break;
			default:
				response += "Please check your backend connection and try again.";
		}

		return {
			content: response,
			actions: [],
			confidence: 0.3
		};
	}

	/**
	 * Simple local intent detection for fallback
	 */
	private _detectLocalIntent(message: string): string {
		const lowerMessage = message.toLowerCase();

		if (lowerMessage.includes('file') || lowerMessage.includes('read') || lowerMessage.includes('write')) {
			return 'file_operation';
		}

		if (lowerMessage.includes('code') || lowerMessage.includes('function') || lowerMessage.includes('class')) {
			return 'code_generation';
		}

		if (lowerMessage.includes('explain') || lowerMessage.includes('debug') || lowerMessage.includes('fix')) {
			return 'debugging';
		}

		return 'general_question';
	}

	/**
	 * Get conversation history from backend
	 */
	public async getConversationHistory(): Promise<any[]> {
		try {
			const session = this._backendService.getCurrentSession();
			return session?.messages || [];
		} catch (error) {
			console.error('Failed to get conversation history:', error);
			return [];
		}
	}

	/**
	 * Clear conversation history
	 */
	public async clearConversationHistory(): Promise<void> {
		try {
			await this._backendService.endSession();
			await this._backendService.initializeSession();
			console.log('🗑️ Conversation history cleared');
		} catch (error) {
			console.error('Failed to clear conversation history:', error);
		}
	}

	/**
	 * Check backend connectivity
	 */
	public async checkBackendHealth(): Promise<boolean> {
		try {
			return await this._backendService.checkHealth();
		} catch (error) {
			console.error('Backend health check failed:', error);
			return false;
		}
	}

	/**
	 * Get current session info
	 */
	public getCurrentSession() {
		return this._backendService.getCurrentSession();
	}

	/**
	 * Update session context manually
	 */
	public async updateSessionContext(): Promise<void> {
		try {
			await this._backendService.updateContext();
		} catch (error) {
			console.error('Failed to update session context:', error);
		}
	}
}
