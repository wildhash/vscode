# Autonomous Development Assistant

A fully autonomous software engineering VS Code extension with Test-Driven Development (TDD) and deployment capabilities powered by GPT-4o.

## Features

### 🧠 Autonomous Mode
The AI agent continuously monitors your workspace and automatically:
- Detects errors and warnings in your code
- Suggests and applies fixes with configurable confidence thresholds
- Uses AI reasoning to prioritize tasks
- Requests human intervention when stuck in error loops

### 🧪 Test-Driven Development (TDD)
Built-in TDD workflow that:
- Automatically writes tests before implementation
- Detects test frameworks (Jest, Mocha, Vitest)
- Runs tests and reports results
- Generates comprehensive test coverage

### 🚀 Deployment Integration
Deploy directly from VS Code with:
- Auto-detection of deployment platforms (Vercel, Netlify, GitHub Pages, Fly.io, Railway)
- One-click deployment to production
- Build verification before deployment
- Deployment verification after deployment
- Rollback support

### 👤 Human Intervention System
When the AI encounters issues it can't resolve:
- Clear intervention requests with priority levels
- Suggested actions for resolution
- Command instructions for manual steps
- Output channel logging for debugging

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `autonomousdev.toggleAutonomous` | `Ctrl+Alt+A` | Toggle autonomous mode on/off |
| `autonomousdev.startTask` | `Ctrl+Alt+T` | Start a new autonomous task |
| `autonomousdev.continueTask` | - | Continue task after intervention |
| `autonomousdev.abortTask` | - | Abort current task |
| `autonomousdev.runTests` | `Ctrl+Alt+R` | Run tests |
| `autonomousdev.writeTests` | - | Generate tests for current file |
| `autonomousdev.build` | - | Build the project |
| `autonomousdev.deploy` | `Ctrl+Alt+D` | Deploy to production |
| `autonomousdev.setupDeployment` | - | Setup deployment configuration |

## Configuration

```json
{
  "autonomousdev.openaiApiKey": "",              // OpenAI API Key (required)
  "autonomousdev.autoStartAutonomous": false,   // Auto-start autonomous mode
  "autonomousdev.thinkingInterval": 10000,      // Workspace analysis interval (ms)
  "autonomousdev.autoFixThreshold": 80,         // Confidence threshold for auto-fix
  "autonomousdev.maxErrorRetries": 3,           // Max retries before intervention
  "autonomousdev.enableTDD": true,              // Enable TDD workflow
  "autonomousdev.testFramework": "auto",        // Test framework (auto/jest/mocha/vitest)
  "autonomousdev.enableAutoDeployment": false,  // Auto-deploy after successful builds
  "autonomousdev.deploymentTarget": "auto",     // Deployment platform
  "autonomousdev.requireDeploymentConfirmation": true // Require confirmation before deploy
}
```

## How It Works

### Task Execution Workflow

When you start a task, the agent follows this TDD workflow:

1. **Analyze Requirements** - Understand what needs to be built
2. **Write Tests (TDD)** - Create tests that define expected behavior
3. **Implement Code** - Write code to make tests pass
4. **Run Tests** - Verify implementation
5. **Fix Issues** - Address any failing tests or errors
6. **Build Project** - Compile/bundle the project
7. **Deploy to Production** - Deploy the working code
8. **Verify Deployment** - Confirm deployment is working

### Error Loop Detection

If the agent encounters repeated failures:
- After 3 consecutive errors, it stops and requests human intervention
- Clear instructions are provided on how to resolve the issue
- Use `autonomousdev.continueTask` to resume after fixing the problem
- Use `autonomousdev.abortTask` to cancel and start fresh

### Human Intervention Requests

When intervention is needed, you'll see:
```
═══════════════════════════════════════════════════════════
🚨 HUMAN INTERVENTION REQUIRED
═══════════════════════════════════════════════════════════

Task: [Task Description]
Step: [Current Step]
Error: [Error Message]

ACTION REQUIRED:
1. Review the error above
2. Fix the issue manually or provide guidance
3. Use command "autonomousdev.continueTask" to resume
4. Or use "autonomousdev.abortTask" to cancel

===============================
```

## Getting Started

1. **Install Dependencies**
   ```bash
   cd autonomous-dev-extension
   npm install
   ```

2. **Configure OpenAI API Key**
   - Open VS Code Settings
   - Search for "autonomousdev"
   - Set your OpenAI API key in `autonomousdev.openaiApiKey`

3. **Start the Extension**
   - Press `F5` to launch Extension Development Host
   - Or package and install the extension

4. **Toggle Autonomous Mode**
   - Press `Ctrl+Alt+A` (or `Cmd+Alt+A` on Mac)
   - Or use Command Palette: "Autonomous Dev: Toggle Autonomous Mode"

5. **Start a Task**
   - Press `Ctrl+Alt+T` (or `Cmd+Alt+T` on Mac)
   - Describe what you want to build
   - The agent will handle the rest!

## Deployment Setup

### Vercel
```bash
npm i -g vercel
vercel login
```
Then use "Setup Deployment Configuration" command.

### Netlify
```bash
npm i -g netlify-cli
netlify login
```
Then use "Setup Deployment Configuration" command.

### GitHub Pages
The extension will create a GitHub Actions workflow automatically.

### Fly.io
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```
Then use "Setup Deployment Configuration" command.

## Architecture

```
autonomous-dev-extension/
├── src/
│   ├── extension.ts                    # Extension entry point
│   ├── chatPanel.ts                    # Voice chat UI panel
│   └── services/
│       ├── autonomousAgentService.ts   # Main autonomous agent
│       ├── testDrivenService.ts        # TDD implementation
│       ├── deploymentService.ts        # CI/CD integration
│       ├── humanInterventionHandler.ts # Human intervention system
│       ├── openaiService.ts            # GPT-4o integration
│       ├── fileSystemService.ts        # File operations
│       ├── intentRouter.ts             # Intent classification
│       └── sessionManager.ts           # Session management
├── package.json
└── tsconfig.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - See LICENSE.txt for details.
