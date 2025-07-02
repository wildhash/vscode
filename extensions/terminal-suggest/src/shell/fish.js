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
exports.getCommandDescription = exports.getFishGlobals = void 0;
const vscode = __importStar(require("vscode"));
const common_1 = require("./common");
const fishBuiltinsCache_1 = require("./fishBuiltinsCache");
const commandDescriptionsCache = parseCache(fishBuiltinsCache_1.fishBuiltinsCommandDescriptionsCache);
async function getFishGlobals(options, existingCommands) {
    return [
        ...await getAliases(options),
        ...await getBuiltins(options),
    ];
}
exports.getFishGlobals = getFishGlobals;
async function getBuiltins(options) {
    const completions = [];
    // Use the cache directly for all commands
    for (const cmd of [...commandDescriptionsCache.keys()]) {
        try {
            const result = getCommandDescription(cmd);
            if (result) {
                completions.push({
                    label: { label: cmd, description: result.description },
                    detail: result.args,
                    documentation: new vscode.MarkdownString(result.documentation),
                    kind: vscode.TerminalCompletionItemKind.Method
                });
            }
            else {
                console.warn(`Fish command "${cmd}" not found in cache.`);
                completions.push({
                    label: cmd,
                    kind: vscode.TerminalCompletionItemKind.Method
                });
            }
        }
        catch (e) {
            // Ignore errors
            completions.push({
                label: cmd,
                kind: vscode.TerminalCompletionItemKind.Method
            });
        }
    }
    return completions;
}
function getCommandDescription(command) {
    if (!commandDescriptionsCache) {
        return undefined;
    }
    const result = commandDescriptionsCache.get(command);
    if (!result) {
        return undefined;
    }
    if (result.shortDescription) {
        return {
            description: result.shortDescription,
            args: result.args,
            documentation: result.description
        };
    }
    else {
        return {
            description: result.description,
            args: result.args,
            documentation: result.description
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
async function getAliases(options) {
    return (0, common_1.getAliasesHelper)('fish', ['-ic', 'alias'], /^alias (?<alias>[a-zA-Z0-9\.:-]+) (?<resolved>.+)$/, options);
}
//# sourceMappingURL=fish.js.map