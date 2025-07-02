# 🧠 Digital Intelligence Backend

Centralized backend for the Digital Intelligence Entity - enabling persistent memory, cross-platform sessions, and GPT-4o integration across all platforms.

## 🚀 Features

- **🔄 Cross-Platform Sessions** - Same AI entity across VS Code, Web, and Mobile
- **🧠 Persistent Memory** - AI remembers conversations, preferences, and context
- **⚡ Real-Time Streaming** - WebSocket-based voice and text interaction
- **🎯 Context Injection** - Workspace info and memories in every response
- **👥 Multi-User Support** - Individual profiles and learning patterns
- **🔒 Secure & Scalable** - Production-ready with proper authentication

## 🛠️ Quick Start

### 1. Environment Setup

```bash
# Clone and install
git clone <your-repo>
cd digital-intelligence-backend
npm install

# Create environment file
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your settings:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Database (MongoDB)
MONGODB_URI=mongodb://localhost:27017/digital-intelligence

# Server
PORT=3001
HOST=localhost
NODE_ENV=development
```

### 3. Start Services

```bash
# Start MongoDB (if local)
mongod

# Start backend in development mode
npm run dev

# Or build and start production
npm run build
npm start
```

### 4. Verify Installation

Visit: `http://localhost:3001/health`

Expected response:
```json
{
  "status": "ok",
  "services": {
    "mongodb": "healthy",
    "openai": "healthy"
  }
}
```

## 📡 API Endpoints

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check and service status |
| `GET` | `/api/sessions/:userId/:platform` | Get active session |
| `POST` | `/api/sessions` | Create new session |
| `POST` | `/api/chat` | Send message (non-streaming) |
| `GET` | `/api/stats` | Storage statistics |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_session` | Client → Server | Join a conversation session |
| `chat_stream` | Client → Server | Send streaming message |
| `update_context` | Client → Server | Update session context |
| `assistant_chunk` | Server → Client | Streaming response chunk |
| `assistant_message` | Server → Client | Complete response |
| `user_message` | Server → Client | Broadcast user message |

## 🔗 VS Code Extension Integration

Replace the OpenAI service in your VS Code extension:

```typescript
// services/backendService.ts
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export class BackendService {
  private socket: Socket;
  private baseUrl = 'http://localhost:3001';

  constructor() {
    this.socket = io(this.baseUrl);
  }

  async createSession(userId: string, workspaceInfo?: any) {
    const response = await axios.post(`${this.baseUrl}/api/sessions`, {
      userId,
      platform: 'vscode',
      workspaceInfo
    });
    return response.data;
  }

  async sendStreamingMessage(
    sessionId: string,
    message: string,
    isVoice: boolean,
    onChunk: (chunk: string) => void,
    onComplete: () => void
  ) {
    this.socket.emit('join_session', { sessionId, userId: 'user_id' });

    this.socket.on('assistant_chunk', (data) => {
      if (!data.isComplete) {
        onChunk(data.content);
      } else {
        onComplete();
      }
    });

    this.socket.emit('chat_stream', {
      sessionId,
      message,
      isVoice
    });
  }
}
```

## 🌐 Web App Integration

Connect your React/Next.js app:

```javascript
// hooks/useDigitalIntelligence.js
import { io } from 'socket.io-client';

export function useDigitalIntelligence() {
  const socket = io('http://localhost:3001');

  const sendMessage = (sessionId, message, isVoice) => {
    socket.emit('chat_stream', { sessionId, message, isVoice });
  };

  const onMessage = (callback) => {
    socket.on('assistant_chunk', callback);
  };

  return { sendMessage, onMessage };
}
```

## 🗄️ Database Schema

### Conversation Sessions
```typescript
{
  sessionId: string;
  userId: string;
  platform: 'vscode' | 'web' | 'mobile';
  messages: Message[];
  workspaceInfo?: {
    name: string;
    path: string;
    activeFiles: string[];
    projectType: string;
  };
  emotionalState: 'neutral' | 'helpful' | 'excited' | 'focused';
  metrics: {
    totalTokensUsed: number;
    averageResponseTime: number;
    actionsExecuted: number;
  };
}
```

### AI Memory Entries
```typescript
{
  userId: string;
  type: 'fact' | 'preference' | 'pattern' | 'context';
  content: string;
  importance: number; // 1-10
  confidence: number; // 0-1
  tags: string[];
}
```

## 🔧 Development

### Project Structure
```
src/
├── server.ts              # Main Express + WebSocket server
├── config/
│   └── environment.ts     # Environment configuration
├── models/
│   └── conversation.ts    # Data models and schemas
└── services/
    ├── openaiProxy.ts     # GPT-4o integration with memory
    └── memoryStore.ts     # MongoDB session management
```

### Available Scripts
```bash
npm run dev          # Development with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
npm run test        # Run tests (when implemented)
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key for GPT-4o |
| `MONGODB_URI` | ❌ | `mongodb://localhost:27017/digital-intelligence` | MongoDB connection string |
| `PORT` | ❌ | `3001` | Server port |
| `NODE_ENV` | ❌ | `development` | Environment mode |
| `CORS_ORIGINS` | ❌ | `http://localhost:3000,vscode://` | Allowed CORS origins |

## 🚀 Deployment

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["npm", "start"]
```

### Production Checklist
- [ ] Set strong `JWT_SECRET`
- [ ] Configure production MongoDB
- [ ] Set up proper CORS origins
- [ ] Enable request rate limiting
- [ ] Configure logging and monitoring
- [ ] Set up SSL/TLS certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - Built with ❤️ for the Digital Intelligence revolution

## 🆘 Support

- **Issues**: GitHub Issues
- **Docs**: See `/docs` folder
- **Health Check**: `GET /health`

---

**🧠 Your Digital Intelligence Entity awaits...**
