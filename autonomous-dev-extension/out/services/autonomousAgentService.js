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
exports.AutonomousAgentService = void 0;
const vscode = __importStar(require("vscode"));
class AutonomousAgentService {
    constructor(_openaiService, _fileSystemService, _testService, _deploymentService, _interventionHandler) {
        this._openaiService = _openaiService;
        this._fileSystemService = _fileSystemService;
        this._testService = _testService;
        this._deploymentService = _deploymentService;
        this._interventionHandler = _interventionHandler;
        this._isActive = false;
        this._recentObservations = [];
        this._errorLoopCount = 0;
        this.MAX_ERROR_LOOP = 3;
        this.THINKING_CYCLE_MS = 10000; // 10 seconds
    }
    get isActive() {
        return this._isActive;
    }
    get currentTask() {
        return this._currentTask;
    }
    async start() {
        if (this._isActive) {
            return;
        }
        this._isActive = true;
        console.log('🧠 Autonomous agent started');
        // Start the thinking loop
        this._thinkingInterval = setInterval(async () => {
            await this._thinkCycle();
        }, this.THINKING_CYCLE_MS);
        // Run first cycle immediately
        await this._thinkCycle();
    }
    stop() {
        this._isActive = false;
        if (this._thinkingInterval) {
            clearInterval(this._thinkingInterval);
            this._thinkingInterval = undefined;
        }
        console.log('🛑 Autonomous agent stopped');
    }
    /**
     * Start a new task with full TDD and deployment workflow
     */
    async startTask(description) {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this._currentTask = {
            taskId,
            description,
            status: 'pending',
            steps: [
                { name: 'Analyze requirements', status: 'pending' },
                { name: 'Write tests (TDD)', status: 'pending' },
                { name: 'Implement code', status: 'pending' },
                { name: 'Run tests', status: 'pending' },
                { name: 'Fix issues', status: 'pending' },
                { name: 'Build project', status: 'pending' },
                { name: 'Deploy to production', status: 'pending' },
                { name: 'Verify deployment', status: 'pending' }
            ],
            currentStepIndex: 0,
            errorCount: 0,
            maxRetries: this.MAX_ERROR_LOOP
        };
        // Notify user
        vscode.window.showInformationMessage(`🚀 Starting task: ${description}`);
        // Begin executing the task
        await this._executeTask();
        return this._currentTask;
    }
    async _thinkCycle() {
        if (!this._isActive) {
            return;
        }
        try {
            // 1. Observe workspace
            const observation = await this._observeWorkspace();
            this._recentObservations.push(observation);
            // Keep only last 10 observations
            if (this._recentObservations.length > 10) {
                this._recentObservations = this._recentObservations.slice(-10);
            }
            // 2. Reason about observations
            const thought = await this._reason(observation);
            // 3. Handle error loops
            if (thought.requiresHumanIntervention) {
                await this._requestHumanIntervention(thought);
                return;
            }
            // 4. Execute suggested action if appropriate
            if (thought.suggestedAction && thought.confidence > 0.7) {
                await this._executeAction(thought.suggestedAction);
            }
        }
        catch (error) {
            console.error('Thinking cycle error:', error);
            this._errorLoopCount++;
            if (this._errorLoopCount >= this.MAX_ERROR_LOOP) {
                await this._requestHumanIntervention({
                    observation: await this._observeWorkspace(),
                    reasoning: 'Multiple consecutive errors in thinking cycle',
                    confidence: 0,
                    suggestedAction: undefined,
                    requiresHumanIntervention: true,
                    interventionReason: `Error loop detected after ${this._errorLoopCount} failures: ${error}`
                });
            }
        }
    }
    async _observeWorkspace() {
        // Get diagnostics
        const diagnostics = vscode.languages.getDiagnostics();
        const diagnosticInfos = [];
        for (const [uri, diags] of diagnostics) {
            for (const diag of diags) {
                let severity = 'info';
                switch (diag.severity) {
                    case vscode.DiagnosticSeverity.Error:
                        severity = 'error';
                        break;
                    case vscode.DiagnosticSeverity.Warning:
                        severity = 'warning';
                        break;
                    case vscode.DiagnosticSeverity.Hint:
                        severity = 'hint';
                        break;
                }
                diagnosticInfos.push({
                    severity,
                    message: diag.message,
                    file: uri.fsPath,
                    line: diag.range.start.line + 1,
                    column: diag.range.start.character + 1,
                    source: diag.source
                });
            }
        }
        // Get open files
        const openFiles = vscode.window.visibleTextEditors.map(e => e.document.fileName);
        // Determine build/test status from test service
        let testStatus = 'unknown';
        let buildStatus = 'unknown';
        const hasErrors = diagnosticInfos.some(d => d.severity === 'error');
        if (hasErrors) {
            buildStatus = 'failure';
        }
        return {
            timestamp: Date.now(),
            openFiles,
            diagnostics: diagnosticInfos,
            recentChanges: [],
            buildStatus,
            testStatus,
            deploymentStatus: 'unknown'
        };
    }
    async _reason(observation) {
        const errors = observation.diagnostics.filter(d => d.severity === 'error');
        const warnings = observation.diagnostics.filter(d => d.severity === 'warning');
        // Check for error loops
        if (this._errorLoopCount >= this.MAX_ERROR_LOOP) {
            return {
                observation,
                reasoning: 'Too many consecutive errors detected. Human intervention required.',
                confidence: 1.0,
                requiresHumanIntervention: true,
                interventionReason: `Error loop detected. Last ${this.MAX_ERROR_LOOP} attempts failed. Please review and provide guidance.`
            };
        }
        // If there are errors, try to fix them
        if (errors.length > 0) {
            const prompt = this._buildReasoningPrompt(observation);
            try {
                const response = await this._openaiService.generateResponse([{ role: 'user', content: prompt }], this._getAutonomousSystemPrompt());
                const parsed = this._parseReasoningResponse(response.content, observation);
                return parsed;
            }
            catch (error) {
                return {
                    observation,
                    reasoning: `Failed to reason about errors: ${error}`,
                    confidence: 0,
                    requiresHumanIntervention: true,
                    interventionReason: 'AI reasoning failed. Please check API key and configuration.'
                };
            }
        }
        // No immediate issues
        return {
            observation,
            reasoning: 'No critical issues detected. Monitoring workspace.',
            confidence: 0.5,
            requiresHumanIntervention: false
        };
    }
    _buildReasoningPrompt(observation) {
        const errors = observation.diagnostics.filter(d => d.severity === 'error');
        const errorList = errors.map(e => `- ${e.file}:${e.line}: ${e.message}`).join('\n');
        return `You are an autonomous coding agent monitoring a workspace.

Current State:
- Open files: ${observation.openFiles.join(', ') || 'None'}
- Errors found: ${errors.length}
- Build status: ${observation.buildStatus}
- Test status: ${observation.testStatus}

${errors.length > 0 ? `Errors:\n${errorList}` : 'No errors'}

Analyze this and decide:
1. Should I take action? (yes/no)
2. If yes, what action? (fix_error/write_test/run_tests/build/deploy/notify)
3. What's my confidence level? (0-100)
4. Do I need human intervention? (yes/no)
5. Brief explanation

Respond in JSON format:
{
  "shouldAct": boolean,
  "action": "fix_error" | "write_test" | "run_tests" | "build" | "deploy" | "notify" | null,
  "priority": "low" | "medium" | "high" | "critical",
  "confidence": number,
  "requiresIntervention": boolean,
  "interventionReason": "string or null",
  "reasoning": "string"
}`;
    }
    _parseReasoningResponse(response, observation) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const thought = {
                    observation,
                    reasoning: parsed.reasoning || 'No reasoning provided',
                    confidence: (parsed.confidence || 0) / 100,
                    requiresHumanIntervention: parsed.requiresIntervention || false,
                    interventionReason: parsed.interventionReason
                };
                if (parsed.shouldAct && parsed.action) {
                    thought.suggestedAction = {
                        type: parsed.action,
                        description: parsed.reasoning,
                        priority: parsed.priority || 'medium',
                        autoExecute: parsed.confidence > 80 && !parsed.requiresIntervention
                    };
                }
                return thought;
            }
        }
        catch (error) {
            console.error('Failed to parse reasoning response:', error);
        }
        return {
            observation,
            reasoning: response,
            confidence: 0.3,
            requiresHumanIntervention: false
        };
    }
    async _executeAction(action) {
        console.log(`🔧 Executing action: ${action.type} - ${action.description}`);
        switch (action.type) {
            case 'fix_error':
                await this._attemptErrorFix(action);
                break;
            case 'write_test':
                await this._writeTests(action);
                break;
            case 'run_tests':
                await this._runTests();
                break;
            case 'build':
                await this._buildProject();
                break;
            case 'deploy':
                await this._deployProject();
                break;
            case 'notify':
                await this._notifyUser(action.description);
                break;
            case 'request_intervention':
                await this._interventionHandler.requestIntervention({
                    type: 'guidance',
                    title: 'Agent requires guidance',
                    description: action.description,
                    priority: action.priority,
                    suggestedActions: ['Provide guidance', 'Skip this step', 'Abort task']
                });
                break;
        }
        // Reset error count on successful action
        this._errorLoopCount = 0;
    }
    async _attemptErrorFix(action) {
        const observation = this._recentObservations[this._recentObservations.length - 1];
        if (!observation) {
            return;
        }
        const errors = observation.diagnostics.filter(d => d.severity === 'error');
        if (errors.length === 0) {
            return;
        }
        // Try to fix each error
        for (const error of errors.slice(0, 5)) { // Limit to 5 errors at a time
            try {
                const fileContent = await this._fileSystemService.readFile(error.file);
                const fixPrompt = `Fix this error in the code:
File: ${error.file}
Line: ${error.line}
Error: ${error.message}

Current code around line ${error.line}:
\`\`\`
${this._extractCodeContext(fileContent, error.line, 5)}
\`\`\`

Provide the corrected code that fixes this error. Return ONLY the fixed code block, nothing else.`;
                const response = await this._openaiService.generateResponse([{ role: 'user', content: fixPrompt }], 'You are an expert code fixer. Provide minimal, precise fixes.');
                // Extract code from response
                const codeMatch = response.content.match(/```[\w]*\n([\s\S]*?)```/);
                if (codeMatch) {
                    const fixedCode = codeMatch[1];
                    // For now, notify user of suggested fix
                    vscode.window.showInformationMessage(`🔧 Suggested fix for ${error.file}:${error.line}`, 'Apply Fix', 'View Details').then(selection => {
                        if (selection === 'View Details') {
                            vscode.window.showInformationMessage(`Fix: ${fixedCode.substring(0, 100)}...`);
                        }
                    });
                }
            }
            catch (err) {
                console.error(`Failed to fix error in ${error.file}:`, err);
            }
        }
    }
    _extractCodeContext(content, line, contextLines) {
        const lines = content.split('\n');
        const startLine = Math.max(0, line - contextLines - 1);
        const endLine = Math.min(lines.length, line + contextLines);
        return lines.slice(startLine, endLine).join('\n');
    }
    async _writeTests(action) {
        // Use the test-driven service to write tests
        if (action.parameters?.filePath) {
            const result = await this._testService.writeTestsForFile(action.parameters.filePath);
            if (!result.success) {
                vscode.window.showWarningMessage(`Failed to write tests: ${result.error}`);
            }
        }
    }
    async _runTests() {
        const result = await this._testService.runTests();
        if (result.status === 'failed') {
            vscode.window.showWarningMessage(`Tests failed: ${result.failedCount} failures`);
        }
        else if (result.status === 'passed') {
            vscode.window.showInformationMessage(`✅ All ${result.passedCount} tests passed!`);
        }
    }
    async _buildProject() {
        const result = await this._deploymentService.build();
        if (!result.success) {
            vscode.window.showErrorMessage(`Build failed: ${result.error}`);
        }
        else {
            vscode.window.showInformationMessage('✅ Build successful!');
        }
    }
    async _deployProject() {
        const result = await this._deploymentService.deploy();
        if (!result.success) {
            vscode.window.showErrorMessage(`Deployment failed: ${result.error}`);
        }
        else {
            vscode.window.showInformationMessage(`🚀 Deployed successfully to ${result.url || 'production'}!`);
        }
    }
    async _notifyUser(message) {
        vscode.window.showInformationMessage(`🤖 AI: ${message}`);
    }
    async _requestHumanIntervention(thought) {
        const intervention = {
            type: 'error_loop',
            title: 'Human Intervention Required',
            description: thought.interventionReason || thought.reasoning,
            priority: 'high',
            context: {
                observation: thought.observation,
                errorCount: this._errorLoopCount,
                recentActions: []
            },
            suggestedActions: [
                'Review errors and provide guidance',
                'Fix manually and continue',
                'Reset and restart task',
                'Abort task'
            ]
        };
        await this._interventionHandler.requestIntervention(intervention);
        this.stop(); // Pause agent until user responds
    }
    async _executeTask() {
        if (!this._currentTask) {
            return;
        }
        this._currentTask.status = 'in_progress';
        for (let i = 0; i < this._currentTask.steps.length; i++) {
            if (!this._isActive) {
                break;
            }
            this._currentTask.currentStepIndex = i;
            const step = this._currentTask.steps[i];
            step.status = 'in_progress';
            step.startTime = Date.now();
            try {
                await this._executeTaskStep(step.name, this._currentTask.description);
                step.status = 'completed';
                step.endTime = Date.now();
                // Reset error count on success
                this._errorLoopCount = 0;
            }
            catch (error) {
                step.status = 'failed';
                step.error = error instanceof Error ? error.message : String(error);
                step.endTime = Date.now();
                this._currentTask.errorCount++;
                if (this._currentTask.errorCount >= this._currentTask.maxRetries) {
                    this._currentTask.status = 'needs_intervention';
                    await this._requestHumanIntervention({
                        observation: await this._observeWorkspace(),
                        reasoning: `Task step "${step.name}" failed after ${this._currentTask.maxRetries} retries`,
                        confidence: 0,
                        requiresHumanIntervention: true,
                        interventionReason: `
=== HUMAN INTERVENTION REQUIRED ===

Task: ${this._currentTask.description}
Step: ${step.name}
Error: ${step.error}
Attempts: ${this._currentTask.errorCount}/${this._currentTask.maxRetries}

ACTION REQUIRED:
1. Review the error above
2. Fix the issue manually or provide guidance
3. Use command "autonomousdev.continueTask" to resume
4. Or use "autonomousdev.abortTask" to cancel

===============================`
                    });
                    return;
                }
                // Retry the step
                i--;
            }
        }
        if (this._currentTask && this._currentTask.status === 'in_progress') {
            this._currentTask.status = 'completed';
            vscode.window.showInformationMessage(`🎉 Task completed: ${this._currentTask.description}`);
        }
    }
    async _executeTaskStep(stepName, taskDescription) {
        switch (stepName) {
            case 'Analyze requirements':
                await this._analyzeRequirements(taskDescription);
                break;
            case 'Write tests (TDD)':
                await this._writeTddTests(taskDescription);
                break;
            case 'Implement code':
                await this._implementCode(taskDescription);
                break;
            case 'Run tests':
                await this._runTests();
                break;
            case 'Fix issues':
                await this._fixIssues();
                break;
            case 'Build project':
                await this._buildProject();
                break;
            case 'Deploy to production':
                await this._deployProject();
                break;
            case 'Verify deployment':
                await this._verifyDeployment();
                break;
            default:
                throw new Error(`Unknown step: ${stepName}`);
        }
    }
    async _analyzeRequirements(taskDescription) {
        vscode.window.showInformationMessage(`📋 Analyzing requirements: ${taskDescription}`);
        // AI analysis would go here
    }
    async _writeTddTests(taskDescription) {
        vscode.window.showInformationMessage(`📝 Writing TDD tests for: ${taskDescription}`);
        await this._testService.writeTestsForTask(taskDescription);
    }
    async _implementCode(taskDescription) {
        vscode.window.showInformationMessage(`💻 Implementing code for: ${taskDescription}`);
        // Code implementation would go here
    }
    async _fixIssues() {
        const observation = await this._observeWorkspace();
        const errors = observation.diagnostics.filter(d => d.severity === 'error');
        if (errors.length > 0) {
            await this._attemptErrorFix({
                type: 'fix_error',
                description: 'Fixing detected issues',
                priority: 'high',
                autoExecute: true
            });
        }
    }
    async _verifyDeployment() {
        const result = await this._deploymentService.verify();
        if (!result.success) {
            throw new Error(`Deployment verification failed: ${result.error}`);
        }
        vscode.window.showInformationMessage('✅ Deployment verified successfully!');
    }
    _getAutonomousSystemPrompt() {
        return `You are an autonomous AI coding agent integrated into VS Code. Your goal is to:

1. Monitor the workspace for errors, warnings, and issues
2. Automatically fix problems when confident (>80%)
3. Use Test-Driven Development (TDD) for all code changes
4. Deploy working code to production
5. Request human help when stuck in error loops or low confidence

You should:
- Be precise and minimal in your changes
- Always write tests before implementation
- Verify builds and deployments
- Clearly communicate when you need human intervention

Current capabilities:
- Read and write files
- Run tests
- Build projects
- Deploy to production
- Request human intervention when needed`;
    }
    /**
     * Continue a task after human intervention
     */
    async continueTask() {
        if (!this._currentTask || this._currentTask.status !== 'needs_intervention') {
            vscode.window.showWarningMessage('No task waiting for intervention');
            return;
        }
        this._currentTask.status = 'in_progress';
        this._currentTask.errorCount = 0;
        this._errorLoopCount = 0;
        this._isActive = true;
        await this._executeTask();
    }
    /**
     * Abort the current task
     */
    abortTask() {
        if (this._currentTask) {
            this._currentTask.status = 'failed';
            this._currentTask = undefined;
            vscode.window.showInformationMessage('Task aborted');
        }
        this._errorLoopCount = 0;
    }
}
exports.AutonomousAgentService = AutonomousAgentService;
//# sourceMappingURL=autonomousAgentService.js.map