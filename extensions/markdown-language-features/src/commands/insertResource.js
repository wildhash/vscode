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
exports.InsertImageFromWorkspace = exports.InsertLinkFromWorkspace = void 0;
const vscode = __importStar(require("vscode"));
const vscode_uri_1 = require("vscode-uri");
const shared_1 = require("../languageFeatures/copyFiles/shared");
const mimes_1 = require("../util/mimes");
const arrays_1 = require("../util/arrays");
const document_1 = require("../util/document");
const schemes_1 = require("../util/schemes");
class InsertLinkFromWorkspace {
    constructor() {
        this.id = 'markdown.editor.insertLinkFromWorkspace';
    }
    async execute(resources) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        resources ?? (resources = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: vscode.l10n.t("Insert link"),
            title: vscode.l10n.t("Insert link"),
            defaultUri: getDefaultUri(activeEditor.document),
        }));
        if (!resources) {
            return;
        }
        return insertLink(activeEditor, resources, false);
    }
}
exports.InsertLinkFromWorkspace = InsertLinkFromWorkspace;
class InsertImageFromWorkspace {
    constructor() {
        this.id = 'markdown.editor.insertImageFromWorkspace';
    }
    async execute(resources) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return;
        }
        resources ?? (resources = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            filters: {
                [vscode.l10n.t("Media")]: Array.from(mimes_1.mediaFileExtensions.keys())
            },
            openLabel: vscode.l10n.t("Insert image"),
            title: vscode.l10n.t("Insert image"),
            defaultUri: getDefaultUri(activeEditor.document),
        }));
        if (!resources) {
            return;
        }
        return insertLink(activeEditor, resources, true);
    }
}
exports.InsertImageFromWorkspace = InsertImageFromWorkspace;
function getDefaultUri(document) {
    const docUri = (0, document_1.getParentDocumentUri)(document.uri);
    if (docUri.scheme === schemes_1.Schemes.untitled) {
        return vscode.workspace.workspaceFolders?.[0]?.uri;
    }
    return vscode_uri_1.Utils.dirname(docUri);
}
async function insertLink(activeEditor, selectedFiles, insertAsMedia) {
    const edit = createInsertLinkEdit(activeEditor, selectedFiles, insertAsMedia);
    if (edit) {
        await vscode.workspace.applyEdit(edit);
    }
}
function createInsertLinkEdit(activeEditor, selectedFiles, insertAsMedia) {
    const snippetEdits = (0, arrays_1.coalesce)(activeEditor.selections.map((selection, i) => {
        const selectionText = activeEditor.document.getText(selection);
        const snippet = (0, shared_1.createUriListSnippet)(activeEditor.document.uri, selectedFiles.map(uri => ({ uri })), {
            linkKindHint: insertAsMedia ? 'media' : shared_1.linkEditKind,
            placeholderText: selectionText,
            placeholderStartIndex: (i + 1) * selectedFiles.length,
            separator: insertAsMedia ? '\n' : ' ',
        });
        return snippet ? new vscode.SnippetTextEdit(selection, snippet.snippet) : undefined;
    }));
    if (!snippetEdits.length) {
        return;
    }
    const edit = new vscode.WorkspaceEdit();
    edit.set(activeEditor.document.uri, snippetEdits);
    return edit;
}
//# sourceMappingURL=insertResource.js.map