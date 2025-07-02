import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface BackendResponse {
	content: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
	actions?: Array<{
		type: string;
		parameters: any;
		executed: boolean;
	}>;
}

export interface SessionInfo {
	sessionId: string;
	userId: string;
	platform: 'vscode';
	isActive: boolean;
	messages: Array<{
		id: string;
		role: 'user' | 'assistant' | 'system';
		content: string;
		timestamp: Date;
		metadata?: any;
	}>;
	workspaceInfo?: {
		name: string;
		path: string;
		activeFiles: string[];
		projectType: string;
		languages: string[];
	};
}

export class BackendService {
	private http: AxiosInstance;
	private baseUrl: string;
	private currentSession: SessionInfo | null = null;
	private userId: string;

	constructor() {
		// Get backend URL from VS Code settings
		const config = vscode.workspace.getConfiguration('autonomousdev');
		this.baseUrl = config.get('backendUrl', 'http://localhost:3001');

		// Generate or retrieve user ID
		this.userId = this.getUserId();

		// Configure HTTP client
		this.http = axios.create({
			baseURL: this.baseUrl,
			timeout: 30000,
			headers: {
				'Content-Type': 'application/json'
			}
		});

		// Add request/response interceptors for logging
		this.http.interceptors.request.use(
			(config: any) => {
				console.log(`🔗 Backend Request: ${config.method?.toUpperCase()} ${config.url}`);
				return config;
			}
		);

		this.http.interceptors.response.use(
			(response: any) => {
				console.log(`✅ Backend Response: ${response.status} ${response.config.url}`);
				return response;
			},
			(error: any) => {
				console.error(`❌ Backend Error: ${error.message}`);
				return Promise.reject(error);
			}
		);
	}

	/**
	 * Get or generate user ID for this VS Code instance
	 */
	private getUserId(): string {
		const config = vscode.workspace.getConfiguration('autonomousdev');
		let userId = config.get<string>('userId');

		if (!userId) {
			// Generate new user ID
			userId = `vscode_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
			config.update('userId', userId, vscode.ConfigurationTarget.Global);
			console.log(`🆔 Generated new user ID: ${userId}`);
		}

		return userId;
	}

	/**
	 * Get current workspace information
	 */
	private async getCurrentWorkspaceInfo(): Promise<SessionInfo['workspaceInfo'] | undefined> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined;
		}

		const workspace = workspaceFolders[0];
		const activeEditor = vscode.window.activeTextEditor;

		// Get active files from all open editors
		const activeFiles = vscode.window.tabGroups.all
			.flatMap(group => group.tabs)
			.map(tab => {
				if (tab.input instanceof vscode.TabInputText) {
					return tab.input.uri.fsPath;
				}
				return null;
			})
			.filter(Boolean) as string[];

		// Detect project type and languages
		const projectType = await this.detectProjectType(workspace.uri.fsPath);
		const languages = this.detectLanguages(activeFiles);

		return {
			name: workspace.name,
			path: workspace.uri.fsPath,
			activeFiles: activeFiles.slice(0, 10), // Limit to 10 most recent
			projectType,
			languages
		};
	}

	/**
	 * Detect project type from workspace
	 */
	private async detectProjectType(workspacePath: string): Promise<string> {
		try {
			// Check for different project files
			const [packageJson, requirementsTxt, cargoToml, pomXml] = await Promise.all([
				vscode.workspace.findFiles('package.json', null, 1),
				vscode.workspace.findFiles('requirements.txt', null, 1),
				vscode.workspace.findFiles('Cargo.toml', null, 1),
				vscode.workspace.findFiles('pom.xml', null, 1)
			]);

			if (packageJson.length > 0) return 'nodejs';
			if (requirementsTxt.length > 0) return 'python';
			if (cargoToml.length > 0) return 'rust';
			if (pomXml.length > 0) return 'java';

			return 'general';
		} catch (error) {
			console.warn('Failed to detect project type:', error);
			return 'general';
		}
	}

	/**
	 * Detect programming languages from file extensions
	 */
	private detectLanguages(filePaths: string[]): string[] {
		const extensions = filePaths.map(path => {
			const ext = path.split('.').pop()?.toLowerCase();
			return this.mapExtensionToLanguage(ext);
		}).filter(Boolean) as string[];

		return [...new Set(extensions)]; // Remove duplicates
	}

	/**
	 * Map file extension to programming language
	 */
	private mapExtensionToLanguage(ext?: string): string | null {
		const mapping: Record<string, string> = {
			'ts': 'typescript',
			'js': 'javascript',
			'py': 'python',
			'rs': 'rust',
			'java': 'java',
			'cpp': 'cpp',
			'c': 'c',
			'go': 'go',
			'php': 'php',
			'rb': 'ruby',
			'swift': 'swift',
			'kt': 'kotlin',
			'dart': 'dart',
			'html': 'html',
			'css': 'css',
			'scss': 'scss',
			'json': 'json',
			'yaml': 'yaml',
			'yml': 'yaml',
			'md': 'markdown'
		};

		return ext ? mapping[ext] || null : null;
	}

	/**
	 * Initialize or get current session
	 */
	async initializeSession(): Promise<SessionInfo> {
		try {
			// Try to get existing active session
			const response = await this.http.get(`/api/sessions/${this.userId}/vscode`);
			this.currentSession = response.data;
			console.log(`🔄 Restored existing session: ${this.currentSession?.sessionId}`);
			return this.currentSession!;
		} catch (error) {
			// No active session found, create new one
			console.log('📝 Creating new session...');
			return await this.createNewSession();
		}
	}

	/**
	 * Create a new session
	 */
	async createNewSession(): Promise<SessionInfo> {
		try {
			const workspaceInfo = await this.getCurrentWorkspaceInfo();

			const response = await this.http.post('/api/sessions', {
				userId: this.userId,
				platform: 'vscode',
				workspaceInfo
			});

			this.currentSession = response.data;
			console.log(`✨ Created new session: ${this.currentSession?.sessionId}`);

			return this.currentSession!;
		} catch (error) {
			console.error('Failed to create session:', error);
			throw new Error('Failed to initialize backend session');
		}
	}

	/**
	 * Send message and get response (non-streaming)
	 */
	async sendMessage(
		message: string,
		isVoice: boolean = false
	): Promise<BackendResponse> {
		if (!this.currentSession) {
			await this.initializeSession();
		}

		try {
			const response = await this.http.post('/api/chat', {
				sessionId: this.currentSession!.sessionId,
				message,
				isVoice
			});

			return {
				content: response.data.message.content,
				usage: response.data.usage,
				actions: response.data.message.metadata?.actions
			};
		} catch (error) {
			console.error('Failed to send message:', error);
			throw new Error('Failed to communicate with backend');
		}
	}

	/**
	 * Update session context (workspace changes, etc.)
	 */
	async updateContext(): Promise<void> {
		if (!this.currentSession) return;

		try {
			const workspaceInfo = await this.getCurrentWorkspaceInfo();

			await this.http.put(`/api/sessions/${this.currentSession.sessionId}`, {
				workspaceInfo,
				lastActivityAt: new Date()
			});

			console.log('🔄 Updated session context');
		} catch (error) {
			console.error('Failed to update context:', error);
		}
	}

	/**
	 * End current session
	 */
	async endSession(): Promise<void> {
		if (!this.currentSession) return;

		try {
			await this.http.delete(`/api/sessions/${this.currentSession.sessionId}`);
			this.currentSession = null;
			console.log('📴 Session ended');
		} catch (error) {
			console.error('Failed to end session:', error);
		}
	}

	/**
	 * Check backend health
	 */
	async checkHealth(): Promise<boolean> {
		try {
			const response = await this.http.get('/health');
			return response.data.status === 'ok';
		} catch (error) {
			console.error('Backend health check failed:', error);
			return false;
		}
	}

	/**
	 * Get current session info
	 */
	getCurrentSession(): SessionInfo | null {
		return this.currentSession;
	}

	/**
	 * Refresh session data
	 */
	async refreshSession(): Promise<SessionInfo | null> {
		if (!this.currentSession) return null;

		try {
			const response = await this.http.get(`/api/sessions/${this.currentSession.sessionId}`);
			this.currentSession = response.data;
			return this.currentSession;
		} catch (error) {
			console.error('Failed to refresh session:', error);
			return null;
		}
	}
}
