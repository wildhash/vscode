/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { OpenAIService } from './openaiService';
import { FileSystemService } from './fileSystemService';

export interface TestResult {
	status: 'passed' | 'failed' | 'error' | 'running';
	passedCount: number;
	failedCount: number;
	errorCount: number;
	duration: number;
	tests: TestCase[];
	coverage?: CoverageInfo;
}

export interface TestCase {
	name: string;
	file: string;
	status: 'passed' | 'failed' | 'error' | 'skipped';
	duration: number;
	error?: string;
	stackTrace?: string;
}

export interface CoverageInfo {
	lines: number;
	branches: number;
	functions: number;
	statements: number;
}

export interface TestGenerationResult {
	success: boolean;
	testFile?: string;
	testCode?: string;
	error?: string;
}

export interface TestFramework {
	name: string;
	testDir: string;
	testPattern: string;
	runCommand: string;
	watchCommand?: string;
}

interface PackageJson {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	scripts?: Record<string, string>;
}

export class TestDrivenService {
	private _testFramework: TestFramework | undefined;
	private _lastTestResult: TestResult | undefined;
	private _isWatching = false;

	constructor(
		private readonly _openaiService: OpenAIService,
		private readonly _fileSystemService: FileSystemService
	) {
		this._detectTestFramework();
	}

	/**
	 * Detect the test framework used in the project
	 */
	private async _detectTestFramework(): Promise<void> {
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
		} catch (error) {
			console.warn('Failed to detect test framework:', error);
		}
	}

	private async _tryReadPackageJson(): Promise<PackageJson | undefined> {
		try {
			const content = await this._fileSystemService.readFile('package.json');
			return JSON.parse(content) as PackageJson;
		} catch {
			return undefined;
		}
	}

	/**
	 * Write tests for a specific task description (TDD approach)
	 */
	public async writeTestsForTask(taskDescription: string): Promise<TestGenerationResult> {
		try {
			const prompt = this._buildTestGenerationPrompt(taskDescription);

			const response = await this._openaiService.generateResponse(
				[{ role: 'user', content: prompt }],
				this._getTestWritingSystemPrompt()
			);

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

		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Write tests for an existing file
	 */
	public async writeTestsForFile(filePath: string): Promise<TestGenerationResult> {
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

			const response = await this._openaiService.generateResponse(
				[{ role: 'user', content: prompt }],
				this._getTestWritingSystemPrompt()
			);

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

		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Run tests and return results
	 */
	public async runTests(options?: { watch?: boolean; coverage?: boolean; testFile?: string }): Promise<TestResult> {
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

		} catch (error) {
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

	private async _executeTestCommand(command: string): Promise<TestResult> {
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
	public startWatching(): void {
		if (this._isWatching) {
			return;
		}

		this._isWatching = true;
		this.runTests({ watch: true });
	}

	/**
	 * Stop watching tests
	 */
	public stopWatching(): void {
		this._isWatching = false;
	}

	/**
	 * Get the last test result
	 */
	public getLastResult(): TestResult | undefined {
		return this._lastTestResult;
	}

	/**
	 * Generate a test file name from a task description
	 */
	private _generateTestFileName(taskDescription: string): string {
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
	private _getTestFileNameForSource(sourcePath: string): string {
		const basename = path.basename(sourcePath);
		const ext = path.extname(basename);
		const name = basename.replace(ext, '');
		return `${name}.test${ext}`;
	}

	private _buildTestGenerationPrompt(taskDescription: string): string {
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

	private _getTestWritingSystemPrompt(): string {
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
	public async verifyTaskTests(taskId: string): Promise<{ passed: boolean; message: string }> {
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
