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
exports.StartingScrollLine = exports.StartingScrollFragment = exports.scrollEditorToLine = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
/**
 * Change the top-most visible line of `editor` to be at `line`
 */
function scrollEditorToLine(line, editor) {
    const revealRange = toRevealRange(line, editor);
    editor.revealRange(revealRange, vscode.TextEditorRevealType.AtTop);
}
exports.scrollEditorToLine = scrollEditorToLine;
function toRevealRange(line, editor) {
    line = Math.max(0, line);
    const sourceLine = Math.floor(line);
    if (sourceLine >= editor.document.lineCount) {
        return new vscode.Range(editor.document.lineCount - 1, 0, editor.document.lineCount - 1, 0);
    }
    const fraction = line - sourceLine;
    const text = editor.document.lineAt(sourceLine).text;
    const start = Math.floor(fraction * text.length);
    return new vscode.Range(sourceLine, start, sourceLine + 1, 0);
}
class StartingScrollFragment {
    constructor(fragment) {
        this.fragment = fragment;
        this.type = 'fragment';
    }
}
exports.StartingScrollFragment = StartingScrollFragment;
class StartingScrollLine {
    constructor(line) {
        this.line = line;
        this.type = 'line';
    }
}
exports.StartingScrollLine = StartingScrollLine;
//# sourceMappingURL=scrolling.js.map