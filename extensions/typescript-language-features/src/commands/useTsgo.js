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
exports.DisableTsgoCommand = exports.EnableTsgoCommand = void 0;
const vscode = __importStar(require("vscode"));
class EnableTsgoCommand {
    constructor() {
        this.id = 'typescript.experimental.enableTsgo';
    }
    async execute() {
        await updateTsgoSetting(true);
    }
}
exports.EnableTsgoCommand = EnableTsgoCommand;
class DisableTsgoCommand {
    constructor() {
        this.id = 'typescript.experimental.disableTsgo';
    }
    async execute() {
        await updateTsgoSetting(false);
    }
}
exports.DisableTsgoCommand = DisableTsgoCommand;
/**
 * Updates the TypeScript Go setting and reloads extension host.
 * @param enable Whether to enable or disable TypeScript Go
 */
async function updateTsgoSetting(enable) {
    const tsgoExtension = vscode.extensions.getExtension('typescript.typescript-lsp');
    // Error if the TypeScript Go extension is not installed with a button to open the GitHub repo
    if (!tsgoExtension) {
        const selection = await vscode.window.showErrorMessage(vscode.l10n.t('The TypeScript Go extension is not installed.'), {
            title: vscode.l10n.t('Open on GitHub'),
            isCloseAffordance: true,
        });
        if (selection) {
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/microsoft/typescript-go'));
        }
    }
    const tsConfig = vscode.workspace.getConfiguration('typescript');
    const currentValue = tsConfig.get('experimental.useTsgo', false);
    if (currentValue === enable) {
        return;
    }
    // Determine the target scope for the configuration update
    let target = vscode.ConfigurationTarget.Global;
    const inspect = tsConfig.inspect('experimental.useTsgo');
    if (inspect?.workspaceValue !== undefined) {
        target = vscode.ConfigurationTarget.Workspace;
    }
    else if (inspect?.workspaceFolderValue !== undefined) {
        target = vscode.ConfigurationTarget.WorkspaceFolder;
    }
    else {
        // If setting is not defined yet, use the same scope as typescript-go.executablePath
        const tsgoConfig = vscode.workspace.getConfiguration('typescript-go');
        const tsgoInspect = tsgoConfig.inspect('executablePath');
        if (tsgoInspect?.workspaceValue !== undefined) {
            target = vscode.ConfigurationTarget.Workspace;
        }
        else if (tsgoInspect?.workspaceFolderValue !== undefined) {
            target = vscode.ConfigurationTarget.WorkspaceFolder;
        }
    }
    // Update the setting, restart the extension host, and enable the TypeScript Go extension
    await tsConfig.update('experimental.useTsgo', enable, target);
    await vscode.commands.executeCommand('workbench.action.restartExtensionHost');
}
//# sourceMappingURL=useTsgo.js.map