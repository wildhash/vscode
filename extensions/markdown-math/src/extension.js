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
exports.activate = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const markdownMathSetting = 'markdown.math';
function activate(context) {
    function isEnabled() {
        const config = vscode.workspace.getConfiguration('markdown');
        return config.get('math.enabled', true);
    }
    function getMacros() {
        const config = vscode.workspace.getConfiguration('markdown');
        return config.get('math.macros', {});
    }
    vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration(markdownMathSetting)) {
            vscode.commands.executeCommand('markdown.api.reloadPlugins');
        }
    }, undefined, context.subscriptions);
    return {
        extendMarkdownIt(md) {
            if (isEnabled()) {
                const katex = require('@vscode/markdown-it-katex').default;
                const settingsMacros = getMacros();
                const options = {
                    enableFencedBlocks: true,
                    globalGroup: true,
                    macros: { ...settingsMacros }
                };
                md.core.ruler.push('reset-katex-macros', () => {
                    options.macros = { ...settingsMacros };
                });
                return md.use(katex, options);
            }
            return md;
        }
    };
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map