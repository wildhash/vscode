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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const chatPanel_1 = require("./chatPanel");
const openaiService_1 = require("./services/openaiService");
const fileSystemService_1 = require("./services/fileSystemService");
const intentRouter_1 = require("./services/intentRouter");
const sessionManager_1 = require("./services/sessionManager");
const autonomousAgentService_1 = require("./services/autonomousAgentService");
const testDrivenService_1 = require("./services/testDrivenService");
const deploymentService_1 = require("./services/deploymentService");
const humanInterventionHandler_1 = require("./services/humanInterventionHandler");
let chatPanel;
let autonomousAgent;
let interventionHandler;
function activate(context) {
    console.log('Autonomous Dev Assistant is now active!');
    // Initialize core services
    const sessionManager = new sessionManager_1.SessionManager(context);
    const openaiService = new openaiService_1.OpenAIService();
    const fileSystemService = new fileSystemService_1.FileSystemService();
    const intentRouter = new intentRouter_1.IntentRouter(fileSystemService, openaiService);
    // Initialize autonomous development services
    const testService = new testDrivenService_1.TestDrivenService(openaiService, fileSystemService);
    const deploymentService = new deploymentService_1.DeploymentService(fileSystemService);
    interventionHandler = new humanInterventionHandler_1.HumanInterventionHandler();
    // Initialize the autonomous agent
    autonomousAgent = new autonomousAgentService_1.AutonomousAgentService(openaiService, fileSystemService, testService, deploymentService, interventionHandler);
    // Register commands
    const openChatCommand = vscode.commands.registerCommand('autonomousdev.openChat', () => {
        if (chatPanel) {
            chatPanel.reveal();
        }
        else {
            chatPanel = new chatPanel_1.ChatPanel(context.extensionUri, sessionManager, openaiService, fileSystemService, intentRouter);
            chatPanel.onDidDispose(() => {
                chatPanel = undefined;
            });
        }
    });
    const toggleVoiceCommand = vscode.commands.registerCommand('autonomousdev.toggleVoice', () => {
        if (chatPanel) {
            chatPanel.toggleVoice();
        }
        else {
            vscode.window.showInformationMessage('Please open the Voice Assistant first.');
        }
    });
    const clearHistoryCommand = vscode.commands.registerCommand('autonomousdev.clearHistory', async () => {
        const result = await vscode.window.showWarningMessage('Are you sure you want to clear all chat history?', 'Yes', 'No');
        if (result === 'Yes') {
            sessionManager.clearHistory();
            if (chatPanel) {
                chatPanel.clearChat();
            }
            vscode.window.showInformationMessage('Chat history cleared.');
        }
    });
    // Autonomous mode commands
    const toggleAutonomousCommand = vscode.commands.registerCommand('autonomousdev.toggleAutonomous', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }
        if (autonomousAgent.isActive) {
            autonomousAgent.stop();
            vscode.window.showInformationMessage('🛑 Autonomous mode OFF');
        }
        else {
            await autonomousAgent.start();
            vscode.window.showInformationMessage('🧠 Autonomous mode ON - AI is now working autonomously');
        }
    });
    const startTaskCommand = vscode.commands.registerCommand('autonomousdev.startTask', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }
        const taskDescription = await vscode.window.showInputBox({
            prompt: 'Describe the task you want the AI to complete',
            placeHolder: 'e.g., Create a REST API endpoint for user authentication',
            validateInput: (value) => {
                if (!value || value.trim().length < 10) {
                    return 'Please provide a more detailed task description (at least 10 characters)';
                }
                return undefined;
            }
        });
        if (taskDescription) {
            await autonomousAgent.startTask(taskDescription);
        }
    });
    const continueTaskCommand = vscode.commands.registerCommand('autonomousdev.continueTask', async () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }
        await autonomousAgent.continueTask();
    });
    const abortTaskCommand = vscode.commands.registerCommand('autonomousdev.abortTask', () => {
        if (!autonomousAgent) {
            vscode.window.showErrorMessage('Autonomous agent not initialized');
            return;
        }
        autonomousAgent.abortTask();
    });
    const showInterventionsCommand = vscode.commands.registerCommand('autonomousdev.showInterventions', () => {
        if (!interventionHandler) {
            vscode.window.showErrorMessage('Intervention handler not initialized');
            return;
        }
        interventionHandler.showInterventionsPanel();
    });
    // Test-driven development commands
    const runTestsCommand = vscode.commands.registerCommand('autonomousdev.runTests', async () => {
        const result = await testService.runTests();
        if (result.status === 'passed') {
            vscode.window.showInformationMessage(`✅ All ${result.passedCount} tests passed!`);
        }
        else {
            vscode.window.showWarningMessage(`❌ ${result.failedCount} tests failed`);
        }
    });
    const writeTestsCommand = vscode.commands.registerCommand('autonomousdev.writeTests', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('Please open a file to generate tests for');
            return;
        }
        const result = await testService.writeTestsForFile(editor.document.fileName);
        if (result.success) {
            vscode.window.showInformationMessage(`📝 Test file created: ${result.testFile}`);
        }
        else {
            vscode.window.showErrorMessage(`Failed to generate tests: ${result.error}`);
        }
    });
    // Deployment commands
    const buildCommand = vscode.commands.registerCommand('autonomousdev.build', async () => {
        const result = await deploymentService.build();
        if (result.success) {
            vscode.window.showInformationMessage('✅ Build successful!');
        }
        else {
            vscode.window.showErrorMessage(`❌ Build failed: ${result.error}`);
        }
    });
    const deployCommand = vscode.commands.registerCommand('autonomousdev.deploy', async () => {
        const confirm = await vscode.window.showWarningMessage('Are you sure you want to deploy to production?', 'Deploy', 'Cancel');
        if (confirm === 'Deploy') {
            const result = await deploymentService.deploy();
            if (result.success) {
                vscode.window.showInformationMessage(`🚀 Deployed successfully to ${result.url || 'production'}!`);
            }
            else {
                vscode.window.showErrorMessage(`❌ Deployment failed: ${result.error}`);
            }
        }
    });
    const setupDeploymentCommand = vscode.commands.registerCommand('autonomousdev.setupDeployment', async () => {
        const platform = await vscode.window.showQuickPick([
            { label: 'Vercel', description: 'Deploy to Vercel', value: 'vercel' },
            { label: 'Netlify', description: 'Deploy to Netlify', value: 'netlify' },
            { label: 'GitHub Pages', description: 'Deploy to GitHub Pages', value: 'github-pages' },
            { label: 'Fly.io', description: 'Deploy to Fly.io', value: 'fly' },
        ], { placeHolder: 'Select deployment platform' });
        if (platform) {
            const success = await deploymentService.createDeploymentConfig(platform.value);
            if (success) {
                vscode.window.showInformationMessage(`✅ ${platform.label} configuration created!`);
            }
        }
    });
    // Register view provider for the activity bar
    const provider = new ChatViewProvider(context.extensionUri, sessionManager, openaiService, fileSystemService, intentRouter);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('autonomousdev.chatView', provider), openChatCommand, toggleVoiceCommand, clearHistoryCommand, toggleAutonomousCommand, startTaskCommand, continueTaskCommand, abortTaskCommand, showInterventionsCommand, runTestsCommand, writeTestsCommand, buildCommand, deployCommand, setupDeploymentCommand);
    // Auto-start autonomous mode if configured
    const config = vscode.workspace.getConfiguration('autonomousdev');
    if (config.get('autoStartAutonomous', false)) {
        autonomousAgent.start();
        vscode.window.showInformationMessage('🧠 Autonomous mode auto-started');
    }
    // Auto-open chat on startup if configured
    if (config.get('autoOpen', false)) {
        vscode.commands.executeCommand('autonomousdev.openChat');
    }
}
exports.activate = activate;
class ChatViewProvider {
    constructor(extensionUri, sessionManager, openaiService, fileSystemService, intentRouter) {
        this.extensionUri = extensionUri;
        this.sessionManager = sessionManager;
        this.openaiService = openaiService;
        this.fileSystemService = fileSystemService;
        this.intentRouter = intentRouter;
    }
    resolveWebviewView(webviewView, _context, _token) {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri]
        };
        // Create a mini chat panel for the activity bar
        new chatPanel_1.ChatPanel(this.extensionUri, this.sessionManager, this.openaiService, this.fileSystemService, this.intentRouter, webviewView.webview);
    }
}
function deactivate() {
    if (chatPanel) {
        chatPanel.dispose();
    }
    if (autonomousAgent) {
        autonomousAgent.stop();
    }
    if (interventionHandler) {
        interventionHandler.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map