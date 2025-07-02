/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';

export interface FileInfo {
	name: string;
	path: string;
	isDirectory: boolean;
	size?: number;
	lastModified?: Date;
}

export interface WorkspaceInfo {
	name: string;
	rootPath: string;
	files: FileInfo[];
	openFiles: string[];
	activeFile?: string;
}

export class FileSystemService {

	public async readFile(filePath: string): Promise<string> {
		try {
			// Handle both absolute and relative paths
			const uri = this._getFileUri(filePath);
			const content = await vscode.workspace.fs.readFile(uri);
			return Buffer.from(content).toString('utf8');
		} catch (error) {
			throw new Error(`Failed to read file ${filePath}: ${error}`);
		}
	}

	public async writeFile(filePath: string, content: string): Promise<void> {
		try {
			const uri = this._getFileUri(filePath);
			const contentBytes = Buffer.from(content, 'utf8');
			await vscode.workspace.fs.writeFile(uri, contentBytes);
		} catch (error) {
			throw new Error(`Failed to write file ${filePath}: ${error}`);
		}
	}

	public async createFile(filePath: string, content: string = ''): Promise<void> {
		try {
			const uri = this._getFileUri(filePath);

			// Create directory if it doesn't exist
			const dirUri = vscode.Uri.joinPath(uri, '..');
			try {
				await vscode.workspace.fs.createDirectory(dirUri);
			} catch {
				// Directory might already exist
			}

			const contentBytes = Buffer.from(content, 'utf8');
			await vscode.workspace.fs.writeFile(uri, contentBytes);
		} catch (error) {
			throw new Error(`Failed to create file ${filePath}: ${error}`);
		}
	}

	public async deleteFile(filePath: string): Promise<void> {
		try {
			const uri = this._getFileUri(filePath);
			await vscode.workspace.fs.delete(uri);
		} catch (error) {
			throw new Error(`Failed to delete file ${filePath}: ${error}`);
		}
	}

	public async fileExists(filePath: string): Promise<boolean> {
		try {
			const uri = this._getFileUri(filePath);
			await vscode.workspace.fs.stat(uri);
			return true;
		} catch {
			return false;
		}
	}

	public async listFiles(dirPath: string = '', maxDepth: number = 2): Promise<FileInfo[]> {
		const workspaceFolder = this._getWorkspaceRoot();
		if (!workspaceFolder) {
			return [];
		}

		const targetUri = dirPath
			? vscode.Uri.joinPath(workspaceFolder, dirPath)
			: workspaceFolder;

		return this._listFilesRecursive(targetUri, maxDepth, 0);
	}

	private async _listFilesRecursive(uri: vscode.Uri, maxDepth: number, currentDepth: number): Promise<FileInfo[]> {
		if (currentDepth >= maxDepth) {
			return [];
		}

		try {
			const entries = await vscode.workspace.fs.readDirectory(uri);
			const files: FileInfo[] = [];

			for (const [name, type] of entries) {
				// Skip hidden files and common ignore patterns
				if (name.startsWith('.') || name === 'node_modules' || name === 'dist' || name === 'out') {
					continue;
				}

				const itemUri = vscode.Uri.joinPath(uri, name);
				const isDirectory = type === vscode.FileType.Directory;

				const fileInfo: FileInfo = {
					name,
					path: vscode.workspace.asRelativePath(itemUri),
					isDirectory
				};

				if (!isDirectory) {
					try {
						const stat = await vscode.workspace.fs.stat(itemUri);
						fileInfo.size = stat.size;
						fileInfo.lastModified = new Date(stat.mtime);
					} catch {
						// Ignore stat errors
					}
				}

				files.push(fileInfo);

				// Recursively list subdirectories
				if (isDirectory && currentDepth < maxDepth - 1) {
					const subFiles = await this._listFilesRecursive(itemUri, maxDepth, currentDepth + 1);
					files.push(...subFiles);
				}
			}

			return files;
		} catch (error) {
			console.warn(`Failed to list files in ${uri.fsPath}:`, error);
			return [];
		}
	}

	public async getWorkspaceInfo(): Promise<WorkspaceInfo> {
		const workspaceFolder = this._getWorkspaceRoot();
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		const files = await this.listFiles('', 3);
		const openFiles = vscode.workspace.textDocuments
			.filter(doc => !doc.isUntitled)
			.map(doc => vscode.workspace.asRelativePath(doc.uri));

		const activeFile = vscode.window.activeTextEditor
			? vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.uri)
			: undefined;

		return {
			name: path.basename(workspaceFolder.fsPath),
			rootPath: workspaceFolder.fsPath,
			files,
			openFiles,
			activeFile
		};
	}

	public async openFile(filePath: string): Promise<void> {
		try {
			const uri = this._getFileUri(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document);
		} catch (error) {
			throw new Error(`Failed to open file ${filePath}: ${error}`);
		}
	}

	public async getActiveFileContent(): Promise<string | null> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return null;
		}
		return activeEditor.document.getText();
	}

	public async getActiveFilePath(): Promise<string | null> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			return null;
		}
		return vscode.workspace.asRelativePath(activeEditor.document.uri);
	}

	public async insertTextAtCursor(text: string): Promise<void> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			throw new Error('No active editor');
		}

		await activeEditor.edit(editBuilder => {
			editBuilder.insert(activeEditor.selection.active, text);
		});
	}

	public async replaceSelection(text: string): Promise<void> {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			throw new Error('No active editor');
		}

		await activeEditor.edit(editBuilder => {
			editBuilder.replace(activeEditor.selection, text);
		});
	}

	private _getFileUri(filePath: string): vscode.Uri {
		if (path.isAbsolute(filePath)) {
			return vscode.Uri.file(filePath);
		}

		const workspaceFolder = this._getWorkspaceRoot();
		if (!workspaceFolder) {
			throw new Error('No workspace folder open');
		}

		return vscode.Uri.joinPath(workspaceFolder, filePath);
	}

	private _getWorkspaceRoot(): vscode.Uri | undefined {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		return workspaceFolders && workspaceFolders.length > 0
			? workspaceFolders[0].uri
			: undefined;
	}
}
