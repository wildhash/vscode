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
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const pathUtils = __importStar(require("path"));
const FILE_LINE_REGEX = /^(\S.*):$/;
const RESULT_LINE_REGEX = /^(\s+)(\d+)(: |  )(\s*)(.*)$/;
const ELISION_REGEX = /⟪ ([0-9]+) characters skipped ⟫/g;
const SEARCH_RESULT_SELECTOR = { language: 'search-result', exclusive: true };
const DIRECTIVES = ['# Query:', '# Flags:', '# Including:', '# Excluding:', '# ContextLines:'];
const FLAGS = ['RegExp', 'CaseSensitive', 'IgnoreExcludeSettings', 'WordMatch'];
let cachedLastParse;
let documentChangeListener;
function activate(context) {
    const contextLineDecorations = vscode.window.createTextEditorDecorationType({ opacity: '0.7' });
    const matchLineDecorations = vscode.window.createTextEditorDecorationType({ fontWeight: 'bold' });
    const decorate = (editor) => {
        const parsed = parseSearchResults(editor.document).filter(isResultLine);
        const contextRanges = parsed.filter(line => line.isContext).map(line => line.prefixRange);
        const matchRanges = parsed.filter(line => !line.isContext).map(line => line.prefixRange);
        editor.setDecorations(contextLineDecorations, contextRanges);
        editor.setDecorations(matchLineDecorations, matchRanges);
    };
    if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === 'search-result') {
        decorate(vscode.window.activeTextEditor);
    }
    context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(SEARCH_RESULT_SELECTOR, {
        provideDocumentSymbols(document, token) {
            const results = parseSearchResults(document, token)
                .filter(isFileLine)
                .map(line => new vscode.DocumentSymbol(line.path, '', vscode.SymbolKind.File, line.allLocations.map(({ originSelectionRange }) => originSelectionRange).reduce((p, c) => p.union(c), line.location.originSelectionRange), line.location.originSelectionRange));
            return results;
        }
    }), vscode.languages.registerCompletionItemProvider(SEARCH_RESULT_SELECTOR, {
        provideCompletionItems(document, position) {
            const line = document.lineAt(position.line);
            if (position.line > 3) {
                return [];
            }
            if (position.character === 0 || (position.character === 1 && line.text === '#')) {
                const header = Array.from({ length: DIRECTIVES.length }).map((_, i) => document.lineAt(i).text);
                return DIRECTIVES
                    .filter(suggestion => header.every(line => line.indexOf(suggestion) === -1))
                    .map(flag => ({ label: flag, insertText: (flag.slice(position.character)) + ' ' }));
            }
            if (line.text.indexOf('# Flags:') === -1) {
                return [];
            }
            return FLAGS
                .filter(flag => line.text.indexOf(flag) === -1)
                .map(flag => ({ label: flag, insertText: flag + ' ' }));
        }
    }, '#'), vscode.languages.registerDefinitionProvider(SEARCH_RESULT_SELECTOR, {
        provideDefinition(document, position, token) {
            const lineResult = parseSearchResults(document, token)[position.line];
            if (!lineResult) {
                return [];
            }
            if (lineResult.type === 'file') {
                return lineResult.allLocations.map(l => ({ ...l, originSelectionRange: lineResult.location.originSelectionRange }));
            }
            const location = lineResult.locations.find(l => l.originSelectionRange.contains(position));
            if (!location) {
                return [];
            }
            const targetPos = new vscode.Position(location.targetSelectionRange.start.line, location.targetSelectionRange.start.character + (position.character - location.originSelectionRange.start.character));
            return [{
                    ...location,
                    targetSelectionRange: new vscode.Range(targetPos, targetPos),
                }];
        }
    }), vscode.languages.registerDocumentLinkProvider(SEARCH_RESULT_SELECTOR, {
        async provideDocumentLinks(document, token) {
            return parseSearchResults(document, token)
                .filter(isFileLine)
                .map(({ location }) => ({ range: location.originSelectionRange, target: location.targetUri }));
        }
    }), vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor?.document.languageId === 'search-result') {
            // Clear the parse whenever we open a new editor.
            // Conservative because things like the URI might remain constant even if the contents change, and re-parsing even large files is relatively fast.
            cachedLastParse = undefined;
            documentChangeListener?.dispose();
            documentChangeListener = vscode.workspace.onDidChangeTextDocument(doc => {
                if (doc.document.uri === editor.document.uri) {
                    decorate(editor);
                }
            });
            decorate(editor);
        }
    }), { dispose() { cachedLastParse = undefined; documentChangeListener?.dispose(); } });
}
exports.activate = activate;
function relativePathToUri(path, resultsUri) {
    const userDataPrefix = '(Settings) ';
    if (path.startsWith(userDataPrefix)) {
        return vscode.Uri.file(path.slice(userDataPrefix.length)).with({ scheme: 'vscode-userdata' });
    }
    if (pathUtils.isAbsolute(path)) {
        if (/^[\\\/]Untitled-\d*$/.test(path)) {
            return vscode.Uri.file(path.slice(1)).with({ scheme: 'untitled', path: path.slice(1) });
        }
        return vscode.Uri.file(path);
    }
    if (path.indexOf('~/') === 0) {
        const homePath = process.env.HOME || process.env.HOMEPATH || '';
        return vscode.Uri.file(pathUtils.join(homePath, path.slice(2)));
    }
    const uriFromFolderWithPath = (folder, path) => vscode.Uri.joinPath(folder.uri, path);
    if (vscode.workspace.workspaceFolders) {
        const multiRootFormattedPath = /^(.*) • (.*)$/.exec(path);
        if (multiRootFormattedPath) {
            const [, workspaceName, workspacePath] = multiRootFormattedPath;
            const folder = vscode.workspace.workspaceFolders.filter(wf => wf.name === workspaceName)[0];
            if (folder) {
                return uriFromFolderWithPath(folder, workspacePath);
            }
        }
        else if (vscode.workspace.workspaceFolders.length === 1) {
            return uriFromFolderWithPath(vscode.workspace.workspaceFolders[0], path);
        }
        else if (resultsUri.scheme !== 'untitled') {
            // We're in a multi-root workspace, but the path is not multi-root formatted
            // Possibly a saved search from a single root session. Try checking if the search result document's URI is in a current workspace folder.
            const prefixMatch = vscode.workspace.workspaceFolders.filter(wf => resultsUri.toString().startsWith(wf.uri.toString()))[0];
            if (prefixMatch) {
                return uriFromFolderWithPath(prefixMatch, path);
            }
        }
    }
    console.error(`Unable to resolve path ${path}`);
    return undefined;
}
const isFileLine = (line) => line.type === 'file';
const isResultLine = (line) => line.type === 'result';
function parseSearchResults(document, token) {
    if (cachedLastParse && cachedLastParse.uri === document.uri && cachedLastParse.version === document.version) {
        return cachedLastParse.parse;
    }
    const lines = document.getText().split(/\r?\n/);
    const links = [];
    let currentTarget = undefined;
    let currentTargetLocations = undefined;
    for (let i = 0; i < lines.length; i++) {
        // TODO: This is probably always false, given we're pegging the thread...
        if (token?.isCancellationRequested) {
            return [];
        }
        const line = lines[i];
        const fileLine = FILE_LINE_REGEX.exec(line);
        if (fileLine) {
            const [, path] = fileLine;
            currentTarget = relativePathToUri(path, document.uri);
            if (!currentTarget) {
                continue;
            }
            currentTargetLocations = [];
            const location = {
                targetRange: new vscode.Range(0, 0, 0, 1),
                targetUri: currentTarget,
                originSelectionRange: new vscode.Range(i, 0, i, line.length),
            };
            links[i] = { type: 'file', location, allLocations: currentTargetLocations, path };
        }
        if (!currentTarget) {
            continue;
        }
        const resultLine = RESULT_LINE_REGEX.exec(line);
        if (resultLine) {
            const [, indentation, _lineNumber, separator] = resultLine;
            const lineNumber = +_lineNumber - 1;
            const metadataOffset = (indentation + _lineNumber + separator).length;
            const targetRange = new vscode.Range(Math.max(lineNumber - 3, 0), 0, lineNumber + 3, line.length);
            const locations = [];
            let lastEnd = metadataOffset;
            let offset = 0;
            ELISION_REGEX.lastIndex = metadataOffset;
            for (let match; (match = ELISION_REGEX.exec(line));) {
                locations.push({
                    targetRange,
                    targetSelectionRange: new vscode.Range(lineNumber, offset, lineNumber, offset),
                    targetUri: currentTarget,
                    originSelectionRange: new vscode.Range(i, lastEnd, i, ELISION_REGEX.lastIndex - match[0].length),
                });
                offset += (ELISION_REGEX.lastIndex - lastEnd - match[0].length) + Number(match[1]);
                lastEnd = ELISION_REGEX.lastIndex;
            }
            if (lastEnd < line.length) {
                locations.push({
                    targetRange,
                    targetSelectionRange: new vscode.Range(lineNumber, offset, lineNumber, offset),
                    targetUri: currentTarget,
                    originSelectionRange: new vscode.Range(i, lastEnd, i, line.length),
                });
            }
            // only show result lines in file-level peek
            if (separator.includes(':')) {
                currentTargetLocations?.push(...locations);
            }
            // Allow line number, indentation, etc to take you to definition as well.
            const convenienceLocation = {
                targetRange,
                targetSelectionRange: new vscode.Range(lineNumber, 0, lineNumber, 1),
                targetUri: currentTarget,
                originSelectionRange: new vscode.Range(i, 0, i, metadataOffset - 1),
            };
            locations.push(convenienceLocation);
            links[i] = { type: 'result', locations, isContext: separator === ' ', prefixRange: new vscode.Range(i, 0, i, metadataOffset) };
        }
    }
    cachedLastParse = {
        version: document.version,
        parse: links,
        uri: document.uri
    };
    return links;
}
//# sourceMappingURL=extension.js.map