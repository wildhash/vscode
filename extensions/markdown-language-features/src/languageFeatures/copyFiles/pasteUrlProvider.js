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
exports.registerPasteUrlSupport = void 0;
const vscode = __importStar(require("vscode"));
const mimes_1 = require("../../util/mimes");
const uriList_1 = require("../../util/uriList");
const shared_1 = require("./shared");
const smartDropOrPaste_1 = require("./smartDropOrPaste");
/**
 * Adds support for pasting text uris to create markdown links.
 *
 * This only applies to `text/plain`. Other mimes like `text/uri-list` are handled by ResourcePasteOrDropProvider.
 */
class PasteUrlEditProvider {
    constructor(_parser) {
        this._parser = _parser;
    }
    async provideDocumentPasteEdits(document, ranges, dataTransfer, context, token) {
        const pasteUrlSetting = vscode.workspace.getConfiguration('markdown', document)
            .get('editor.pasteUrlAsFormattedLink.enabled', smartDropOrPaste_1.InsertMarkdownLink.SmartWithSelection);
        if (pasteUrlSetting === smartDropOrPaste_1.InsertMarkdownLink.Never) {
            return;
        }
        const item = dataTransfer.get(mimes_1.Mime.textPlain);
        const text = await item?.asString();
        if (token.isCancellationRequested || !text) {
            return;
        }
        // TODO: If the user has explicitly requested to paste as a markdown link,
        // try to paste even if we don't have a valid uri
        const uriText = (0, smartDropOrPaste_1.findValidUriInText)(text);
        if (!uriText) {
            return;
        }
        const edit = (0, shared_1.createInsertUriListEdit)(document, ranges, uriList_1.UriList.from(uriText), {
            linkKindHint: context.only,
            preserveAbsoluteUris: true
        });
        if (!edit) {
            return;
        }
        const pasteEdit = new vscode.DocumentPasteEdit('', edit.label, PasteUrlEditProvider.kind);
        const workspaceEdit = new vscode.WorkspaceEdit();
        workspaceEdit.set(document.uri, edit.edits);
        pasteEdit.additionalEdit = workspaceEdit;
        if (!(await (0, smartDropOrPaste_1.shouldInsertMarkdownLinkByDefault)(this._parser, document, pasteUrlSetting, ranges, token))) {
            pasteEdit.yieldTo = [
                vscode.DocumentDropOrPasteEditKind.Text,
                vscode.DocumentDropOrPasteEditKind.Empty.append('uri')
            ];
        }
        return [pasteEdit];
    }
}
PasteUrlEditProvider.kind = shared_1.linkEditKind;
PasteUrlEditProvider.pasteMimeTypes = [mimes_1.Mime.textPlain];
function registerPasteUrlSupport(selector, parser) {
    return vscode.languages.registerDocumentPasteEditProvider(selector, new PasteUrlEditProvider(parser), {
        providedPasteEditKinds: [PasteUrlEditProvider.kind],
        pasteMimeTypes: PasteUrlEditProvider.pasteMimeTypes,
    });
}
exports.registerPasteUrlSupport = registerPasteUrlSupport;
//# sourceMappingURL=pasteUrlProvider.js.map