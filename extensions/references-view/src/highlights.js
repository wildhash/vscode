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
exports.EditorHighlights = void 0;
const vscode = __importStar(require("vscode"));
class EditorHighlights {
    constructor(_view, _delegate) {
        this._view = _view;
        this._delegate = _delegate;
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            overviewRulerColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
        });
        this.disposables = [];
        this._ignore = new Set();
        this.disposables.push(vscode.workspace.onDidChangeTextDocument(e => this._ignore.add(e.document.uri.toString())), vscode.window.onDidChangeActiveTextEditor(() => _view.visible && this.update()), _view.onDidChangeVisibility(e => e.visible ? this._show() : this._hide()), _view.onDidChangeSelection(() => {
            if (_view.visible) {
                this.update();
            }
        }));
        this._show();
    }
    dispose() {
        vscode.Disposable.from(...this.disposables).dispose();
        for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(this._decorationType, []);
        }
    }
    _show() {
        const { activeTextEditor: editor } = vscode.window;
        if (!editor || !editor.viewColumn) {
            return;
        }
        if (this._ignore.has(editor.document.uri.toString())) {
            return;
        }
        const [anchor] = this._view.selection;
        if (!anchor) {
            return;
        }
        const ranges = this._delegate.getEditorHighlights(anchor, editor.document.uri);
        if (ranges) {
            editor.setDecorations(this._decorationType, ranges);
        }
    }
    _hide() {
        for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(this._decorationType, []);
        }
    }
    update() {
        this._hide();
        this._show();
    }
}
exports.EditorHighlights = EditorHighlights;
//# sourceMappingURL=highlights.js.map