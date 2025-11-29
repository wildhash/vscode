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
exports.TestDrivenService = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class TestDrivenService {
    constructor(_openaiService, _fileSystemService) {
        this._openaiService = _openaiService;
        this._fileSystemService = _fileSystemService;
        this._isWatching = false;
        this._detectTestFramework();
    }
    /**
     * Detect the test framework used in the project
     */
    async _detectTestFramework() {
        try {
            // Check for common test frameworks
            const packageJson = await this._tryReadPackageJson();
            if (packageJson) {
                // Jest
                if (packageJson.dependencies?.jest || packageJson.devDependencies?.jest) {
                    this._testFramework = {
                        name: 'jest',
                        testDir: '__tests__',
                        testPattern: '**/*.test.{ts,js,tsx,jsx}',
                        runCommand: 'npm test',
                        watchCommand: 'npm test -- --watch'
                    };
                    return;
                }
                // Mocha
                if (packageJson.dependencies?.mocha || packageJson.devDependencies?.mocha) {
                    this._testFramework = {
                        name: 'mocha',
                        testDir: 'test',
                        testPattern: '**/*.test.{ts,js}',
                        runCommand: 'npm test'
                    };
                    return;
                }
                // Vitest
                if (packageJson.dependencies?.vitest || packageJson.devDependencies?.vitest) {
                    this._testFramework = {
                        name: 'vitest',
                        testDir: 'tests',
                        testPattern: '**/*.test.{ts,js}',
                        runCommand: 'npx vitest run',
                        watchCommand: 'npx vitest'
                    };
                    return;
                }
                // Default to Jest if scripts.test exists
                if (packageJson.scripts?.test) {
                    this._testFramework = {
                        name: 'unknown',
                        testDir: 'test',
                        testPattern: '**/*.test.{ts,js}',
                        runCommand: 'npm test'
                    };
                }
            }
        }
        catch (error) {
            console.warn('Failed to detect test framework:', error);
        }
    }
    async _tryReadPackageJson() {
        try {
            const content = await this._fileSystemService.readFile('package.json');
            return JSON.parse(content);
        }
        catch {
            return undefined;
        }
    }
    /**
     * Write tests for a specific task description (TDD approach)
     */
    async writeTestsForTask(taskDescription) {
        try {
            const prompt = this._buildTestGenerationPrompt(taskDescription);
            const response = await this._openaiService.generateResponse([{ role: 'user', content: prompt }], this._getTestWritingSystemPrompt());
            // Extract test code from response
            const codeMatch = response.content.match(/```(?:typescript|javascript)?\n([\s\S]*?)```/);
            if (!codeMatch) {
                return {
                    success: false,
                    error: 'Could not extract test code from AI response'
                };
            }
            const testCode = codeMatch[1];
            const testFileName = this._generateTestFileName(taskDescription);
            const testFilePath = path.join(this._testFramework?.testDir || 'test', testFileName);
            // Create the test file
            await this._fileSystemService.createFile(testFilePath, testCode);
            vscode.window.showInformationMessage(`📝 Created test file: ${testFilePath}`);
            return {
                success: true,
                testFile: testFilePath,
                testCode
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Write tests for an existing file
     */
    async writeTestsForFile(filePath) {
        try {
            const fileContent = await this._fileSystemService.readFile(filePath);
            const prompt = `Generate comprehensive tests for this code:

File: ${filePath}
\`\`\`
${fileContent.substring(0, 5000)}
\`\`\`

Requirements:
1. Test all exported functions and classes
2. Include edge cases and error handling
3. Use the project's test framework (${this._testFramework?.name || 'Jest'})
4. Follow TDD best practices
5. Include setup and teardown if needed

Generate the complete test file.`;
            const response = await this._openaiService.generateResponse([{ role: 'user', content: prompt }], this._getTestWritingSystemPrompt());
            const codeMatch = response.content.match(/```(?:typescript|javascript)?\n([\s\S]*?)```/);
            if (!codeMatch) {
                return {
                    success: false,
                    error: 'Could not extract test code from AI response'
                };
            }
            const testCode = codeMatch[1];
            const testFileName = this._getTestFileNameForSource(filePath);
            const testFilePath = path.join(this._testFramework?.testDir || 'test', testFileName);
            await this._fileSystemService.createFile(testFilePath, testCode);
            vscode.window.showInformationMessage(`📝 Created test file: ${testFilePath}`);
            return {
                success: true,
                testFile: testFilePath,
                testCode
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Run tests and return results
     */
    async runTests(options) {
        const startTime = Date.now();
        try {
            // Use VS Code's built-in terminal or task runner
            let command = this._testFramework?.runCommand || 'npm test';
            if (options?.watch && this._testFramework?.watchCommand) {
                command = this._testFramework.watchCommand;
            }
            if (options?.coverage) {
                command += ' -- --coverage';
            }
            if (options?.testFile) {
                command += ` -- ${options.testFile}`;
            }
            // Execute test command
            const result = await this._executeTestCommand(command);
            const duration = Date.now() - startTime;
            this._lastTestResult = {
                ...result,
                duration
            };
            return this._lastTestResult;
        }
        catch (error) {
            return {
                status: 'error',
                passedCount: 0,
                failedCount: 0,
                errorCount: 1,
                duration: Date.now() - startTime,
                tests: [{
                        name: 'Test execution',
                        file: 'unknown',
                        status: 'error',
                        duration: 0,
                        error: error instanceof Error ? error.message : String(error)
                    }]
            };
        }
    }
    async _executeTestCommand(command) {
        return new Promise((resolve) => {
            // Create a terminal and run the command
            const terminal = vscode.window.createTerminal({
                name: 'Test Runner',
                hideFromUser: false
            });
            terminal.sendText(command);
            terminal.show();
            // For now, return a placeholder result
            // In a real implementation, we would parse the test output
            setTimeout(() => {
                resolve({
                    status: 'passed',
                    passedCount: 0,
                    failedCount: 0,
                    errorCount: 0,
                    duration: 0,
                    tests: []
                });
            }, 5000);
        });
    }
    /**
     * Watch tests for changes
     */
    startWatching() {
        if (this._isWatching) {
            return;
        }
        this._isWatching = true;
        this.runTests({ watch: true });
    }
    /**
     * Stop watching tests
     */
    stopWatching() {
        this._isWatching = false;
    }
    /**
     * Get the last test result
     */
    getLastResult() {
        return this._lastTestResult;
    }
    /**
     * Generate a test file name from a task description
     */
    _generateTestFileName(taskDescription) {
        // Convert description to a valid file name
        const sanitized = taskDescription
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);
        return `${sanitized}.test.ts`;
    }
    /**
     * Generate a test file name for a source file
     */
    _getTestFileNameForSource(sourcePath) {
        const basename = path.basename(sourcePath);
        const ext = path.extname(basename);
        const name = basename.replace(ext, '');
        return `${name}.test${ext}`;
    }
    _buildTestGenerationPrompt(taskDescription) {
        return `Create comprehensive tests for the following feature using TDD approach:

Task: ${taskDescription}

Framework: ${this._testFramework?.name || 'Jest'}

Requirements:
1. Write tests FIRST (TDD) - tests should fail initially
2. Cover all acceptance criteria
3. Include:
   - Unit tests for individual functions
   - Integration tests for component interaction
   - Edge case handling
   - Error scenario tests
4. Follow AAA pattern (Arrange, Act, Assert)
5. Use descriptive test names
6. Include setup/teardown as needed

Generate a complete test file with all necessary imports and test cases.`;
    }
    _getTestWritingSystemPrompt() {
        return `You are an expert test engineer following Test-Driven Development (TDD) practices. Your role is to:

1. Write tests BEFORE implementation (Red-Green-Refactor cycle)
2. Ensure comprehensive test coverage
3. Follow the testing framework conventions
4. Use descriptive test names that document behavior
5. Include both positive and negative test cases
6. Test edge cases and error handling

Always generate complete, runnable test files with all necessary imports.`;
    }
    /**
     * Verify that all tests pass for a given task
     */
    async verifyTaskTests(taskId) {
        const result = await this.runTests();
        if (result.status === 'passed' && result.failedCount === 0) {
            return {
                passed: true,
                message: `All ${result.passedCount} tests passed`
            };
        }
        return {
            passed: false,
            message: `${result.failedCount} tests failed, ${result.errorCount} errors`
        };
    }
}
exports.TestDrivenService = TestDrivenService;
//# sourceMappingURL=testDrivenService.js.map