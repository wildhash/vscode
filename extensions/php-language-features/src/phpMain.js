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
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const completionItemProvider_1 = __importDefault(require("./features/completionItemProvider"));
const hoverProvider_1 = __importDefault(require("./features/hoverProvider"));
const signatureHelpProvider_1 = __importDefault(require("./features/signatureHelpProvider"));
const validationProvider_1 = __importDefault(require("./features/validationProvider"));
function activate(context) {
    const validator = new validationProvider_1.default();
    validator.activate(context.subscriptions);
    // add providers
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('php', new completionItemProvider_1.default(), '>', '$'));
    context.subscriptions.push(vscode.languages.registerHoverProvider('php', new hoverProvider_1.default()));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider('php', new signatureHelpProvider_1.default(), '(', ','));
}
exports.activate = activate;
//# sourceMappingURL=phpMain.js.map