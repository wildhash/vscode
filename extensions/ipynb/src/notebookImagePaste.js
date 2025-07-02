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
exports.notebookImagePasteSetup = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("./constants");
const path_1 = require("path");
var MimeType;
(function (MimeType) {
    MimeType["bmp"] = "image/bmp";
    MimeType["gif"] = "image/gif";
    MimeType["ico"] = "image/ico";
    MimeType["jpeg"] = "image/jpeg";
    MimeType["png"] = "image/png";
    MimeType["tiff"] = "image/tiff";
    MimeType["webp"] = "image/webp";
    MimeType["plain"] = "text/plain";
    MimeType["uriList"] = "text/uri-list";
})(MimeType || (MimeType = {}));
const imageMimeTypes = new Set([
    MimeType.bmp,
    MimeType.gif,
    MimeType.ico,
    MimeType.jpeg,
    MimeType.png,
    MimeType.tiff,
    MimeType.webp,
]);
const imageExtToMime = new Map([
    ['.bmp', MimeType.bmp],
    ['.gif', MimeType.gif],
    ['.ico', MimeType.ico],
    ['.jpe', MimeType.jpeg],
    ['.jpeg', MimeType.jpeg],
    ['.jpg', MimeType.jpeg],
    ['.png', MimeType.png],
    ['.tif', MimeType.tiff],
    ['.tiff', MimeType.tiff],
    ['.webp', MimeType.webp],
]);
function getImageMimeType(uri) {
    return imageExtToMime.get((0, path_1.extname)(uri.fsPath).toLowerCase());
}
class DropOrPasteEditProvider {
    async provideDocumentPasteEdits(document, _ranges, dataTransfer, _context, token) {
        const enabled = vscode.workspace.getConfiguration('ipynb', document).get('pasteImagesAsAttachments.enabled', true);
        if (!enabled) {
            return;
        }
        const insert = await this.createInsertImageAttachmentEdit(document, dataTransfer, token);
        if (!insert) {
            return;
        }
        const pasteEdit = new vscode.DocumentPasteEdit(insert.insertText, vscode.l10n.t('Insert Image as Attachment'), DropOrPasteEditProvider.kind);
        pasteEdit.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
        pasteEdit.additionalEdit = insert.additionalEdit;
        return [pasteEdit];
    }
    async provideDocumentDropEdits(document, _position, dataTransfer, token) {
        const insert = await this.createInsertImageAttachmentEdit(document, dataTransfer, token);
        if (!insert) {
            return;
        }
        const dropEdit = new vscode.DocumentDropEdit(insert.insertText);
        dropEdit.yieldTo = [vscode.DocumentDropOrPasteEditKind.Text];
        dropEdit.additionalEdit = insert.additionalEdit;
        dropEdit.title = vscode.l10n.t('Insert Image as Attachment');
        return dropEdit;
    }
    async createInsertImageAttachmentEdit(document, dataTransfer, token) {
        const imageData = await getDroppedImageData(dataTransfer, token);
        if (!imageData.length || token.isCancellationRequested) {
            return;
        }
        const currentCell = getCellFromCellDocument(document);
        if (!currentCell) {
            return undefined;
        }
        // create updated metadata for cell (prep for WorkspaceEdit)
        const newAttachment = buildAttachment(currentCell, imageData);
        if (!newAttachment) {
            return;
        }
        // build edits
        const additionalEdit = new vscode.WorkspaceEdit();
        const nbEdit = vscode.NotebookEdit.updateCellMetadata(currentCell.index, newAttachment.metadata);
        const notebookUri = currentCell.notebook.uri;
        additionalEdit.set(notebookUri, [nbEdit]);
        // create a snippet for paste
        const insertText = new vscode.SnippetString();
        newAttachment.filenames.forEach((filename, i) => {
            insertText.appendText('![');
            insertText.appendPlaceholder(`${filename}`);
            insertText.appendText(`](${/\s/.test(filename) ? `<attachment:${filename}>` : `attachment:${filename}`})`);
            if (i !== newAttachment.filenames.length - 1) {
                insertText.appendText(' ');
            }
        });
        return { insertText, additionalEdit };
    }
}
DropOrPasteEditProvider.kind = vscode.DocumentDropOrPasteEditKind.Empty.append('markdown', 'link', 'image', 'attachment');
async function getDroppedImageData(dataTransfer, token) {
    // Prefer using image data in the clipboard
    const files = coalesce(await Promise.all(Array.from(dataTransfer, async ([mimeType, item]) => {
        if (!imageMimeTypes.has(mimeType)) {
            return;
        }
        const file = item.asFile();
        if (!file) {
            return;
        }
        const data = await file.data();
        return { fileName: file.name, mimeType, data };
    })));
    if (files.length) {
        return files;
    }
    // Then fallback to image files in the uri-list
    const urlList = await dataTransfer.get('text/uri-list')?.asString();
    if (token.isCancellationRequested) {
        return [];
    }
    if (urlList) {
        const uris = [];
        for (const resource of urlList.split(/\r?\n/g)) {
            try {
                uris.push(vscode.Uri.parse(resource));
            }
            catch {
                // noop
            }
        }
        const entries = await Promise.all(uris.map(async (uri) => {
            const mimeType = getImageMimeType(uri);
            if (!mimeType) {
                return;
            }
            const data = await vscode.workspace.fs.readFile(uri);
            return { fileName: (0, path_1.basename)(uri.fsPath), mimeType, data };
        }));
        return coalesce(entries);
    }
    return [];
}
function coalesce(array) {
    return array.filter(e => !!e);
}
function getCellFromCellDocument(cellDocument) {
    for (const notebook of vscode.workspace.notebookDocuments) {
        if (notebook.uri.path === cellDocument.uri.path) {
            for (const cell of notebook.getCells()) {
                if (cell.document === cellDocument) {
                    return cell;
                }
            }
        }
    }
    return undefined;
}
/**
 *  Taken from https://github.com/microsoft/vscode/blob/743b016722db90df977feecde0a4b3b4f58c2a4c/src/vs/base/common/buffer.ts#L350-L387
 */
function encodeBase64(buffer, padded = true, urlSafe = false) {
    const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const base64UrlSafeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const dictionary = urlSafe ? base64UrlSafeAlphabet : base64Alphabet;
    let output = '';
    const remainder = buffer.byteLength % 3;
    let i = 0;
    for (; i < buffer.byteLength - remainder; i += 3) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        const c = buffer[i + 2];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4 | b >>> 4) & 0b111111];
        output += dictionary[(b << 2 | c >>> 6) & 0b111111];
        output += dictionary[c & 0b111111];
    }
    if (remainder === 1) {
        const a = buffer[i + 0];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4) & 0b111111];
        if (padded) {
            output += '==';
        }
    }
    else if (remainder === 2) {
        const a = buffer[i + 0];
        const b = buffer[i + 1];
        output += dictionary[a >>> 2];
        output += dictionary[(a << 4 | b >>> 4) & 0b111111];
        output += dictionary[(b << 2) & 0b111111];
        if (padded) {
            output += '=';
        }
    }
    return output;
}
function buildAttachment(cell, attachments) {
    const cellMetadata = { ...cell.metadata };
    const tempFilenames = [];
    if (!attachments.length) {
        return undefined;
    }
    if (!cellMetadata.attachments) {
        cellMetadata.attachments = {};
    }
    for (const attachment of attachments) {
        const b64 = encodeBase64(attachment.data);
        const fileExt = (0, path_1.extname)(attachment.fileName);
        const filenameWithoutExt = (0, path_1.basename)(attachment.fileName, fileExt);
        let tempFilename = filenameWithoutExt + fileExt;
        for (let appendValue = 2; tempFilename in cellMetadata.attachments; appendValue++) {
            const objEntries = Object.entries(cellMetadata.attachments[tempFilename]);
            if (objEntries.length) { // check that mime:b64 are present
                const [mime, attachmentb64] = objEntries[0];
                if (mime === attachment.mimeType && attachmentb64 === b64) { // checking if filename can be reused, based on comparison of image data
                    break;
                }
                else {
                    tempFilename = filenameWithoutExt.concat(`-${appendValue}`) + fileExt;
                }
            }
        }
        tempFilenames.push(tempFilename);
        cellMetadata.attachments[tempFilename] = { [attachment.mimeType]: b64 };
    }
    return {
        metadata: cellMetadata,
        filenames: tempFilenames,
    };
}
function notebookImagePasteSetup() {
    const provider = new DropOrPasteEditProvider();
    return vscode.Disposable.from(vscode.languages.registerDocumentPasteEditProvider(constants_1.JUPYTER_NOTEBOOK_MARKDOWN_SELECTOR, provider, {
        providedPasteEditKinds: [DropOrPasteEditProvider.kind],
        pasteMimeTypes: [
            MimeType.png,
            MimeType.uriList,
        ],
    }), vscode.languages.registerDocumentDropEditProvider(constants_1.JUPYTER_NOTEBOOK_MARKDOWN_SELECTOR, provider, {
        providedDropEditKinds: [DropOrPasteEditProvider.kind],
        dropMimeTypes: [
            ...Object.values(imageExtToMime),
            MimeType.uriList,
        ],
    }));
}
exports.notebookImagePasteSetup = notebookImagePasteSetup;
//# sourceMappingURL=notebookImagePaste.js.map