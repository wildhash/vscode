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
exports.registerUpdatePastedLinks = void 0;
const vscode = __importStar(require("vscode"));
const mimes_1 = require("../util/mimes");
class UpdatePastedLinksEditProvider {
    constructor(_client) {
        this._client = _client;
    }
    async prepareDocumentPaste(document, ranges, dataTransfer, token) {
        if (!this._isEnabled(document)) {
            return;
        }
        const metadata = await this._client.prepareUpdatePastedLinks(document.uri, ranges, token);
        if (token.isCancellationRequested) {
            return;
        }
        dataTransfer.set(UpdatePastedLinksEditProvider.metadataMime, new vscode.DataTransferItem(metadata));
    }
    async provideDocumentPasteEdits(document, ranges, dataTransfer, context, token) {
        if (!this._isEnabled(document)) {
            return;
        }
        const metadata = dataTransfer.get(UpdatePastedLinksEditProvider.metadataMime)?.value;
        if (!metadata) {
            return;
        }
        const textItem = dataTransfer.get(mimes_1.Mime.textPlain);
        const text = await textItem?.asString();
        if (!text || token.isCancellationRequested) {
            return;
        }
        // TODO: Handle cases such as:
        // - copy empty line
        // - Copy with multiple cursors and paste into multiple locations
        // - ...
        const edits = await this._client.getUpdatePastedLinksEdit(document.uri, ranges.map(x => new vscode.TextEdit(x, text)), metadata, token);
        if (!edits?.length || token.isCancellationRequested) {
            return;
        }
        const pasteEdit = new vscode.DocumentPasteEdit('', vscode.l10n.t("Paste and update pasted links"), UpdatePastedLinksEditProvider.kind);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edits.map(x => new vscode.TextEdit(new vscode.Range(x.range.start.line, x.range.start.character, x.range.end.line, x.range.end.character), x.newText)));
        pasteEdit.additionalEdit = workspaceEdit;
        if (!context.only || !UpdatePastedLinksEditProvider.kind.contains(context.only)) {
            pasteEdit.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
        }
        return [pasteEdit];
    }
    _isEnabled(document) {
        return vscode.workspace.getConfiguration('markdown', document.uri).get('editor.updateLinksOnPaste.enabled', true);
    }
}
UpdatePastedLinksEditProvider.kind = vscode.DocumentDropOrPasteEditKind.Text.append('updateLinks', 'markdown');
UpdatePastedLinksEditProvider.metadataMime = 'application/vnd.vscode.markdown.updatelinks.metadata';
function registerUpdatePastedLinks(selector, client) {
    return vscode.languages.registerDocumentPasteEditProvider(selector, new UpdatePastedLinksEditProvider(client), {
        copyMimeTypes: [UpdatePastedLinksEditProvider.metadataMime],
        providedPasteEditKinds: [UpdatePastedLinksEditProvider.kind],
        pasteMimeTypes: [UpdatePastedLinksEditProvider.metadataMime],
    });
}
exports.registerUpdatePastedLinks = registerUpdatePastedLinks;
//# sourceMappingURL=updateLinksOnPaste.js.map