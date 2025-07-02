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
exports.getFriendlyResourcePath = void 0;
const vscode = __importStar(require("vscode"));
function getFriendlyResourcePath(uri, pathSeparator, kind) {
    let path = uri.fsPath;
    // Ensure drive is capitalized on Windows
    if (pathSeparator === '\\' && path.match(/^[a-zA-Z]:\\/)) {
        path = `${path[0].toUpperCase()}:${path.slice(2)}`;
    }
    if (kind === vscode.TerminalCompletionItemKind.Folder) {
        if (!path.endsWith(pathSeparator)) {
            path += pathSeparator;
        }
    }
    return path;
}
exports.getFriendlyResourcePath = getFriendlyResourcePath;
//# sourceMappingURL=uri.js.map