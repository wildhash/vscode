import { MongoClient, Db, Collection } from 'mongodb';
import { config } from '../config/environment';
import {
	ConversationSession,
	UserProfile,
	AIMemoryEntry,
	Message,
	COLLECTIONS,
	createNewSession,
	createMessage,
	Platform
} from '../models/conversation';

export class MemoryStore {
	private client: MongoClient;
	private db: Db;
	private isConnected: boolean = false;

	constructor() {
		this.client = new MongoClient(config.mongodbUri);
	}

	/**
	 * Connect to MongoDB
	 */
	async connect(): Promise<void> {
		try {
			await this.client.connect();
			this.db = this.client.db(config.mongodbDbName);

			// Create indexes for performance
			await this.createIndexes();

			this.isConnected = true;
			console.log('✅ Connected to MongoDB');
		} catch (error) {
			console.error('❌ Failed to connect to MongoDB:', error);
			throw error;
		}
	}

	/**
	 * Disconnect from MongoDB
	 */
	async disconnect(): Promise<void> {
		if (this.isConnected) {
			await this.client.close();
			this.isConnected = false;
			console.log('📴 Disconnected from MongoDB');
		}
	}

	/**
	 * Create database indexes for performance
	 */
	private async createIndexes(): Promise<void> {
		const sessionsCollection = this.db.collection(COLLECTIONS.SESSIONS);
		const usersCollection = this.db.collection(COLLECTIONS.USERS);
		const memoriesCollection = this.db.collection(COLLECTIONS.MEMORIES);

		// Session indexes
		await sessionsCollection.createIndex({ userId: 1, isActive: 1 });
		await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
		await sessionsCollection.createIndex({ lastActivityAt: 1 });
		await sessionsCollection.createIndex({ platform: 1, userId: 1 });

		// User indexes
		await usersCollection.createIndex({ userId: 1 }, { unique: true });

		// Memory indexes
		await memoriesCollection.createIndex({ userId: 1, importance: -1 });
		await memoriesCollection.createIndex({ type: 1, userId: 1 });
		await memoriesCollection.createIndex({ tags: 1 });
		await memoriesCollection.createIndex({ lastAccessedAt: 1 });
	}

	// ================== SESSION MANAGEMENT ==================

	/**
	 * Create a new conversation session
	 */
	async createSession(
		userId: string,
		platform: Platform,
		workspaceInfo?: ConversationSession['workspaceInfo']
	): Promise<ConversationSession> {
		const session = createNewSession(userId, platform, workspaceInfo);

		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);
		const result = await collection.insertOne(session);

		return { ...session, _id: result.insertedId };
	}

	/**
	 * Get active session for user and platform
	 */
	async getActiveSession(userId: string, platform: Platform): Promise<ConversationSession | null> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		return await collection.findOne({
			userId,
			platform,
			isActive: true
		}, {
			sort: { lastActivityAt: -1 }
		});
	}

	/**
	 * Get session by ID
	 */
	async getSession(sessionId: string): Promise<ConversationSession | null> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);
		return await collection.findOne({ sessionId });
	}

	/**
	 * Update session with new message
	 */
	async addMessageToSession(sessionId: string, message: Message): Promise<void> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		await collection.updateOne(
			{ sessionId },
			{
				$push: { messages: message },
				$inc: { messageCount: 1 },
				$set: {
					lastActivityAt: new Date(),
					syncVersion: { $add: ['$syncVersion', 1] }
				}
			}
		);
	}

	/**
	 * Update session context and metadata
	 */
	async updateSession(sessionId: string, updates: Partial<ConversationSession>): Promise<void> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		await collection.updateOne(
			{ sessionId },
			{
				$set: {
					...updates,
					lastActivityAt: new Date(),
					syncVersion: { $add: ['$syncVersion', 1] }
				}
			}
		);
	}

	/**
	 * End a session
	 */
	async endSession(sessionId: string): Promise<void> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		await collection.updateOne(
			{ sessionId },
			{
				$set: {
					isActive: false,
					endedAt: new Date(),
					lastActivityAt: new Date()
				}
			}
		);
	}

	/**
	 * Get recent sessions for user
	 */
	async getRecentSessions(userId: string, limit: number = 10): Promise<ConversationSession[]> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		return await collection.find(
			{ userId },
			{ sort: { lastActivityAt: -1 }, limit }
		).toArray();
	}

	// ================== USER PROFILE MANAGEMENT ==================

	/**
	 * Create or update user profile
	 */
	async upsertUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
		const collection = this.db.collection<UserProfile>(COLLECTIONS.USERS);

		const now = new Date();
		const defaultProfile: Partial<UserProfile> = {
			userId,
			createdAt: now,
			updatedAt: now,
			defaultPreferences: {
				voiceEnabled: true,
				autoSpeak: true,
				voiceSpeed: 1.0,
				voicePitch: 1.0,
				preferredModel: 'gpt-4o',
				temperature: 0.7,
				maxTokens: 4096
			},
			stats: {
				totalSessions: 0,
				totalMessages: 0,
				totalTokensUsed: 0,
				favoriteFeatures: [],
				averageSessionLength: 0,
				platformUsage: {
					vscode: 0,
					web: 0,
					mobile: 0
				}
			},
			learningProfile: {
				codingStyle: [],
				preferredLanguages: [],
				workflowPatterns: [],
				commonTasks: [],
				expertise_level: 'intermediate'
			},
			longTermMemory: []
		};

		const result = await collection.findOneAndUpdate(
			{ userId },
			{
				$setOnInsert: defaultProfile,
				$set: { ...profileData, updatedAt: now }
			},
			{ upsert: true, returnDocument: 'after' }
		);

		return result!;
	}

	/**
	 * Get user profile
	 */
	async getUserProfile(userId: string): Promise<UserProfile | null> {
		const collection = this.db.collection<UserProfile>(COLLECTIONS.USERS);
		return await collection.findOne({ userId });
	}

	/**
	 * Update user stats
	 */
	async updateUserStats(userId: string, stats: Partial<UserProfile['stats']>): Promise<void> {
		const collection = this.db.collection<UserProfile>(COLLECTIONS.USERS);

		await collection.updateOne(
			{ userId },
			{
				$inc: stats,
				$set: { updatedAt: new Date() }
			}
		);
	}

	// ================== AI MEMORY MANAGEMENT ==================

	/**
	 * Store AI memory entry
	 */
	async storeMemory(memory: Omit<AIMemoryEntry, '_id'>): Promise<AIMemoryEntry> {
		const collection = this.db.collection<AIMemoryEntry>(COLLECTIONS.MEMORIES);

		const memoryEntry: AIMemoryEntry = {
			...memory,
			createdAt: new Date(),
			lastAccessedAt: new Date(),
			accessCount: 1
		};

		const result = await collection.insertOne(memoryEntry);
		return { ...memoryEntry, _id: result.insertedId };
	}

	/**
	 * Get relevant memories for context
	 */
	async getRelevantMemories(
		userId: string,
		context?: string,
		tags?: string[],
		limit: number = 10
	): Promise<AIMemoryEntry[]> {
		const collection = this.db.collection<AIMemoryEntry>(COLLECTIONS.MEMORIES);

		const query: any = { userId };

		if (context) {
			query.$text = { $search: context };
		}

		if (tags && tags.length > 0) {
			query.tags = { $in: tags };
		}

		const memories = await collection.find(query)
			.sort({ importance: -1, lastAccessedAt: -1 })
			.limit(limit)
			.toArray();

		// Update access tracking
		if (memories.length > 0) {
			const memoryIds = memories.map(m => m._id);
			await collection.updateMany(
				{ _id: { $in: memoryIds } },
				{
					$set: { lastAccessedAt: new Date() },
					$inc: { accessCount: 1 }
				}
			);
		}

		return memories;
	}

	/**
	 * Update memory importance based on usage
	 */
	async updateMemoryImportance(memoryId: string, importanceChange: number): Promise<void> {
		const collection = this.db.collection<AIMemoryEntry>(COLLECTIONS.MEMORIES);

		await collection.updateOne(
			{ _id: memoryId },
			{
				$inc: { importance: importanceChange },
				$set: { lastAccessedAt: new Date() }
			}
		);
	}

	/**
	 * Clean up old, low-importance memories
	 */
	async cleanupOldMemories(userId: string, maxAge: number = 90): Promise<number> {
		const collection = this.db.collection<AIMemoryEntry>(COLLECTIONS.MEMORIES);

		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - maxAge);

		const result = await collection.deleteMany({
			userId,
			importance: { $lt: 3 },
			lastAccessedAt: { $lt: cutoffDate }
		});

		return result.deletedCount;
	}

	// ================== SYNC & MAINTENANCE ==================

	/**
	 * Sync session across platforms
	 */
	async syncSession(sessionId: string, platform: Platform): Promise<ConversationSession | null> {
		const collection = this.db.collection<ConversationSession>(COLLECTIONS.SESSIONS);

		const session = await collection.findOne({ sessionId });
		if (!session) return null;

		// Update sync timestamp
		await collection.updateOne(
			{ sessionId },
			{ $set: { lastSyncedAt: new Date() } }
		);

		return session;
	}

	/**
	 * Health check
	 */
	async healthCheck(): Promise<boolean> {
		try {
			await this.db.admin().ping();
			return true;
		} catch (error) {
			console.error('MongoDB health check failed:', error);
			return false;
		}
	}

	/**
	 * Get storage statistics
	 */
	async getStorageStats(): Promise<any> {
		const stats = await this.db.stats();

		const sessionCount = await this.db.collection(COLLECTIONS.SESSIONS).countDocuments();
		const userCount = await this.db.collection(COLLECTIONS.USERS).countDocuments();
		const memoryCount = await this.db.collection(COLLECTIONS.MEMORIES).countDocuments();

		return {
			database: stats,
			collections: {
				sessions: sessionCount,
				users: userCount,
				memories: memoryCount
			}
		};
	}
}
