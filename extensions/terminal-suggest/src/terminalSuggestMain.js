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
exports.sanitizeProcessEnvironment = exports.getCompletionItemsFromSpecs = exports.asArray = exports.getCurrentCommandAndArgs = exports.resolveCwdFromCurrentCommandString = exports.activate = exports.availableSpecs = void 0;
const vscode = __importStar(require("vscode"));
const cd_1 = __importDefault(require("./completions/cd"));
const code_1 = __importDefault(require("./completions/code"));
const code_insiders_1 = __importDefault(require("./completions/code-insiders"));
const npx_1 = __importDefault(require("./completions/npx"));
const set_location_1 = __importDefault(require("./completions/set-location"));
const constants_1 = require("./constants");
const pathExecutableCache_1 = require("./env/pathExecutableCache");
const os_1 = require("./helpers/os");
const uri_1 = require("./helpers/uri");
const bash_1 = require("./shell/bash");
const fish_1 = require("./shell/fish");
const pwsh_1 = require("./shell/pwsh");
const zsh_1 = require("./shell/zsh");
const tokens_1 = require("./tokens");
const completionItem_1 = require("./helpers/completionItem");
const figInterface_1 = require("./fig/figInterface");
const execute_1 = require("./fig/execute");
const promise_1 = require("./helpers/promise");
const code_tunnel_1 = __importDefault(require("./completions/code-tunnel"));
const code_tunnel_insiders_1 = __importDefault(require("./completions/code-tunnel-insiders"));
const isWindows = (0, os_1.osIsWindows)();
const cachedGlobals = new Map();
let pathExecutableCache;
const CACHE_KEY = 'terminalSuggestGlobalsCacheV2';
let globalStorage;
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
function getCacheKey(machineId, remoteAuthority, shellType) {
    return `${machineId}:${remoteAuthority ?? 'local'}:${shellType}`;
}
exports.availableSpecs = [
    cd_1.default,
    code_insiders_1.default,
    code_1.default,
    code_tunnel_1.default,
    code_tunnel_insiders_1.default,
    npx_1.default,
    set_location_1.default,
];
for (const spec of constants_1.upstreamSpecs) {
    exports.availableSpecs.push(require(`./completions/upstream/${spec}`).default);
}
const getShellSpecificGlobals = new Map([
    ["bash" /* TerminalShellType.Bash */, bash_1.getBashGlobals],
    ["zsh" /* TerminalShellType.Zsh */, zsh_1.getZshGlobals],
    ["gitbash" /* TerminalShellType.GitBash */, bash_1.getBashGlobals],
    // TODO: Ghost text in the command line prevents completions from working ATM for fish
    ["fish" /* TerminalShellType.Fish */, fish_1.getFishGlobals],
    ["pwsh" /* TerminalShellType.PowerShell */, pwsh_1.getPwshGlobals],
]);
async function getShellGlobals(shellType, existingCommands, machineId, remoteAuthority) {
    if (!machineId) {
        // fallback: don't cache
        return await fetchAndCacheShellGlobals(shellType, existingCommands, undefined, undefined);
    }
    const cacheKey = getCacheKey(machineId, remoteAuthority, shellType);
    const cached = cachedGlobals.get(cacheKey);
    const now = Date.now();
    const existingCommandsArr = existingCommands ? Array.from(existingCommands) : undefined;
    let shouldRefresh = false;
    if (cached) {
        // Evict if too old
        if (now - cached.timestamp > CACHE_MAX_AGE_MS) {
            cachedGlobals.delete(cacheKey);
            await writeGlobalsCache();
        }
        else {
            if (existingCommandsArr && cached.existingCommands) {
                if (existingCommandsArr.length !== cached.existingCommands.length) {
                    shouldRefresh = true;
                }
            }
            else if (existingCommandsArr || cached.existingCommands) {
                shouldRefresh = true;
            }
            if (!shouldRefresh && cached.commands) {
                // Trigger background refresh
                void fetchAndCacheShellGlobals(shellType, existingCommands, machineId, remoteAuthority, true);
                return cached.commands;
            }
        }
    }
    // No cache or should refresh
    return await fetchAndCacheShellGlobals(shellType, existingCommands, machineId, remoteAuthority);
}
async function fetchAndCacheShellGlobals(shellType, existingCommands, machineId, remoteAuthority, background) {
    try {
        let execShellType = shellType;
        if (shellType === "gitbash" /* TerminalShellType.GitBash */) {
            execShellType = "bash" /* TerminalShellType.Bash */; // Git Bash is a bash shell
        }
        const options = { encoding: 'utf-8', shell: execShellType, windowsHide: true };
        const mixedCommands = await getShellSpecificGlobals.get(shellType)?.(options, existingCommands);
        const normalizedCommands = mixedCommands?.map(command => typeof command === 'string' ? ({ label: command }) : command);
        if (machineId) {
            const cacheKey = getCacheKey(machineId, remoteAuthority, shellType);
            cachedGlobals.set(cacheKey, {
                commands: normalizedCommands,
                existingCommands: existingCommands ? Array.from(existingCommands) : undefined,
                timestamp: Date.now()
            });
            await writeGlobalsCache();
        }
        return normalizedCommands;
    }
    catch (error) {
        if (!background) {
            console.error('Error fetching builtin commands:', error);
        }
        return;
    }
}
async function writeGlobalsCache() {
    if (!globalStorage) {
        return;
    }
    // Remove old entries
    const now = Date.now();
    for (const [key, value] of cachedGlobals.entries()) {
        if (now - value.timestamp > CACHE_MAX_AGE_MS) {
            cachedGlobals.delete(key);
        }
    }
    const obj = {};
    for (const [key, value] of cachedGlobals.entries()) {
        obj[key] = value;
    }
    try {
        await globalStorage.update(CACHE_KEY, obj);
    }
    catch (err) {
        console.error('Failed to write terminal suggest globals cache:', err);
    }
}
async function readGlobalsCache() {
    if (!globalStorage) {
        return;
    }
    try {
        const obj = globalStorage.get(CACHE_KEY);
        if (obj) {
            for (const key of Object.keys(obj)) {
                cachedGlobals.set(key, obj[key]);
            }
        }
    }
    catch { }
}
async function activate(context) {
    pathExecutableCache = new pathExecutableCache_1.PathExecutableCache();
    context.subscriptions.push(pathExecutableCache);
    let currentTerminalEnv = process.env;
    globalStorage = context.globalState;
    await readGlobalsCache();
    // Get a machineId for this install (persisted per machine, not synced)
    const machineId = await vscode.env.machineId;
    const remoteAuthority = vscode.env.remoteName;
    context.subscriptions.push(vscode.window.registerTerminalCompletionProvider({
        id: 'terminal-suggest',
        async provideTerminalCompletions(terminal, terminalContext, token) {
            currentTerminalEnv = terminal.shellIntegration?.env?.value ?? process.env;
            if (token.isCancellationRequested) {
                console.debug('#terminalCompletions token cancellation requested');
                return;
            }
            const shellType = 'shell' in terminal.state ? terminal.state.shell : undefined;
            const terminalShellType = getTerminalShellType(shellType);
            if (!terminalShellType) {
                console.debug('#terminalCompletions No shell type found for terminal');
                return;
            }
            const [commandsInPath, shellGlobals] = await Promise.all([
                pathExecutableCache.getExecutablesInPath(terminal.shellIntegration?.env?.value, terminalShellType),
                (async () => {
                    const executables = await pathExecutableCache.getExecutablesInPath(terminal.shellIntegration?.env?.value, terminalShellType);
                    return getShellGlobals(terminalShellType, executables?.labels, machineId, remoteAuthority);
                })()
            ]);
            const shellGlobalsArr = shellGlobals ?? [];
            if (!commandsInPath?.completionResources) {
                console.debug('#terminalCompletions No commands found in path');
                return;
            }
            // Order is important here, add shell globals first so they are prioritized over path commands
            const commands = [...shellGlobalsArr, ...commandsInPath.completionResources];
            const currentCommandString = getCurrentCommandAndArgs(terminalContext.commandLine, terminalContext.cursorPosition, terminalShellType);
            const pathSeparator = isWindows ? '\\' : '/';
            const tokenType = (0, tokens_1.getTokenType)(terminalContext, terminalShellType);
            const result = await Promise.race([
                getCompletionItemsFromSpecs(exports.availableSpecs, terminalContext, commands, currentCommandString, tokenType, terminal.shellIntegration?.cwd, getEnvAsRecord(currentTerminalEnv), terminal.name, token),
                (0, promise_1.createTimeoutPromise)(300, undefined)
            ]);
            if (!result) {
                return;
            }
            if (terminal.shellIntegration?.env) {
                const homeDirCompletion = result.items.find(i => i.label === '~');
                if (homeDirCompletion && terminal.shellIntegration.env?.value?.HOME) {
                    homeDirCompletion.documentation = (0, uri_1.getFriendlyResourcePath)(vscode.Uri.file(terminal.shellIntegration.env.value.HOME), pathSeparator, vscode.TerminalCompletionItemKind.Folder);
                    homeDirCompletion.kind = vscode.TerminalCompletionItemKind.Folder;
                }
            }
            if (terminal.shellIntegration?.cwd && (result.filesRequested || result.foldersRequested)) {
                return new vscode.TerminalCompletionList(result.items, {
                    filesRequested: result.filesRequested,
                    foldersRequested: result.foldersRequested,
                    fileExtensions: result.fileExtensions,
                    cwd: result.cwd ?? terminal.shellIntegration.cwd,
                    env: terminal.shellIntegration?.env?.value,
                });
            }
            return result.items;
        }
    }, '/', '\\'));
    await (0, pathExecutableCache_1.watchPathDirectories)(context, currentTerminalEnv, pathExecutableCache);
}
exports.activate = activate;
/**
 * Adjusts the current working directory based on a given current command string if it is a folder.
 * @param currentCommandString - The current command string, which might contain a folder path prefix.
 * @param currentCwd - The current working directory.
 * @returns The new working directory.
 */
async function resolveCwdFromCurrentCommandString(currentCommandString, currentCwd) {
    const prefix = currentCommandString.split(/\s+/).pop()?.trim() ?? '';
    if (!currentCwd) {
        return;
    }
    try {
        // Get the nearest folder path from the prefix. This ignores everything after the `/` as
        // they are what triggers changes in the directory.
        let lastSlashIndex;
        if (isWindows) {
            // TODO: This support is very basic, ideally the slashes supported would depend upon the
            //       shell type. For example git bash under Windows does not allow using \ as a path
            //       separator.
            lastSlashIndex = prefix.lastIndexOf('\\');
            if (lastSlashIndex === -1) {
                lastSlashIndex = prefix.lastIndexOf('/');
            }
        }
        else {
            lastSlashIndex = prefix.lastIndexOf('/');
        }
        const relativeFolder = lastSlashIndex === -1 ? '' : prefix.slice(0, lastSlashIndex);
        // Use vscode.Uri.joinPath for path resolution
        const resolvedUri = vscode.Uri.joinPath(currentCwd, relativeFolder);
        const stat = await vscode.workspace.fs.stat(resolvedUri);
        if (stat.type & vscode.FileType.Directory) {
            return resolvedUri;
        }
    }
    catch {
        // Ignore errors
    }
    // No valid path found
    return undefined;
}
exports.resolveCwdFromCurrentCommandString = resolveCwdFromCurrentCommandString;
// Retrurns the string that represents the current command and its arguments up to the cursor position.
// Uses shell specific separators to determine the current command and its arguments.
function getCurrentCommandAndArgs(commandLine, cursorPosition, shellType) {
    // Return an empty string if the command line is empty after trimming
    if (commandLine.trim() === '') {
        return '';
    }
    // Check if cursor is not at the end and there's non-whitespace after the cursor
    if (cursorPosition < commandLine.length && /\S/.test(commandLine[cursorPosition])) {
        return '';
    }
    // Extract the part of the line up to the cursor position
    const beforeCursor = commandLine.slice(0, cursorPosition);
    const resetChars = shellType ? tokens_1.shellTypeResetChars.get(shellType) ?? tokens_1.defaultShellTypeResetChars : tokens_1.defaultShellTypeResetChars;
    // Find the last reset character before the cursor
    let lastResetIndex = -1;
    for (const char of resetChars) {
        const idx = beforeCursor.lastIndexOf(char);
        if (idx > lastResetIndex) {
            lastResetIndex = idx;
        }
    }
    // The start of the current command string is after the last reset char (plus one for the char itself)
    const currentCommandStart = lastResetIndex + 1;
    const currentCommandString = beforeCursor.slice(currentCommandStart).replace(/^\s+/, '');
    return currentCommandString;
}
exports.getCurrentCommandAndArgs = getCurrentCommandAndArgs;
function asArray(x) {
    return Array.isArray(x) ? x : [x];
}
exports.asArray = asArray;
async function getCompletionItemsFromSpecs(specs, terminalContext, availableCommands, currentCommandString, tokenType, shellIntegrationCwd, env, name, token, executeExternals) {
    const items = [];
    let filesRequested = false;
    let foldersRequested = false;
    let hasCurrentArg = false;
    let fileExtensions;
    if (isWindows) {
        const spaceIndex = currentCommandString.indexOf(' ');
        const commandEndIndex = spaceIndex === -1 ? currentCommandString.length : spaceIndex;
        const lastDotIndex = currentCommandString.lastIndexOf('.', commandEndIndex);
        if (lastDotIndex > 0) { // Don't treat dotfiles as extensions
            currentCommandString = currentCommandString.substring(0, lastDotIndex) + currentCommandString.substring(spaceIndex);
        }
    }
    const result = await (0, figInterface_1.getFigSuggestions)(specs, terminalContext, availableCommands, currentCommandString, tokenType, shellIntegrationCwd, env, name, executeExternals ?? { executeCommand: execute_1.executeCommand, executeCommandTimeout: execute_1.executeCommandTimeout }, token);
    if (result) {
        hasCurrentArg || (hasCurrentArg = result.hasCurrentArg);
        filesRequested || (filesRequested = result.filesRequested);
        foldersRequested || (foldersRequested = result.foldersRequested);
        fileExtensions = result.fileExtensions;
        if (result.items) {
            items.push(...result.items);
        }
    }
    if (tokenType === 0 /* TokenType.Command */) {
        // Include builitin/available commands in the results
        const labels = new Set(items.map((i) => typeof i.label === 'string' ? i.label : i.label.label));
        for (const command of availableCommands) {
            const commandTextLabel = typeof command.label === 'string' ? command.label : command.label.label;
            // Remove any file extension for matching on Windows
            const labelWithoutExtension = isWindows ? commandTextLabel.replace(/\.[^ ]+$/, '') : commandTextLabel;
            if (!labels.has(labelWithoutExtension)) {
                items.push((0, completionItem_1.createCompletionItem)(terminalContext.cursorPosition, currentCommandString, command, command.detail, command.documentation, vscode.TerminalCompletionItemKind.Method));
                labels.add(commandTextLabel);
            }
            else {
                const existingItem = items.find(i => (typeof i.label === 'string' ? i.label : i.label.label) === commandTextLabel);
                if (!existingItem) {
                    continue;
                }
                existingItem.documentation ?? (existingItem.documentation = command.documentation);
                existingItem.detail ?? (existingItem.detail = command.detail);
            }
        }
        filesRequested = true;
        foldersRequested = true;
    }
    // For arguments when no fig suggestions are found these are fallback suggestions
    else if (!items.length && !filesRequested && !foldersRequested && !hasCurrentArg) {
        if (terminalContext.allowFallbackCompletions) {
            filesRequested = true;
            foldersRequested = true;
        }
    }
    let cwd;
    if (shellIntegrationCwd && (filesRequested || foldersRequested)) {
        cwd = await resolveCwdFromCurrentCommandString(currentCommandString, shellIntegrationCwd);
    }
    return { items, filesRequested, foldersRequested, fileExtensions, cwd };
}
exports.getCompletionItemsFromSpecs = getCompletionItemsFromSpecs;
function getEnvAsRecord(shellIntegrationEnv) {
    const env = {};
    for (const [key, value] of Object.entries(shellIntegrationEnv ?? process.env)) {
        if (typeof value === 'string') {
            env[key] = value;
        }
    }
    if (!shellIntegrationEnv) {
        sanitizeProcessEnvironment(env);
    }
    return env;
}
function getTerminalShellType(shellType) {
    switch (shellType) {
        case 'bash':
            return "bash" /* TerminalShellType.Bash */;
        case 'gitbash':
            return "gitbash" /* TerminalShellType.GitBash */;
        case 'zsh':
            return "zsh" /* TerminalShellType.Zsh */;
        case 'pwsh':
            return "pwsh" /* TerminalShellType.PowerShell */;
        case 'fish':
            return "fish" /* TerminalShellType.Fish */;
        case 'python':
            return "python" /* TerminalShellType.Python */;
        default:
            return undefined;
    }
}
function sanitizeProcessEnvironment(env, ...preserve) {
    const set = preserve.reduce((set, key) => {
        set[key] = true;
        return set;
    }, {});
    const keysToRemove = [
        /^ELECTRON_.$/,
        /^VSCODE_(?!(PORTABLE|SHELL_LOGIN|ENV_REPLACE|ENV_APPEND|ENV_PREPEND)).$/,
        /^SNAP(|_.*)$/,
        /^GDK_PIXBUF_.$/,
    ];
    const envKeys = Object.keys(env);
    envKeys
        .filter(key => !set[key])
        .forEach(envKey => {
        for (let i = 0; i < keysToRemove.length; i++) {
            if (envKey.search(keysToRemove[i]) !== -1) {
                delete env[envKey];
                break;
            }
        }
    });
}
exports.sanitizeProcessEnvironment = sanitizeProcessEnvironment;
//# sourceMappingURL=terminalSuggestMain.js.map