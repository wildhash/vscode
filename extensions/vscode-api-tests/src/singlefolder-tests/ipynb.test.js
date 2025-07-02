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
const assert = __importStar(require("assert"));
require("mocha");
const vscode = __importStar(require("vscode"));
(vscode.env.uiKind === vscode.UIKind.Web ? suite.skip : suite)('ipynb NotebookSerializer', function () {
    test('Can open an ipynb notebook', async () => {
        assert.ok(vscode.workspace.workspaceFolders);
        const workspace = vscode.workspace.workspaceFolders[0];
        const uri = vscode.Uri.joinPath(workspace.uri, 'test.ipynb');
        const notebook = await vscode.workspace.openNotebookDocument(uri);
        await vscode.window.showNotebookDocument(notebook);
        const notebookEditor = vscode.window.activeNotebookEditor;
        assert.ok(notebookEditor);
        assert.strictEqual(notebookEditor.notebook.cellCount, 2);
        assert.strictEqual(notebookEditor.notebook.cellAt(0).kind, vscode.NotebookCellKind.Markup);
        assert.strictEqual(notebookEditor.notebook.cellAt(1).kind, vscode.NotebookCellKind.Code);
        assert.strictEqual(notebookEditor.notebook.cellAt(1).outputs.length, 1);
    });
});
//# sourceMappingURL=ipynb.test.js.map