"use strict";
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
exports.resolveCopyDestination = exports.parseGlob = exports.getCopyFileConfiguration = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
function getCopyFileConfiguration(document) {
    const config = vscode.workspace.getConfiguration('markdown', document);
    return {
        destination: config.get('copyFiles.destination') ?? {},
        overwriteBehavior: readOverwriteBehavior(config),
    };
}
exports.getCopyFileConfiguration = getCopyFileConfiguration;
function readOverwriteBehavior(config) {
    switch (config.get('copyFiles.overwriteBehavior')) {
        case 'overwrite': return 'overwrite';
        default: return 'nameIncrementally';
    }
}
function parseGlob(rawGlob) {
    if (rawGlob.startsWith('/')) {
        // Anchor to workspace folders
        return (vscode.workspace.workspaceFolders ?? []).map(folder => vscode.Uri.joinPath(folder.uri, rawGlob).path);
    }
    // Relative path, so implicitly track on ** to match everything
    if (!rawGlob.startsWith('**')) {
        return ['**/' + rawGlob];
    }
    return [rawGlob];
}
exports.parseGlob = parseGlob;
function resolveCopyDestination(documentUri, fileName, dest, getWorkspaceFolder) {
    const resolvedDest = resolveCopyDestinationSetting(documentUri, fileName, dest, getWorkspaceFolder);
    if (resolvedDest.startsWith('/')) {
        // Absolute path
        return vscode_uri_1.Utils.resolvePath(documentUri, resolvedDest);
    }
    // Relative to document
    const dirName = vscode_uri_1.Utils.dirname(documentUri);
    return vscode_uri_1.Utils.resolvePath(dirName, resolvedDest);
}
exports.resolveCopyDestination = resolveCopyDestination;
function resolveCopyDestinationSetting(documentUri, fileName, dest, getWorkspaceFolder) {
    let outDest = dest.trim();
    if (!outDest) {
        outDest = '${fileName}';
    }
    // Destination that start with `/` implicitly means go to workspace root
    if (outDest.startsWith('/')) {
        outDest = '${documentWorkspaceFolder}/' + outDest.slice(1);
    }
    // Destination that ends with `/` implicitly needs a fileName
    if (outDest.endsWith('/')) {
        outDest += '${fileName}';
    }
    const documentDirName = vscode_uri_1.Utils.dirname(documentUri);
    const documentBaseName = vscode_uri_1.Utils.basename(documentUri);
    const documentExtName = vscode_uri_1.Utils.extname(documentUri);
    const workspaceFolder = getWorkspaceFolder(documentUri);
    const vars = new Map([
        // Document
        ['documentDirName', documentDirName.path],
        ['documentRelativeDirName', workspaceFolder ? path.posix.relative(workspaceFolder.path, documentDirName.path) : documentDirName.path],
        ['documentFileName', documentBaseName],
        ['documentBaseName', documentBaseName.slice(0, documentBaseName.length - documentExtName.length)],
        ['documentExtName', documentExtName.replace('.', '')],
        ['documentFilePath', documentUri.path],
        ['documentRelativeFilePath', workspaceFolder ? path.posix.relative(workspaceFolder.path, documentUri.path) : documentUri.path],
        // Workspace
        ['documentWorkspaceFolder', ((workspaceFolder ?? documentDirName).path)],
        // File
        ['fileName', fileName],
        ['fileExtName', path.extname(fileName).replace('.', '')],
        ['unixTime', Date.now().toString()],
        ['isoTime', new Date().toISOString()], // The current time in ISO 8601 format, e.g. '2025-06-06T08:40:32.123Z'.
    ]);
    return outDest.replaceAll(/(?<escape>\\\$)|(?<!\\)\$\{(?<name>\w+)(?:\/(?<pattern>(?:\\\/|[^\}\/])+)\/(?<replacement>(?:\\\/|[^\}\/])*)\/)?\}/g, (match, _escape, name, pattern, replacement, _offset, _str, groups) => {
        if (groups?.['escape']) {
            return '$';
        }
        const entry = vars.get(name);
        if (typeof entry !== 'string') {
            return match;
        }
        if (pattern && replacement) {
            try {
                return entry.replace(new RegExp(replaceTransformEscapes(pattern)), replaceTransformEscapes(replacement));
            }
            catch (e) {
                console.log(`Error applying 'resolveCopyDestinationSetting' transform: ${pattern} -> ${replacement}`);
            }
        }
        return entry;
    });
}
function replaceTransformEscapes(str) {
    return str.replaceAll(/\\\//g, '/');
}
//# sourceMappingURL=copyFiles.js.map