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
exports.looksLikeMarkdownPath = exports.isMarkdownFile = exports.markdownFileExtensions = void 0;
const vscode = __importStar(require("vscode"));
const URI = __importStar(require("vscode-uri"));
const schemes_1 = require("./schemes");
exports.markdownFileExtensions = Object.freeze([
    'md',
    'mkd',
    'mdwn',
    'mdown',
    'markdown',
    'markdn',
    'mdtxt',
    'mdtext',
    'workbook',
]);
function isMarkdownFile(document) {
    return document.languageId === 'markdown';
}
exports.isMarkdownFile = isMarkdownFile;
function looksLikeMarkdownPath(resolvedHrefPath) {
    const doc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === resolvedHrefPath.toString());
    if (doc) {
        return isMarkdownFile(doc);
    }
    if (resolvedHrefPath.scheme === schemes_1.Schemes.notebookCell) {
        for (const notebook of vscode.workspace.notebookDocuments) {
            for (const cell of notebook.getCells()) {
                if (cell.kind === vscode.NotebookCellKind.Markup && isMarkdownFile(cell.document)) {
                    return true;
                }
            }
        }
        return false;
    }
    return exports.markdownFileExtensions.includes(URI.Utils.extname(resolvedHrefPath).toLowerCase().replace('.', ''));
}
exports.looksLikeMarkdownPath = looksLikeMarkdownPath;
//# sourceMappingURL=file.js.map