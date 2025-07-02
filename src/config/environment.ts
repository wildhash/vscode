import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EnvironmentConfig {
	// Server
	port: number;
	host: string;
	nodeEnv: string;

	// OpenAI
	openaiApiKey: string;
	openaiModel: string;
	openaiMaxTokens: number;
	openaiTemperature: number;

	// Database
	mongodbUri: string;
	mongodbDbName: string;
	redisUrl: string;
	redisPassword?: string;

	// Security
	jwtSecret: string;
	corsOrigins: string[];

	// Rate Limiting
	rateLimitWindowMs: number;
	rateLimitMaxRequests: number;

	// Logging
	logLevel: string;
	logFile: string;

	// WebSocket
	wsHeartbeatInterval: number;
	wsConnectionTimeout: number;

	// AI Configuration
	aiName: string;
	aiPersonality: string;
	systemPromptVersion: string;
}

function validateEnvironment(): EnvironmentConfig {
	const requiredVars = ['OPENAI_API_KEY'];
	const missing = requiredVars.filter(varName => !process.env[varName]);

	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}

	return {
		// Server Configuration
		port: parseInt(process.env.PORT || '3001', 10),
		host: process.env.HOST || 'localhost',
		nodeEnv: process.env.NODE_ENV || 'development',

		// OpenAI Configuration
		openaiApiKey: process.env.OPENAI_API_KEY!,
		openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
		openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
		openaiTemperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),

		// Database Configuration
		mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/digital-intelligence',
		mongodbDbName: process.env.MONGODB_DB_NAME || 'digital_intelligence',
		redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
		redisPassword: process.env.REDIS_PASSWORD,

		// Security
		jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
		corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,vscode://').split(','),

		// Rate Limiting
		rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
		rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

		// Logging
		logLevel: process.env.LOG_LEVEL || 'info',
		logFile: process.env.LOG_FILE || 'logs/digital-intelligence.log',

		// WebSocket Configuration
		wsHeartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
		wsConnectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '60000', 10),

		// AI Configuration
		aiName: process.env.AI_NAME || 'Omni',
		aiPersonality: process.env.AI_PERSONALITY || 'autonomous_developer',
		systemPromptVersion: process.env.SYSTEM_PROMPT_VERSION || '1.0'
	};
}

export const config = validateEnvironment();

// Helper function to get environment-specific settings
export function isDevelopment(): boolean {
	return config.nodeEnv === 'development';
}

export function isProduction(): boolean {
	return config.nodeEnv === 'production';
}

// Export configuration example for setup
export const ENVIRONMENT_EXAMPLE = `
# Digital Intelligence Backend Configuration

# Server Configuration
PORT=3001
NODE_ENV=development
HOST=localhost

# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4096
OPENAI_TEMPERATURE=0.7

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/digital-intelligence
MONGODB_DB_NAME=digital_intelligence
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3000,vscode://

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/digital-intelligence.log

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
WS_CONNECTION_TIMEOUT=60000

# AI Personality
AI_NAME=Omni
AI_PERSONALITY=autonomous_developer
SYSTEM_PROMPT_VERSION=1.0
`;
