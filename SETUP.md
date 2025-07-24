# VS Code Development Setup

This document provides instructions for setting up a VS Code development environment.

## Quick Start

For new contributors, run this command to set up the development environment:

```bash
npm run setup
```

This will:
- Install root dependencies
- Install build dependencies (skipping problematic optional dependencies)
- Provide guidance for next steps

## Manual Setup

If the automatic setup fails, you can set up manually:

1. **Install root dependencies:**
   ```bash
   npm ci
   ```

2. **Install build dependencies:**
   ```bash
   cd build
   npm install --no-optional
   cd ..
   ```

## Available Scripts

- `npm run setup` - Set up the development environment
- `npm run precommit` - Run pre-commit checks (includes gulp electron)
- `npm run compile` - Compile the project
- `npm run watch` - Watch for changes and compile automatically
- `npm run test` - Run tests
- `npm run eslint` - Run ESLint checks
- `npm run hygiene` - Run code hygiene checks

## Pre-commit Script

The `npm run precommit` command runs `gulp electron` and includes:

- **Full build system available:** Runs complete VS Code build and validation
- **Fallback mode:** If build dependencies are missing, runs basic checks:
  - TypeScript compilation check (with detailed error reporting)
  - Required file presence validation
  - Clear guidance on how to enable full functionality

## Troubleshooting

### "gulp is not recognized"

This error occurs when:
1. Gulp CLI is not installed
2. Dependencies are not properly installed
3. Build tools are not set up correctly

**Solutions:**
1. Run `npm run setup` (recommended)
2. Or manually: `npm ci && cd build && npm install --no-optional`

### Build Dependencies Issues

Some VS Code build dependencies may fail to install due to:
- Network restrictions
- Platform-specific binary downloads
- Optional dependency conflicts

The setup script automatically handles these by:
- Skipping problematic optional dependencies
- Providing fallback functionality
- Giving clear error messages with resolution steps

### TypeScript Compilation Errors

VS Code is a large codebase with complex TypeScript configurations. Some compilation errors are expected during development. The precommit script will:
- Show TypeScript errors for awareness
- Continue with other checks
- Not fail the precommit process for TS errors alone

## Development Workflow

1. **Initial setup:** `npm run setup`
2. **Development:** `npm run watch` (for continuous compilation)
3. **Before commit:** `npm run precommit`
4. **Testing:** `npm run test`

## Contributing

- See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed contribution guidelines
- Use `npm run precommit` to validate changes before submitting
- The precommit script ensures gulp and other build tools work correctly

## Need Help?

If you encounter issues:
1. Try `npm run setup` first
2. Check this document for common issues
3. File an issue with your specific error message and setup details