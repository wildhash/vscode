"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanInterventionHandler = void 0;
const vscode = __importStar(require("vscode"));
class HumanInterventionHandler {
    constructor() {
        this._pendingInterventions = new Map();
        this._responseCallbacks = new Map();
        this._outputChannel = vscode.window.createOutputChannel('Autonomous Agent - Human Intervention');
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this._statusBarItem.command = 'autonomousdev.showInterventions';
        this._updateStatusBar();
    }
    /**
     * Request human intervention
     */
    async requestIntervention(request, callback) {
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
    async _showInterventionNotification(id, request) {
        // Prepare action buttons
        const actions = request.suggestedActions || ['OK', 'Dismiss'];
        // Choose notification type based on priority
        let showMethod;
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
    _getPriorityIcon(priority) {
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
    _logIntervention(request) {
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
    _updateStatusBar() {
        const count = this._pendingInterventions.size;
        if (count > 0) {
            this._statusBarItem.text = `$(alert) ${count} intervention${count > 1 ? 's' : ''} needed`;
            this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this._statusBarItem.show();
        }
        else {
            this._statusBarItem.hide();
        }
    }
    /**
     * Get all pending interventions
     */
    getPendingInterventions() {
        return Array.from(this._pendingInterventions.values());
    }
    /**
     * Show interventions panel
     */
    showInterventionsPanel() {
        const interventions = this.getPendingInterventions();
        if (interventions.length === 0) {
            vscode.window.showInformationMessage('No pending interventions');
            return;
        }
        // Create a quick pick for interventions
        const items = interventions.map((intervention, index) => ({
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
    async requestUserInput(prompt, options) {
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
    async requestConfirmation(message, options) {
        const confirmLabel = options?.confirmLabel || 'Yes';
        const cancelLabel = options?.cancelLabel || 'No';
        const result = await vscode.window.showWarningMessage(message, { modal: true }, confirmLabel, cancelLabel);
        return result === confirmLabel;
    }
    /**
     * Request user to take manual action with instructions
     */
    async requestManualAction(title, instructions, options) {
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
    showCommand(command, description) {
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
        vscode.window.showInformationMessage(`Run command: ${command}`, 'Copy Command', 'Open Terminal').then(selection => {
            if (selection === 'Copy Command') {
                vscode.env.clipboard.writeText(command);
                vscode.window.showInformationMessage('Command copied to clipboard!');
            }
            else if (selection === 'Open Terminal') {
                const terminal = vscode.window.createTerminal('Autonomous Agent');
                terminal.show();
                terminal.sendText(command);
            }
        });
    }
    /**
     * Report a blocker that requires user action to proceed
     */
    async reportBlocker(blockerType, details, resolution) {
        const blockerMessages = {
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
    dispose() {
        this._outputChannel.dispose();
        this._statusBarItem.dispose();
    }
    _generateId() {
        return `intervention_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.HumanInterventionHandler = HumanInterventionHandler;
//# sourceMappingURL=humanInterventionHandler.js.map