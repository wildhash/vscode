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
exports.getPwshGlobals = void 0;
const vscode = __importStar(require("vscode"));
const common_1 = require("./common");
async function getPwshGlobals(options, existingCommands) {
    return [
        ...await getAliases(options, existingCommands),
        ...await getCommands(options, existingCommands),
    ];
}
exports.getPwshGlobals = getPwshGlobals;
const pwshCommandTypeToCompletionKind = new Map([
    [1 /* PwshCommandType.Alias */, vscode.TerminalCompletionItemKind.Alias],
    [2 /* PwshCommandType.Function */, vscode.TerminalCompletionItemKind.Method],
    [4 /* PwshCommandType.Filter */, vscode.TerminalCompletionItemKind.Method],
    [8 /* PwshCommandType.Cmdlet */, vscode.TerminalCompletionItemKind.Method],
    [16 /* PwshCommandType.ExternalScript */, vscode.TerminalCompletionItemKind.Method],
    [32 /* PwshCommandType.Application */, vscode.TerminalCompletionItemKind.Method],
    [64 /* PwshCommandType.Script */, vscode.TerminalCompletionItemKind.Method],
    [256 /* PwshCommandType.Configuration */, vscode.TerminalCompletionItemKind.Argument],
]);
async function getAliases(options, existingCommands) {
    const output = await (0, common_1.execHelper)('Get-Command -CommandType Alias | Select-Object Name, CommandType, Definition, DisplayName, ModuleName, @{Name="Version";Expression={$_.Version.ToString()}} | ConvertTo-Json', {
        ...options,
        maxBuffer: 1024 * 1024 * 100 // This is a lot of content, increase buffer size
    });
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (e) {
        console.error('Error parsing output:', e);
        return [];
    }
    return json.map(e => {
        // Aliases sometimes use the same Name and DisplayName, show them as methods in this case.
        const isAlias = e.Name !== e.DisplayName;
        const detailParts = [];
        if (e.Definition) {
            detailParts.push(e.Definition);
        }
        if (e.ModuleName && e.Version) {
            detailParts.push(`${e.ModuleName} v${e.Version}`);
        }
        let definitionCommand = undefined;
        if (e.Definition) {
            let definitionIndex = e.Definition.indexOf(' ');
            if (definitionIndex === -1) {
                definitionIndex = e.Definition.length;
                definitionCommand = e.Definition.substring(0, definitionIndex);
            }
        }
        return {
            label: e.Name,
            detail: detailParts.join('\n\n'),
            kind: (isAlias
                ? vscode.TerminalCompletionItemKind.Alias
                : vscode.TerminalCompletionItemKind.Method),
            definitionCommand,
        };
    });
}
async function getCommands(options, existingCommands) {
    const output = await (0, common_1.execHelper)('Get-Command -All | Select-Object Name, CommandType, Definition, ModuleName, @{Name="Version";Expression={$_.Version.ToString()}} | ConvertTo-Json', {
        ...options,
        maxBuffer: 1024 * 1024 * 100 // This is a lot of content, increase buffer size
    });
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (e) {
        console.error('Error parsing pwsh output:', e);
        return [];
    }
    return (json
        .filter(e => e.CommandType !== 1 /* PwshCommandType.Alias */)
        .map(e => {
        const detailParts = [];
        if (e.Definition) {
            detailParts.push(e.Definition.trim());
        }
        if (e.ModuleName && e.Version) {
            detailParts.push(`${e.ModuleName} v${e.Version}`);
        }
        return {
            label: e.Name,
            detail: detailParts.join('\n\n'),
            kind: pwshCommandTypeToCompletionKind.get(e.CommandType)
        };
    }));
}
//# sourceMappingURL=pwsh.js.map