import { ObjectId } from 'mongodb';

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: Date;
	metadata?: {
		isVoice?: boolean;
		platform?: 'vscode' | 'web' | 'mobile';
		confidence?: number;
		tokens?: {
			prompt: number;
			completion: number;
			total: number;
		};
		actions?: Array<{
			type: string;
			parameters: any;
			executed: boolean;
		}>;
	};
}

export interface ConversationSession {
	_id?: ObjectId;
	sessionId: string;
	userId: string;
	aiPersonality: string; // 'omni', 'autonomous_developer', etc.
	platform: 'vscode' | 'web' | 'mobile';

	// Session State
	isActive: boolean;
	startedAt: Date;
	lastActivityAt: Date;
	endedAt?: Date;

	// Conversation Data
	messages: Message[];
	messageCount: number;

	// Context & Memory
	workspaceInfo?: {
		name: string;
		path: string;
		activeFiles: string[];
		projectType: string;
		languages: string[];
	};

	userPreferences?: {
		voiceEnabled: boolean;
		autoSpeak: boolean;
		voiceSpeed: number;
		voicePitch: number;
		preferredModel: string;
		temperature: number;
	};

	// Session Memory & Context
	contextSummary?: string; // AI-generated summary of conversation
	emotionalState?: 'neutral' | 'helpful' | 'excited' | 'focused' | 'curious';
	currentTask?: string; // What the AI is currently helping with
	codebaseContext?: {
		recentFiles: string[];
		currentFocus: string;
		technologies: string[];
	};

	// Analytics
	metrics?: {
		totalTokensUsed: number;
		averageResponseTime: number;
		actionsExecuted: number;
		errorsEncountered: number;
		userSatisfaction?: number; // 1-5 rating
	};

	// Sync across platforms
	syncVersion: number;
	lastSyncedAt: Date;
}

export interface UserProfile {
	_id?: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;

	// Identity
	name?: string;
	email?: string;
	avatar?: string;

	// Preferences
	defaultPreferences: {
		voiceEnabled: boolean;
		autoSpeak: boolean;
		voiceSpeed: number;
		voicePitch: number;
		preferredModel: string;
		temperature: number;
		maxTokens: number;
	};

	// Usage Statistics
	stats: {
		totalSessions: number;
		totalMessages: number;
		totalTokensUsed: number;
		favoriteFeatures: string[];
		averageSessionLength: number;
		platformUsage: {
			vscode: number;
			web: number;
			mobile: number;
		};
	};

	// AI Learning
	learningProfile: {
		codingStyle: string[];
		preferredLanguages: string[];
		workflowPatterns: string[];
		commonTasks: string[];
		expertise_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
	};

	// Cross-session memory
	longTermMemory: {
		key: string;
		value: any;
		importance: number; // 1-10
		lastAccessed: Date;
	}[];
}

export interface AIMemoryEntry {
	_id?: ObjectId;
	userId: string;
	sessionId?: string; // Optional, for session-specific memories

	// Memory Content
	type: 'fact' | 'preference' | 'pattern' | 'context' | 'error' | 'success';
	content: string;
	importance: number; // 1-10, for memory retention
	confidence: number; // 0-1, how sure the AI is about this memory

	// Metadata
	createdAt: Date;
	lastAccessedAt: Date;
	accessCount: number;

	// Relationships
	relatedMemories: string[]; // IDs of related memories
	tags: string[];

	// Context
	context?: {
		workspace?: string;
		file?: string;
		task?: string;
		platform?: string;
	};
}

// Database Collection Names
export const COLLECTIONS = {
	SESSIONS: 'conversation_sessions',
	USERS: 'user_profiles',
	MEMORIES: 'ai_memories',
	ANALYTICS: 'session_analytics'
} as const;

// Utility Types
export type SessionStatus = 'active' | 'paused' | 'ended';
export type MessageRole = Message['role'];
export type Platform = ConversationSession['platform'];
export type EmotionalState = NonNullable<ConversationSession['emotionalState']>;

// Helper functions for creating new instances
export function createNewSession(
	userId: string,
	platform: Platform,
	initialWorkspace?: ConversationSession['workspaceInfo']
): Omit<ConversationSession, '_id'> {
	const now = new Date();

	return {
		sessionId: `session_${userId}_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
		userId,
		aiPersonality: 'autonomous_developer',
		platform,
		isActive: true,
		startedAt: now,
		lastActivityAt: now,
		messages: [],
		messageCount: 0,
		workspaceInfo: initialWorkspace,
		emotionalState: 'neutral',
		syncVersion: 1,
		lastSyncedAt: now,
		metrics: {
			totalTokensUsed: 0,
			averageResponseTime: 0,
			actionsExecuted: 0,
			errorsEncountered: 0
		}
	};
}

export function createMessage(
	role: MessageRole,
	content: string,
	isVoice: boolean = false,
	platform: Platform = 'vscode'
): Message {
	return {
		id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
		role,
		content,
		timestamp: new Date(),
		metadata: {
			isVoice,
			platform
		}
	};
}
