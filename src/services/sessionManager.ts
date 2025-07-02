/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ChatMessage } from './openaiService';

export interface ChatSession {
	id: string;
	name: string;
	messages: ChatMessage[];
	createdAt: number;
	lastUpdated: number;
	workspaceId?: string;
}

export class SessionManager {
	private _currentSession: ChatSession;
	private _sessions: Map<string, ChatSession> = new Map();
	private _context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;
		this._currentSession = this._createNewSession();
		this._loadSessions();
	}

	public getSession(): ChatSession {
		return this._currentSession;
	}

	public addMessage(role: 'user' | 'assistant', content: string): void {
		const message: ChatMessage = {
			role,
			content,
			timestamp: Date.now()
		};

		this._currentSession.messages.push(message);
		this._currentSession.lastUpdated = Date.now();
		this._saveSessions();
	}

	public getMessages(): ChatMessage[] {
		return [...this._currentSession.messages];
	}

	public clearHistory(): void {
		this._currentSession.messages = [];
		this._currentSession.lastUpdated = Date.now();
		this._saveSessions();
	}

	public createNewSession(name?: string): ChatSession {
		// Save current session
		this._sessions.set(this._currentSession.id, this._currentSession);

		// Create new session
		this._currentSession = this._createNewSession(name);
		this._saveSessions();

		return this._currentSession;
	}

	public switchToSession(sessionId: string): ChatSession | null {
		const session = this._sessions.get(sessionId);
		if (session) {
			// Save current session
			this._sessions.set(this._currentSession.id, this._currentSession);

			// Switch to requested session
			this._currentSession = session;
			this._saveSessions();

			return session;
		}
		return null;
	}

	public getAllSessions(): ChatSession[] {
		const allSessions = Array.from(this._sessions.values());
		allSessions.push(this._currentSession);
		return allSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
	}

	public deleteSession(sessionId: string): boolean {
		if (sessionId === this._currentSession.id) {
			// Can't delete current session, create new one instead
			this._currentSession = this._createNewSession();
			this._saveSessions();
			return true;
		}

		const deleted = this._sessions.delete(sessionId);
		if (deleted) {
			this._saveSessions();
		}
		return deleted;
	}

	public saveSession(session: ChatSession): void {
		if (session.id === this._currentSession.id) {
			this._currentSession = session;
		} else {
			this._sessions.set(session.id, session);
		}
		this._saveSessions();
	}

	public exportSession(sessionId?: string): string {
		const session = sessionId
			? this._sessions.get(sessionId) || this._currentSession
			: this._currentSession;

		return JSON.stringify(session, null, 2);
	}

	public importSession(sessionData: string): ChatSession | null {
		try {
			const session: ChatSession = JSON.parse(sessionData);

			// Validate session structure
			if (!session.id || !session.messages || !Array.isArray(session.messages)) {
				throw new Error('Invalid session format');
			}

			// Generate new ID to avoid conflicts
			session.id = this._generateSessionId();
			session.lastUpdated = Date.now();

			this._sessions.set(session.id, session);
			this._saveSessions();

			return session;
		} catch (error) {
			console.error('Failed to import session:', error);
			return null;
		}
	}

	private _createNewSession(name?: string): ChatSession {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const workspaceId = workspaceFolder ? workspaceFolder.uri.fsPath : undefined;

		return {
			id: this._generateSessionId(),
			name: name || this._generateSessionName(),
			messages: [],
			createdAt: Date.now(),
			lastUpdated: Date.now(),
			workspaceId
		};
	}

	private _generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private _generateSessionName(): string {
		const now = new Date();
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const workspaceName = workspaceFolder ? vscode.workspace.name || 'Workspace' : 'Chat';

		return `${workspaceName} - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
	}

	private _loadSessions(): void {
		try {
			const sessionsData = this._context.globalState.get<string>('chatSessions');
			if (sessionsData) {
				const sessions: ChatSession[] = JSON.parse(sessionsData);
				sessions.forEach(session => {
					this._sessions.set(session.id, session);
				});

				// Load the most recent session as current
				const sortedSessions = sessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
				if (sortedSessions.length > 0) {
					this._currentSession = sortedSessions[0];
					this._sessions.delete(this._currentSession.id);
				}
			}
		} catch (error) {
			console.error('Failed to load sessions:', error);
			// Continue with new session
		}
	}

	private _saveSessions(): void {
		try {
			const allSessions = Array.from(this._sessions.values());
			allSessions.push(this._currentSession);

			// Keep only the last 50 sessions to prevent storage bloat
			const recentSessions = allSessions
				.sort((a, b) => b.lastUpdated - a.lastUpdated)
				.slice(0, 50);

			const sessionsData = JSON.stringify(recentSessions);
			this._context.globalState.update('chatSessions', sessionsData);
		} catch (error) {
			console.error('Failed to save sessions:', error);
		}
	}

	public getSessionStats(): { totalSessions: number; totalMessages: number; currentSessionMessages: number } {
		const allSessions = this.getAllSessions();
		const totalMessages = allSessions.reduce((sum, session) => sum + session.messages.length, 0);

		return {
			totalSessions: allSessions.length,
			totalMessages,
			currentSessionMessages: this._currentSession.messages.length
		};
	}

	public searchSessions(query: string): ChatSession[] {
		const allSessions = this.getAllSessions();
		const lowerQuery = query.toLowerCase();

		return allSessions.filter(session => {
			// Search in session name
			if (session.name.toLowerCase().includes(lowerQuery)) {
				return true;
			}

			// Search in message content
			return session.messages.some(message =>
				message.content.toLowerCase().includes(lowerQuery)
			);
		});
	}
}
