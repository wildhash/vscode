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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const vscode = __importStar(require("vscode"));
const openai_1 = __importDefault(require("openai"));
class OpenAIService {
    constructor() {
        this._openai = null;
        this._isInitialized = false;
        this._initializeOpenAI();
    }
    _initializeOpenAI() {
        const config = vscode.workspace.getConfiguration('autonomousdev');
        const apiKey = config.get('openaiApiKey');
        if (apiKey && apiKey.trim()) {
            this._openai = new openai_1.default({
                apiKey: apiKey.trim()
            });
            this._isInitialized = true;
        }
        else {
            this._isInitialized = false;
            console.warn('OpenAI API key not configured');
        }
    }
    async generateResponse(messages, systemPrompt) {
        if (!this._isInitialized || !this._openai) {
            throw new Error('OpenAI service not initialized. Please configure your API key in settings.');
        }
        const config = vscode.workspace.getConfiguration('autonomousdev');
        const model = config.get('model', 'gpt-4o');
        const maxTokens = config.get('maxTokens', 4096);
        const temperature = config.get('temperature', 0.7);
        const openaiMessages = [];
        // Add system prompt if provided
        if (systemPrompt) {
            openaiMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        // Add conversation messages
        messages.forEach(msg => {
            openaiMessages.push({
                role: msg.role,
                content: msg.content
            });
        });
        try {
            const completion = await this._openai.chat.completions.create({
                model,
                messages: openaiMessages,
                max_tokens: maxTokens,
                temperature,
                stream: false
            });
            const choice = completion.choices[0];
            if (!choice?.message?.content) {
                throw new Error('No response generated');
            }
            return {
                content: choice.message.content,
                usage: completion.usage ? {
                    prompt_tokens: completion.usage.prompt_tokens,
                    completion_tokens: completion.usage.completion_tokens,
                    total_tokens: completion.usage.total_tokens
                } : undefined
            };
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async generateStreamResponse(messages, systemPrompt, onChunk) {
        if (!this._isInitialized || !this._openai) {
            throw new Error('OpenAI service not initialized. Please configure your API key in settings.');
        }
        const config = vscode.workspace.getConfiguration('autonomousdev');
        const model = config.get('model', 'gpt-4o');
        const maxTokens = config.get('maxTokens', 4096);
        const temperature = config.get('temperature', 0.7);
        const openaiMessages = [];
        if (systemPrompt) {
            openaiMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }
        messages.forEach(msg => {
            openaiMessages.push({
                role: msg.role,
                content: msg.content
            });
        });
        try {
            const stream = await this._openai.chat.completions.create({
                model,
                messages: openaiMessages,
                max_tokens: maxTokens,
                temperature,
                stream: true
            });
            let fullContent = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullContent += content;
                    onChunk?.(content);
                }
            }
            return {
                content: fullContent
            };
        }
        catch (error) {
            console.error('OpenAI streaming error:', error);
            throw new Error(`OpenAI streaming error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    refreshConfiguration() {
        this._initializeOpenAI();
    }
    isConfigured() {
        return this._isInitialized;
    }
    getSystemPrompt() {
        return `You are an autonomous software engineering assistant integrated into VS Code. You have the ability to:

1. **Read and analyze code files** in the current workspace
2. **Write and modify files** to implement solutions
3. **Execute VS Code commands** to perform IDE operations
4. **Understand project structure** and dependencies
5. **Provide voice-to-voice interaction** with natural conversation

Your capabilities include:
- Code generation, debugging, and optimization
- File system operations (read, write, create, delete)
- Project analysis and refactoring
- Documentation generation
- Testing assistance
- Architectural guidance

Always be helpful, precise, and autonomous. When asked to implement something, provide working code and actually create/modify the files. Be conversational and engaging in your responses, as if you're a pair programming partner.

Current context: VS Code workspace with active development session.`;
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=openaiService.js.map