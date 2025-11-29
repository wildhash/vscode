/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface InterventionRequest {
	type: 'error_loop' | 'low_confidence' | 'approval' | 'guidance' | 'information' | 'critical';
	title: string;
	description: string;
	priority: 'low' | 'medium' | 'high' | 'critical';
	context?: Record<string, unknown>;
	suggestedActions?: string[];
	timeout?: number;
}

export interface InterventionResponse {
	action: string;
	userInput?: string;
	timestamp: number;
	dismissed: boolean;
}

export type InterventionCallback = (response: InterventionResponse) => void;

export class HumanInterventionHandler {
	private _pendingInterventions: Map<string, InterventionRequest> = new Map();
	private _responseCallbacks: Map<string, InterventionCallback> = new Map();
	private _outputChannel: vscode.OutputChannel;
	private _statusBarItem: vscode.StatusBarItem;

	constructor() {
		this._outputChannel = vscode.window.createOutputChannel('Autonomous Agent - Human Intervention');
		this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this._statusBarItem.command = 'autonomousdev.showInterventions';
		this._updateStatusBar();
	}

	/**
	 * Request human intervention
	 */
	public async requestIntervention(request: InterventionRequest, callback?: InterventionCallback): Promise<InterventionResponse> {
		const interventionId = this._generateId();

		this._pendingInterventions.set(interventionId, request);
		if (callback) {
			this._responseCallbacks.set(interventionId, callback);
		}

		this._updateStatusBar();

		// Log to output channel
		this._logIntervention(request);

		// Show notification based on priority
		const response = await this._showInterventionNotification(interventionId, request);

		// Clean up
		this._pendingInterventions.delete(interventionId);
		this._responseCallbacks.delete(interventionId);
		this._updateStatusBar();

		// Execute callback if provided
		if (callback) {
			callback(response);
		}

		return response;
	}

	private async _showInterventionNotification(id: string, request: InterventionRequest): Promise<InterventionResponse> {
		// Prepare action buttons
		const actions = request.suggestedActions || ['OK', 'Dismiss'];

		// Choose notification type based on priority
		let showMethod: (message: string, ...items: string[]) => Thenable<string | undefined>;

		switch (request.priority) {
			case 'critical':
				showMethod = vscode.window.showErrorMessage;
				break;
			case 'high':
				showMethod = vscode.window.showWarningMessage;
				break;
			default:
				showMethod = vscode.window.showInformationMessage;
		}

		// Format the message
		const icon = this._getPriorityIcon(request.priority);
		const message = `${icon} ${request.title}\n\n${request.description}`;

		// Show notification and wait for response
		const selection = await showMethod(message, ...actions);

		return {
			action: selection || 'dismissed',
			timestamp: Date.now(),
			dismissed: !selection
		};
	}

	private _getPriorityIcon(priority: InterventionRequest['priority']): string {
		switch (priority) {
			case 'critical':
				return '🚨';
			case 'high':
				return '⚠️';
			case 'medium':
				return '📣';
			default:
				return 'ℹ️';
		}
	}

	private _logIntervention(request: InterventionRequest): void {
		this._outputChannel.appendLine('');
		this._outputChannel.appendLine('═══════════════════════════════════════════════════════════');
		this._outputChannel.appendLine(`🚨 HUMAN INTERVENTION REQUIRED - ${new Date().toISOString()}`);
		this._outputChannel.appendLine('═══════════════════════════════════════════════════════════');
		this._outputChannel.appendLine('');
		this._outputChannel.appendLine(`Type: ${request.type}`);
		this._outputChannel.appendLine(`Priority: ${request.priority.toUpperCase()}`);
		this._outputChannel.appendLine(`Title: ${request.title}`);
		this._outputChannel.appendLine('');
		this._outputChannel.appendLine('Description:');
		this._outputChannel.appendLine(request.description);
		this._outputChannel.appendLine('');

		if (request.suggestedActions && request.suggestedActions.length > 0) {
			this._outputChannel.appendLine('Suggested Actions:');
			request.suggestedActions.forEach((action, index) => {
				this._outputChannel.appendLine(`  ${index + 1}. ${action}`);
			});
			this._outputChannel.appendLine('');
		}

		if (request.context) {
			this._outputChannel.appendLine('Context:');
			this._outputChannel.appendLine(JSON.stringify(request.context, null, 2));
			this._outputChannel.appendLine('');
		}

		this._outputChannel.appendLine('═══════════════════════════════════════════════════════════');
		this._outputChannel.appendLine('');

		// Show the output channel
		this._outputChannel.show(true);
	}

	private _updateStatusBar(): void {
		const count = this._pendingInterventions.size;

		if (count > 0) {
			this._statusBarItem.text = `$(alert) ${count} intervention${count > 1 ? 's' : ''} needed`;
			this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
			this._statusBarItem.show();
		} else {
			this._statusBarItem.hide();
		}
	}

	/**
	 * Get all pending interventions
	 */
	public getPendingInterventions(): InterventionRequest[] {
		return Array.from(this._pendingInterventions.values());
	}

	/**
	 * Show interventions panel
	 */
	public showInterventionsPanel(): void {
		const interventions = this.getPendingInterventions();

		if (interventions.length === 0) {
			vscode.window.showInformationMessage('No pending interventions');
			return;
		}

		// Create a quick pick for interventions
		const items: vscode.QuickPickItem[] = interventions.map((intervention, index) => ({
			label: `${this._getPriorityIcon(intervention.priority)} ${intervention.title}`,
			description: intervention.type,
			detail: intervention.description.substring(0, 100) + '...'
		}));

		vscode.window.showQuickPick(items, {
			placeHolder: 'Select an intervention to handle',
			canPickMany: false
		});
	}

	/**
	 * Request user input with validation
	 */
	public async requestUserInput(
		prompt: string,
		options?: {
			placeholder?: string;
			value?: string;
			validateInput?: (value: string) => string | undefined;
		}
	): Promise<string | undefined> {
		return vscode.window.showInputBox({
			prompt,
			placeHolder: options?.placeholder,
			value: options?.value,
			validateInput: options?.validateInput
		});
	}

	/**
	 * Request user confirmation
	 */
	public async requestConfirmation(
		message: string,
		options?: { confirmLabel?: string; cancelLabel?: string }
	): Promise<boolean> {
		const confirmLabel = options?.confirmLabel || 'Yes';
		const cancelLabel = options?.cancelLabel || 'No';

		const result = await vscode.window.showWarningMessage(
			message,
			{ modal: true },
			confirmLabel,
			cancelLabel
		);

		return result === confirmLabel;
	}

	/**
	 * Request user to take manual action with instructions
	 */
	public async requestManualAction(
		title: string,
		instructions: string[],
		options?: { timeout?: number }
	): Promise<InterventionResponse> {
		const fullDescription = [
			'Please perform the following manual steps:',
			'',
			...instructions.map((instruction, index) => `${index + 1}. ${instruction}`),
			'',
			'Click "Done" when you have completed these steps, or "Skip" to continue without completing.'
		].join('\n');

		return this.requestIntervention({
			type: 'guidance',
			title,
			description: fullDescription,
			priority: 'high',
			suggestedActions: ['Done', 'Skip', 'Need Help']
		});
	}

	/**
	 * Show a command instruction to the user
	 */
	public showCommand(command: string, description: string): void {
		this._outputChannel.appendLine('');
		this._outputChannel.appendLine('╔════════════════════════════════════════════════════════════╗');
		this._outputChannel.appendLine('║                    COMMAND REQUIRED                        ║');
		this._outputChannel.appendLine('╠════════════════════════════════════════════════════════════╣');
		this._outputChannel.appendLine(`║ ${description.padEnd(58)}║`);
		this._outputChannel.appendLine('║                                                            ║');
		this._outputChannel.appendLine('║ Run this command:                                          ║');
		this._outputChannel.appendLine(`║   ${command.substring(0, 56).padEnd(56)}║`);
		this._outputChannel.appendLine('╚════════════════════════════════════════════════════════════╝');
		this._outputChannel.appendLine('');
		this._outputChannel.show(true);

		// Also show as notification with copy button
		vscode.window.showInformationMessage(
			`Run command: ${command}`,
			'Copy Command',
			'Open Terminal'
		).then(selection => {
			if (selection === 'Copy Command') {
				vscode.env.clipboard.writeText(command);
				vscode.window.showInformationMessage('Command copied to clipboard!');
			} else if (selection === 'Open Terminal') {
				const terminal = vscode.window.createTerminal('Autonomous Agent');
				terminal.show();
				terminal.sendText(command);
			}
		});
	}

	/**
	 * Report a blocker that requires user action to proceed
	 */
	public async reportBlocker(
		blockerType: 'authentication' | 'permission' | 'configuration' | 'external_service' | 'unknown',
		details: string,
		resolution?: string[]
	): Promise<InterventionResponse> {
		const blockerMessages: Record<typeof blockerType, string> = {
			authentication: '🔐 Authentication Required',
			permission: '🔒 Permission Denied',
			configuration: '⚙️ Configuration Missing',
			external_service: '🌐 External Service Issue',
			unknown: '❓ Unknown Blocker'
		};

		const title = blockerMessages[blockerType] || blockerMessages.unknown;

		let description = details;
		if (resolution && resolution.length > 0) {
			description += '\n\nTo resolve this:\n' + resolution.map((r, i) => `${i + 1}. ${r}`).join('\n');
		}

		return this.requestIntervention({
			type: 'critical',
			title,
			description,
			priority: 'critical',
			suggestedActions: ['I\'ve fixed it', 'Need help', 'Skip for now', 'Abort']
		});
	}

	/**
	 * Clean up resources
	 */
	public dispose(): void {
		this._outputChannel.dispose();
		this._statusBarItem.dispose();
	}

	private _generateId(): string {
		return `intervention_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	}
}
