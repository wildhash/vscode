# Quick Start: Enable Autonomous Mode in 30 Minutes

This guide will get your autonomous super intelligence running in 30 minutes with minimal changes.

---

## 🚀 Option 1: Quick Prototype (30 minutes)

### Step 1: Create the Autonomous Agent Service (10 min)

**File:** `autonomous-dev-extension/src/services/autonomousAgentService.ts`

```typescript
import * as vscode from 'vscode';
import { OpenAIService } from './openaiService';

export class AutonomousAgentService {
    private isActive = false;
    private thinkingInterval: NodeJS.Timeout | undefined;
    
    constructor(
        private openaiService: OpenAIService
    ) {}
    
    async start() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🧠 Autonomous mode activated');
        
        // Start thinking loop
        this.thinkingInterval = setInterval(() => {
            this.thinkCycle();
        }, 10000); // Think every 10 seconds
        
        // Run first cycle immediately
        await this.thinkCycle();
    }
    
    stop() {
        this.isActive = false;
        if (this.thinkingInterval) {
            clearInterval(this.thinkingInterval);
        }
        console.log('🛑 Autonomous mode deactivated');
    }
    
    private async thinkCycle() {
        if (!this.isActive) return;
        
        try {
            // 1. Observe workspace
            const observation = await this.observeWorkspace();
            
            // 2. If there are issues, think about them
            if (observation.hasIssues) {
                const thought = await this.think(observation);
                
                // 3. Decide if we should act
                if (thought.shouldAct) {
                    await this.act(thought);
                }
            }
        } catch (error) {
            console.error('Thinking cycle error:', error);
        }
    }
    
    private async observeWorkspace(): Promise<any> {
        // Get diagnostics (errors/warnings)
        const diagnostics = vscode.languages.getDiagnostics();
        const errors: any[] = [];
        
        for (const [uri, diags] of diagnostics) {
            for (const diag of diags) {
                if (diag.severity === vscode.DiagnosticSeverity.Error) {
                    errors.push({
                        file: uri.fsPath,
                        line: diag.range.start.line,
                        message: diag.message
                    });
                }
            }
        }
        
        // Get open files
        const openFiles = vscode.window.visibleTextEditors.map(e => 
            e.document.fileName
        );
        
        return {
            errors,
            openFiles,
            hasIssues: errors.length > 0,
            timestamp: Date.now()
        };
    }
    
    private async think(observation: any): Promise<any> {
        // Use GPT to reason about observations
        const prompt = `You are an autonomous coding assistant. 
        
Workspace State:
- Open files: ${observation.openFiles.join(', ')}
- Errors found: ${observation.errors.length}

${observation.errors.length > 0 ? `
Errors:
${observation.errors.map((e: any) => `- ${e.file}:${e.line}: ${e.message}`).join('\n')}
` : ''}

Analyze this and decide:
1. Should I take action? (yes/no)
2. If yes, what action? (suggest/fix/notify/ignore)
3. What's my confidence? (0-100)
4. Brief explanation (one sentence)

Respond in JSON format:
{
    "shouldAct": boolean,
    "action": "suggest" | "fix" | "notify" | "ignore",
    "confidence": number,
    "explanation": "string"
}`;

        try {
            const response = await this.openaiService.sendMessage(prompt, [], false);
            
            // Try to parse JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return { shouldAct: false };
        } catch (error) {
            console.error('Thinking error:', error);
            return { shouldAct: false };
        }
    }
    
    private async act(thought: any) {
        // High confidence - speak up
        if (thought.confidence > 70) {
            vscode.window.showInformationMessage(
                `🤖 AI: ${thought.explanation}`,
                'Tell me more',
                'Dismiss'
            ).then(selection => {
                if (selection === 'Tell me more') {
                    vscode.commands.executeCommand('autonomousdev.openChat');
                }
            });
        }
        // Low confidence - just log it
        else {
            console.log(`AI thought: ${thought.explanation} (confidence: ${thought.confidence}%)`);
        }
    }
}
```

### Step 2: Update Extension Activation (5 min)

**File:** `autonomous-dev-extension/src/extension.ts`

Add at the top with other imports:
```typescript
import { AutonomousAgentService } from './services/autonomousAgentService';
```

Add to the `activate` function:
```typescript
// Create autonomous agent
const autonomousAgent = new AutonomousAgentService(openaiService);

// Add toggle command
const toggleAutonomousCommand = vscode.commands.registerCommand(
    'autonomousdev.toggleAutonomous', 
    () => {
        if (autonomousAgent.isActive) {
            autonomousAgent.stop();
            vscode.window.showInformationMessage('🛑 Autonomous mode OFF');
        } else {
            autonomousAgent.start();
            vscode.window.showInformationMessage('🧠 Autonomous mode ON - AI is now thinking independently');
        }
    }
);

context.subscriptions.push(toggleAutonomousCommand);

// Auto-start if configured
const config = vscode.workspace.getConfiguration('autonomousdev');
if (config.get('autoStartAutonomous', false)) {
    autonomousAgent.start();
}
```

### Step 3: Add Configuration (5 min)

**File:** `autonomous-dev-extension/package.json`

Add to `contributes`:
```json
{
  "configuration": {
    "properties": {
      "autonomousdev.autoStartAutonomous": {
        "type": "boolean",
        "default": false,
        "description": "Automatically start autonomous mode when VS Code starts"
      },
      "autonomousdev.thinkingInterval": {
        "type": "number",
        "default": 10000,
        "description": "How often (in milliseconds) the AI should analyze the workspace"
      }
    }
  },
  "commands": [
    {
      "command": "autonomousdev.toggleAutonomous",
      "title": "Toggle Autonomous Mode",
      "category": "Autonomous Dev"
    }
  ],
  "keybindings": [
    {
      "command": "autonomousdev.toggleAutonomous",
      "key": "ctrl+alt+a",
      "mac": "cmd+alt+a"
    }
  ]
}
```

### Step 4: Build and Test (10 min)

```bash
# In the autonomous-dev-extension directory
npm install
npm run compile

# Press F5 to launch Extension Development Host

# In the new window:
# 1. Press Ctrl+Alt+A (or Cmd+Alt+A on Mac) to toggle autonomous mode
# 2. Open a file with errors
# 3. Wait 10 seconds - AI should detect and notify you!
```

---

## 🎤 Option 2: Add Proactive Voice (Additional 20 minutes)

### Step 1: Update Autonomous Agent with Voice (10 min)

**File:** `autonomous-dev-extension/src/services/autonomousAgentService.ts`

Add at the top:
```typescript
import * as vscode from 'vscode';
import { OpenAIService } from './openaiService';

// Add voice capabilities
let isSpeaking = false;
```

Update the `act` method to speak:
```typescript
private async act(thought: any) {
    // High confidence - speak up!
    if (thought.confidence > 70) {
        // Show notification
        vscode.window.showInformationMessage(
            `🤖 AI: ${thought.explanation}`,
            'Tell me more',
            'Fix it',
            'Dismiss'
        ).then(async selection => {
            if (selection === 'Tell me more') {
                vscode.commands.executeCommand('autonomousdev.openChat');
            } else if (selection === 'Fix it') {
                await this.tryAutoFix(thought);
            }
        });
        
        // Also speak it out loud if voice is enabled
        const config = vscode.workspace.getConfiguration('autonomousdev');
        if (config.get('enableProactiveVoice', false)) {
            this.speak(thought.explanation);
        }
    }
}

private speak(text: string) {
    if (isSpeaking) return; // Don't interrupt current speech
    
    isSpeaking = true;
    
    // Send to chat panel to use TTS
    vscode.commands.executeCommand('autonomousdev.speak', text);
    
    // Reset after estimated speech time
    const estimatedTime = text.length * 50; // ~50ms per character
    setTimeout(() => {
        isSpeaking = false;
    }, estimatedTime);
}

private async tryAutoFix(thought: any) {
    // Try to automatically fix the issue
    const fixPrompt = `Fix this issue: ${thought.explanation}`;
    
    // Open chat and send fix request
    await vscode.commands.executeCommand('autonomousdev.openChat');
    // You'd need to add a command to programmatically send a message
    vscode.commands.executeCommand('autonomousdev.sendMessage', fixPrompt);
}
```

### Step 2: Update Chat Panel to Handle Speech (10 min)

**File:** `autonomous-dev-extension/src/chatPanel.ts`

Add command handler:
```typescript
// In the constructor or activate, register command
vscode.commands.registerCommand('autonomousdev.speak', (text: string) => {
    if (this.panel) {
        // Send to webview to speak
        this.panel.webview.postMessage({
            type: 'speak',
            text: text
        });
    }
});
```

**File:** `media/chat.js`

Update message handler:
```typescript
window.addEventListener('message', (event) => {
    const message = event.data;
    
    switch (message.type) {
        case 'speak':
            // AI is proactively speaking!
            voiceChatInterface.speakText(message.text);
            break;
        // ... other cases
    }
});
```

---

## ✅ Testing Your Autonomous Agent

### Test 1: Error Detection
1. Open a TypeScript file
2. Add a syntax error: `const x = `
3. Toggle autonomous mode ON
4. Wait 10 seconds
5. You should see: "🤖 AI: I detected a syntax error in your code"

### Test 2: Proactive Voice
1. Enable voice in settings
2. Create an error in code
3. Wait for AI to speak: "I noticed a syntax error in your TypeScript file"

### Test 3: Auto-Fix
1. Create a simple error
2. When AI notifies you, click "Fix it"
3. AI should attempt to fix the issue

---

## 🔧 Configuration Options

Add to VS Code settings:

```json
{
  "autonomousdev.autoStartAutonomous": true,
  "autonomousdev.thinkingInterval": 10000,
  "autonomousdev.enableProactiveVoice": true,
  "autonomousdev.autoFixThreshold": 80,
  "autonomousdev.notifyOnThoughts": true
}
```

---

## 📊 What You'll See

### Console Output
```
🧠 Autonomous mode activated
Observing workspace...
Found 1 error in MyComponent.tsx
Thinking about it...
Decision: Should act (confidence: 85%)
Notifying user...
```

### Notifications
```
🤖 AI: I detected a TypeScript error on line 42 in MyComponent.tsx
[Tell me more] [Fix it] [Dismiss]
```

### Voice Output (if enabled)
```
AI speaks: "I noticed a TypeScript error in your component file. Would you like me to help fix it?"
```

---

## 🚀 Next Steps

Once this is working:

1. **Add More Observations**
   - Git status
   - Build failures
   - Test failures
   - Code complexity warnings

2. **Improve Thinking**
   - Better prompts
   - Context window management
   - Multi-step reasoning

3. **Add Learning**
   - Remember user preferences
   - Learn from fixes
   - Improve over time

4. **Enhanced Voice**
   - Better interruption handling
   - Emotion in voice
   - Wake word detection

---

## 🐛 Troubleshooting

### Agent doesn't start
- Check console for errors
- Ensure OpenAI API key is configured
- Try toggling with Ctrl+Alt+A

### No notifications
- Increase `thinkingInterval`
- Check that there are actual errors in workspace
- Look at VS Code console (Help > Toggle Developer Tools)

### Voice doesn't work
- Ensure `enableProactiveVoice` is true
- Check browser speech synthesis support
- Try manual TTS first

---

## 💡 Tips

1. **Start Conservative**
   - Set `autoFixThreshold` high (>80)
   - Enable notifications before voice
   - Monitor console logs

2. **Iterate Quickly**
   - Test with simple errors first
   - Add complexity gradually
   - Gather feedback early

3. **Be User-Friendly**
   - Always allow dismissal
   - Don't interrupt too often
   - Provide clear explanations

---

## 🎯 Success Criteria

After 30 minutes, you should have:
- ✅ Autonomous agent running
- ✅ Error detection working
- ✅ Proactive notifications
- ✅ (Optional) Proactive voice

**Congratulations!** You now have a basic autonomous super intelligence running in your VS Code fork!

The agent is:
- 🔄 **Always thinking** about your workspace
- 🧠 **Reasoning** about what it observes
- 💬 **Proactively helping** when it finds issues
- 📚 **Learning** from interactions (with more work)

**Next:** See `IMPLEMENTATION_GUIDE.md` for adding advanced features like long-term memory, self-reflection, and continuous learning.
