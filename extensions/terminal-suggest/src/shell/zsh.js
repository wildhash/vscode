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
exports.getCommandDescription = exports.getZshGlobals = void 0;
const vscode = __importStar(require("vscode"));
const common_1 = require("./common");
const zshBuiltinsCache_1 = require("./zshBuiltinsCache");
const commandDescriptionsCache = parseCache(zshBuiltinsCache_1.zshBuiltinsCommandDescriptionsCache);
async function getZshGlobals(options, existingCommands) {
    return [
        ...await getAliases(options),
        ...await getBuiltins(options, existingCommands),
    ];
}
exports.getZshGlobals = getZshGlobals;
async function getAliases(options) {
    const args = process.platform === 'darwin' ? ['-icl', 'alias'] : ['-ic', 'alias'];
    return (0, common_1.getAliasesHelper)('zsh', args, /^(?<alias>[a-zA-Z0-9\._:-]+)=(?<quote>['"]?)(?<resolved>.+?)\k<quote>$/, options);
}
async function getBuiltins(options, existingCommands) {
    const compgenOutput = await (0, common_1.execHelper)('printf "%s\\n" ${(k)builtins}', options);
    const filter = (cmd) => cmd && !existingCommands?.has(cmd);
    const builtins = compgenOutput.split('\n').filter(filter);
    const completions = [];
    if (builtins.find(r => r === '.')) {
        completions.push({
            label: '.',
            detail: 'Source a file in the current shell',
            kind: vscode.TerminalCompletionItemKind.Method
        });
    }
    for (const cmd of commandDescriptionsCache?.keys() ?? []) {
        if (typeof cmd === 'string') {
            try {
                const result = getCommandDescription(cmd);
                completions.push({
                    label: { label: cmd, description: result?.description },
                    detail: result?.args,
                    documentation: new vscode.MarkdownString(result?.documentation),
                    kind: vscode.TerminalCompletionItemKind.Method
                });
            }
            catch (e) {
                // Ignore errors
                console.log(`Error getting info for ${e}`);
                completions.push({
                    label: cmd,
                    kind: vscode.TerminalCompletionItemKind.Method
                });
            }
        }
    }
    return completions;
}
function getCommandDescription(command) {
    if (!zshBuiltinsCache_1.zshBuiltinsCommandDescriptionsCache) {
        return undefined;
    }
    const result = commandDescriptionsCache?.get(command);
    if (result?.shortDescription) {
        return {
            description: result.shortDescription,
            args: result.args,
            documentation: result.description
        };
    }
    else {
        return {
            description: result?.description,
            args: result?.args,
            documentation: result?.description
        };
    }
}
exports.getCommandDescription = getCommandDescription;
function parseCache(cache) {
    if (!cache) {
        return undefined;
    }
    const result = new Map();
    for (const [key, value] of Object.entries(cache)) {
        result.set(key, value);
    }
    return result;
}
//# sourceMappingURL=zsh.js.map