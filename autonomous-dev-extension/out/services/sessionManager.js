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
exports.SessionManager = void 0;
const vscode = __importStar(require("vscode"));
class SessionManager {
    constructor(context) {
        this._sessions = new Map();
        this._context = context;
        this._currentSession = this._createNewSession();
        this._loadSessions();
    }
    getSession() {
        return this._currentSession;
    }
    addMessage(role, content) {
        const message = {
            role,
            content,
            timestamp: Date.now()
        };
        this._currentSession.messages.push(message);
        this._currentSession.lastUpdated = Date.now();
        this._saveSessions();
    }
    getMessages() {
        return [...this._currentSession.messages];
    }
    clearHistory() {
        this._currentSession.messages = [];
        this._currentSession.lastUpdated = Date.now();
        this._saveSessions();
    }
    createNewSession(name) {
        // Save current session
        this._sessions.set(this._currentSession.id, this._currentSession);
        // Create new session
        this._currentSession = this._createNewSession(name);
        this._saveSessions();
        return this._currentSession;
    }
    switchToSession(sessionId) {
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
    getAllSessions() {
        const allSessions = Array.from(this._sessions.values());
        allSessions.push(this._currentSession);
        return allSessions.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }
    deleteSession(sessionId) {
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
    saveSession(session) {
        if (session.id === this._currentSession.id) {
            this._currentSession = session;
        }
        else {
            this._sessions.set(session.id, session);
        }
        this._saveSessions();
    }
    exportSession(sessionId) {
        const session = sessionId
            ? this._sessions.get(sessionId) || this._currentSession
            : this._currentSession;
        return JSON.stringify(session, null, 2);
    }
    importSession(sessionData) {
        try {
            const session = JSON.parse(sessionData);
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
        }
        catch (error) {
            console.error('Failed to import session:', error);
            return null;
        }
    }
    _createNewSession(name) {
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
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    _generateSessionName() {
        const now = new Date();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const workspaceName = workspaceFolder ? vscode.workspace.name || 'Workspace' : 'Chat';
        return `${workspaceName} - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    }
    _loadSessions() {
        try {
            const sessionsData = this._context.globalState.get('chatSessions');
            if (sessionsData) {
                const sessions = JSON.parse(sessionsData);
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
        }
        catch (error) {
            console.error('Failed to load sessions:', error);
            // Continue with new session
        }
    }
    _saveSessions() {
        try {
            const allSessions = Array.from(this._sessions.values());
            allSessions.push(this._currentSession);
            // Keep only the last 50 sessions to prevent storage bloat
            const recentSessions = allSessions
                .sort((a, b) => b.lastUpdated - a.lastUpdated)
                .slice(0, 50);
            const sessionsData = JSON.stringify(recentSessions);
            this._context.globalState.update('chatSessions', sessionsData);
        }
        catch (error) {
            console.error('Failed to save sessions:', error);
        }
    }
    getSessionStats() {
        const allSessions = this.getAllSessions();
        const totalMessages = allSessions.reduce((sum, session) => sum + session.messages.length, 0);
        return {
            totalSessions: allSessions.length,
            totalMessages,
            currentSessionMessages: this._currentSession.messages.length
        };
    }
    searchSessions(query) {
        const allSessions = this.getAllSessions();
        const lowerQuery = query.toLowerCase();
        return allSessions.filter(session => {
            // Search in session name
            if (session.name.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            // Search in message content
            return session.messages.some(message => message.content.toLowerCase().includes(lowerQuery));
        });
    }
}
exports.SessionManager = SessionManager;
//# sourceMappingURL=sessionManager.js.map