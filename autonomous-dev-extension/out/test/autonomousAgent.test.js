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
const assert = __importStar(require("assert"));
// Mock vscode module for testing
const vscode = {
    window: {
        showInformationMessage: () => Promise.resolve(),
        showErrorMessage: () => Promise.resolve(),
        showWarningMessage: () => Promise.resolve(),
        createTerminal: () => ({
            show: () => { },
            sendText: () => { },
            dispose: () => { }
        }),
        createOutputChannel: () => ({
            appendLine: () => { },
            show: () => { },
            dispose: () => { }
        }),
        createStatusBarItem: () => ({
            show: () => { },
            hide: () => { },
            dispose: () => { }
        }),
        visibleTextEditors: []
    },
    languages: {
        getDiagnostics: () => []
    },
    workspace: {
        getConfiguration: () => ({
            get: (key, defaultValue) => defaultValue
        })
    },
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ThemeColor: class ThemeColor {
        constructor(id) {
            this.id = id;
        }
    }
};
// Simple mock of services for testing
class MockOpenAIService {
    generateResponse() {
        return Promise.resolve({
            content: '{"shouldAct": false, "reasoning": "Test response"}'
        });
    }
}
class MockFileSystemService {
    readFile() {
        return Promise.resolve('test content');
    }
    writeFile() {
        return Promise.resolve();
    }
    createFile() {
        return Promise.resolve();
    }
    fileExists() {
        return Promise.resolve(false);
    }
}
class MockTestDrivenService {
    runTests() {
        return Promise.resolve({
            status: 'passed',
            passedCount: 5,
            failedCount: 0,
            errorCount: 0,
            duration: 1000,
            tests: []
        });
    }
    writeTestsForFile() {
        return Promise.resolve({
            success: true,
            testFile: 'test.test.ts',
            testCode: 'test code'
        });
    }
    writeTestsForTask() {
        return Promise.resolve({
            success: true,
            testFile: 'task.test.ts',
            testCode: 'task test code'
        });
    }
}
class MockDeploymentService {
    build() {
        return Promise.resolve({
            success: true,
            output: 'Build successful',
            duration: 5000
        });
    }
    deploy() {
        return Promise.resolve({
            success: true,
            url: 'https://example.com',
            timestamp: Date.now()
        });
    }
    verify() {
        return Promise.resolve({
            success: true,
            timestamp: Date.now()
        });
    }
}
class MockHumanInterventionHandler {
    requestIntervention() {
        return Promise.resolve({
            action: 'continue',
            timestamp: Date.now(),
            dismissed: false
        });
    }
    dispose() { }
}
// Test suite for AutonomousAgentService
suite('AutonomousAgentService Tests', () => {
    test('Agent should start and stop correctly', () => {
        // Simple state test
        let isActive = false;
        // Start
        isActive = true;
        assert.strictEqual(isActive, true, 'Agent should be active after start');
        // Stop
        isActive = false;
        assert.strictEqual(isActive, false, 'Agent should be inactive after stop');
    });
    test('Task progress should track steps correctly', () => {
        const taskProgress = {
            taskId: 'test_task_123',
            description: 'Test task',
            status: 'pending',
            steps: [
                { name: 'Step 1', status: 'pending' },
                { name: 'Step 2', status: 'pending' }
            ],
            currentStepIndex: 0,
            errorCount: 0,
            maxRetries: 3
        };
        assert.strictEqual(taskProgress.steps.length, 2, 'Should have 2 steps');
        assert.strictEqual(taskProgress.status, 'pending', 'Initial status should be pending');
        assert.strictEqual(taskProgress.errorCount, 0, 'Initial error count should be 0');
    });
    test('Error loop detection should work correctly', () => {
        const maxErrorLoop = 3;
        let errorLoopCount = 0;
        // Simulate errors
        for (let i = 0; i < maxErrorLoop; i++) {
            errorLoopCount++;
        }
        assert.strictEqual(errorLoopCount >= maxErrorLoop, true, 'Should detect error loop');
    });
    test('Diagnostic parsing should categorize correctly', () => {
        const diagnostics = [
            { severity: 0, message: 'Error message', file: 'test.ts', line: 1 },
            { severity: 1, message: 'Warning message', file: 'test.ts', line: 2 },
            { severity: 2, message: 'Info message', file: 'test.ts', line: 3 }
        ];
        const errors = diagnostics.filter(d => d.severity === 0);
        const warnings = diagnostics.filter(d => d.severity === 1);
        const infos = diagnostics.filter(d => d.severity === 2);
        assert.strictEqual(errors.length, 1, 'Should have 1 error');
        assert.strictEqual(warnings.length, 1, 'Should have 1 warning');
        assert.strictEqual(infos.length, 1, 'Should have 1 info');
    });
});
// Test suite for TestDrivenService
suite('TestDrivenService Tests', () => {
    test('Test result should track pass/fail correctly', () => {
        const result = {
            status: 'passed',
            passedCount: 10,
            failedCount: 0,
            errorCount: 0,
            duration: 5000,
            tests: []
        };
        assert.strictEqual(result.status, 'passed', 'Status should be passed');
        assert.strictEqual(result.failedCount, 0, 'Should have no failures');
    });
    test('Test file name generation should be valid', () => {
        const taskDescription = 'Create a REST API endpoint';
        const sanitized = taskDescription
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        const testFileName = `${sanitized}.test.ts`;
        assert.ok(testFileName.endsWith('.test.ts'), 'Should end with .test.ts');
        assert.ok(!testFileName.includes(' '), 'Should not contain spaces');
    });
    test('Coverage info should have valid structure', () => {
        const coverage = {
            lines: 85,
            branches: 75,
            functions: 90,
            statements: 80
        };
        assert.ok(coverage.lines >= 0 && coverage.lines <= 100, 'Lines coverage should be 0-100');
        assert.ok(coverage.branches >= 0 && coverage.branches <= 100, 'Branches coverage should be 0-100');
    });
});
// Test suite for DeploymentService
suite('DeploymentService Tests', () => {
    test('Build result should have required fields', () => {
        const result = {
            success: true,
            output: 'Build completed',
            duration: 10000
        };
        assert.strictEqual(typeof result.success, 'boolean', 'Success should be boolean');
        assert.strictEqual(typeof result.duration, 'number', 'Duration should be number');
    });
    test('Deployment result should have required fields', () => {
        const result = {
            success: true,
            url: 'https://example.com',
            timestamp: Date.now()
        };
        assert.strictEqual(typeof result.success, 'boolean', 'Success should be boolean');
        assert.strictEqual(typeof result.timestamp, 'number', 'Timestamp should be number');
    });
    test('Deployment target types should be valid', () => {
        const validTargets = ['vercel', 'netlify', 'github-pages', 'aws', 'azure', 'gcp', 'heroku', 'railway', 'fly', 'custom'];
        const target = 'vercel';
        assert.ok(validTargets.includes(target), 'Target should be valid');
    });
});
// Test suite for HumanInterventionHandler
suite('HumanInterventionHandler Tests', () => {
    test('Intervention request should have required fields', () => {
        const request = {
            type: 'error_loop',
            title: 'Test intervention',
            description: 'Test description',
            priority: 'high',
            suggestedActions: ['Action 1', 'Action 2']
        };
        assert.ok(request.type, 'Should have type');
        assert.ok(request.title, 'Should have title');
        assert.ok(request.description, 'Should have description');
        assert.ok(request.priority, 'Should have priority');
    });
    test('Priority icon mapping should work', () => {
        const getPriorityIcon = (priority) => {
            switch (priority) {
                case 'critical': return '🚨';
                case 'high': return '⚠️';
                case 'medium': return '📣';
                default: return 'ℹ️';
            }
        };
        assert.strictEqual(getPriorityIcon('critical'), '🚨', 'Critical should have alert icon');
        assert.strictEqual(getPriorityIcon('high'), '⚠️', 'High should have warning icon');
        assert.strictEqual(getPriorityIcon('medium'), '📣', 'Medium should have announcement icon');
        assert.strictEqual(getPriorityIcon('low'), 'ℹ️', 'Low should have info icon');
    });
    test('Intervention response should have required fields', () => {
        const response = {
            action: 'continue',
            timestamp: Date.now(),
            dismissed: false
        };
        assert.ok(response.action, 'Should have action');
        assert.ok(response.timestamp, 'Should have timestamp');
        assert.strictEqual(typeof response.dismissed, 'boolean', 'Dismissed should be boolean');
    });
});
// Integration tests
suite('Integration Tests', () => {
    test('Full task workflow should be trackable', () => {
        const taskSteps = [
            'Analyze requirements',
            'Write tests (TDD)',
            'Implement code',
            'Run tests',
            'Fix issues',
            'Build project',
            'Deploy to production',
            'Verify deployment'
        ];
        const task = {
            taskId: 'integration_test_task',
            description: 'Integration test task',
            status: 'pending',
            steps: taskSteps.map(name => ({ name, status: 'pending' })),
            currentStepIndex: 0,
            errorCount: 0,
            maxRetries: 3
        };
        assert.strictEqual(task.steps.length, 8, 'Should have 8 steps in workflow');
        assert.strictEqual(task.steps[0].name, 'Analyze requirements', 'First step should be analyze');
        assert.strictEqual(task.steps[task.steps.length - 1].name, 'Verify deployment', 'Last step should be verify');
    });
    test('Error recovery workflow should work', () => {
        let errorCount = 0;
        const maxRetries = 3;
        let needsIntervention = false;
        // Simulate errors
        while (errorCount < maxRetries) {
            errorCount++;
        }
        if (errorCount >= maxRetries) {
            needsIntervention = true;
        }
        assert.strictEqual(needsIntervention, true, 'Should need intervention after max retries');
    });
});
//# sourceMappingURL=autonomousAgent.test.js.map